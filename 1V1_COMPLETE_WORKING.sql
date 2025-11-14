-- ============================================================================
-- 1V1 COMPLETE WORKING SOLUTION
-- ============================================================================
-- Full setup: sessions, timer, blocking, payout (50%/35%/15%)
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ALL COLUMNS EXIST
-- ============================================================================

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS current_pot NUMERIC DEFAULT 0;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS winner_user_id UUID;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS loser_user_id UUID;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS winner_prize NUMERIC DEFAULT 0;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS loser_prize NUMERIC DEFAULT 0;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

SELECT '✅ Step 1: All columns added' as status;

-- ============================================================================
-- STEP 2: RESET ALL SESSIONS
-- ============================================================================

DELETE FROM one_v_one_participants;

UPDATE one_v_one_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    loser_user_id = NULL,
    winner_prize = 0,
    loser_prize = 0,
    platform_fee = 0,
    completed_at = NULL,
    updated_at = NOW();

SELECT '✅ Step 2: All sessions reset to waiting' as status;

-- ============================================================================
-- STEP 3: CREATE FUNCTION TO GET ALL 1V1 SESSIONS
-- ============================================================================

-- Drop old function names if they exist
DROP FUNCTION IF EXISTS public.get_all_one_v_one_sessions();

-- Create function with frontend's expected name
CREATE OR REPLACE FUNCTION public.get_all_1v1_sessions()
RETURNS TABLE (
    id TEXT,
    config_id TEXT,
    current_pot NUMERIC,
    prize_pool NUMERIC,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    loser_user_id TEXT,
    winner_prize NUMERIC,
    loser_prize NUMERIC,
    platform_fee NUMERIC,
    completed_at TIMESTAMPTZ,
    rng_seed INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sess.id::TEXT,
        sess.config_id::TEXT,
        COALESCE(sess.current_pot, 0)::NUMERIC,
        COALESCE(sess.prize_pool, 0)::NUMERIC,
        COALESCE(sess.participants_count, 0)::INTEGER,
        sess.status::TEXT,
        sess.timer_started_at,
        COALESCE(sess.timer_duration, 7200)::INTEGER,
        sess.winner_user_id::TEXT,
        sess.loser_user_id::TEXT,
        COALESCE(sess.winner_prize, 0)::NUMERIC,
        COALESCE(sess.loser_prize, 0)::NUMERIC,
        COALESCE(sess.platform_fee, 0)::NUMERIC,
        sess.completed_at,
        COALESCE(sess.rng_seed, 1)::INTEGER,
        sess.created_at,
        sess.updated_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', part.id::TEXT,
                    'user_id', part.user_id::TEXT,
                    'username', COALESCE(u.username, 'Anonymous'),
                    'score', part.score,
                    'accuracy', part.accuracy,
                    'joined_at', part.joined_at,
                    'completed_at', part.completed_at
                )
            ) FILTER (WHERE part.id IS NOT NULL),
            '[]'::jsonb
        ) as participants
    FROM public.one_v_one_sessions sess
    LEFT JOIN public.one_v_one_participants part ON part.session_id = sess.id
    LEFT JOIN public.users u ON u.id = part.user_id
    WHERE sess.status IN ('waiting', 'active')
    GROUP BY 
        sess.id,
        sess.config_id,
        sess.current_pot,
        sess.prize_pool,
        sess.participants_count,
        sess.status,
        sess.timer_started_at,
        sess.timer_duration,
        sess.winner_user_id,
        sess.loser_user_id,
        sess.winner_prize,
        sess.loser_prize,
        sess.platform_fee,
        sess.completed_at,
        sess.rng_seed,
        sess.created_at,
        sess.updated_at
    ORDER BY sess.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

SELECT '✅ Step 3: Get sessions function created (get_all_1v1_sessions)' as status;

-- ============================================================================
-- STEP 4: CREATE TIMER TRIGGER (2 HOURS, STARTS AT prize_pool)
-- ============================================================================

DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Timer starts when current_pot >= prize_pool (2 players filled the pot)
    IF NEW.current_pot >= NEW.prize_pool 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        RAISE NOTICE '⏰ 1V1 TIMER STARTING - 2 HOURS!';
        RAISE NOTICE '   Config: %', NEW.config_id;
        RAISE NOTICE '   Current Pot: $%', NEW.current_pot;
        RAISE NOTICE '   Prize Pool: $%', NEW.prize_pool;
        
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.timer_duration := 7200;  -- 2 hours
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_start_1v1_timer
    BEFORE UPDATE OR INSERT ON one_v_one_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_1v1_timer();

SELECT '✅ Step 4: Timer trigger created (current_pot >= prize_pool, 2 hours)' as status;

-- ============================================================================
-- STEP 5: CREATE JOIN FUNCTION (BLOCKS AT 2 PLAYERS & 2 MIN REMAINING)
-- ============================================================================

-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.one_v_one_join(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);

-- Create function with frontend's expected name
CREATE OR REPLACE FUNCTION public.join_1v1_session(
    session_id_param TEXT,
    user_id_param UUID,
    entry_fee_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_participant_id UUID;
    v_rng_seed INT;
    v_username TEXT;
    v_current_count INT;
    v_timer_started TIMESTAMPTZ;
    v_timer_duration INT;
    v_time_remaining NUMERIC;
BEGIN
    -- Convert to UUID
    BEGIN
        v_session_uuid := session_id_param::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%', v_session_uuid;
    
    -- Get session info
    SELECT 
        COALESCE(participants_count, 0),
        timer_started_at, 
        COALESCE(timer_duration, 7200)
    INTO v_current_count, v_timer_started, v_timer_duration
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or completed');
    END IF;
    
    -- Block if 2 players already (1v1 = max 2 players)
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check if timer running and if < 2 minutes remaining
    IF v_timer_started IS NOT NULL THEN
        v_time_remaining := v_timer_duration - EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        
        -- Block joins when 2 minutes (120 seconds) or less remaining
        IF v_time_remaining <= 120 THEN
            RAISE NOTICE '❌ BLOCKED: Only % seconds remaining', v_time_remaining;
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Listing closed - less than 2 minutes remaining'
            );
        END IF;
    END IF;
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_purchased) WHERE id = user_id_param;
    END IF;
    
    -- Get RNG seed and username
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = user_id_param;
    
    -- Add participant (no username column in table)
    v_participant_id := gen_random_uuid();
    INSERT INTO one_v_one_participants (id, session_id, user_id, joined_at)
    VALUES (v_participant_id, v_session_uuid, user_id_param, NOW());
    
    -- Update session (trigger will check current_pot >= prize_pool)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Join successful - Player %/2', v_current_count + 1;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Also create update_1v1_score function that frontend needs
DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_1v1_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE one_v_one_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id = session_id_param::UUID 
    AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- Legacy alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.one_v_one_join(
    p_session TEXT,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_participant_id UUID;
    v_rng_seed INT;
    v_username TEXT;
    v_current_count INT;
    v_timer_started TIMESTAMPTZ;
    v_timer_duration INT;
    v_time_remaining NUMERIC;
BEGIN
    -- Convert to UUID
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%', v_session_uuid;
    
    -- Get session info
    SELECT 
        COALESCE(participants_count, 0),
        timer_started_at, 
        COALESCE(timer_duration, 7200)
    INTO v_current_count, v_timer_started, v_timer_duration
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or completed');
    END IF;
    
    -- Block if 2 players already (1v1 = max 2 players)
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check if timer running and if < 2 minutes remaining
    IF v_timer_started IS NOT NULL THEN
        v_time_remaining := v_timer_duration - EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        
        -- Block joins when 2 minutes (120 seconds) or less remaining
        IF v_time_remaining <= 120 THEN
            RAISE NOTICE '❌ BLOCKED: Only % seconds remaining', v_time_remaining;
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Listing closed - less than 2 minutes remaining'
            );
        END IF;
    END IF;
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = p_user;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= p_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    END IF;
    
    -- Get RNG seed and username
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = p_user;
    
    -- Add participant (no username column in table)
    v_participant_id := gen_random_uuid();
    INSERT INTO one_v_one_participants (id, session_id, user_id, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, NOW());
    
    -- Update session (trigger will check current_pot >= prize_pool)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Join successful - Player %/2', v_current_count + 1;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.one_v_one_join(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 5: Join & Score functions created (join_1v1_session, update_1v1_score)' as status;

-- ============================================================================
-- STEP 6: CREATE PAYOUT FUNCTION (50% WINNER, 35% LOSER, 15% PLATFORM)
-- ============================================================================

-- Drop existing payout function if exists
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    loser_record RECORD;
    total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_loser_payout NUMERIC;
BEGIN
    -- Find active or completed session for this config
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;

    -- Check if already paid out
    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Session already paid out',
            'already_paid', true
        );
    END IF;

    -- Find winner (highest score)
    SELECT p.*, u.username
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No winner found - no completed games'
        );
    END IF;

    -- Find loser (second highest score)
    SELECT p.*, u.username
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    AND p.user_id != winner_record.user_id
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    -- Calculate payout (50% winner, 35% loser, 15% platform)
    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Prize pool is empty',
            'total_pot', total_pot
        );
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    -- Pay winner to won_tokens wallet
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    -- Record winner transaction
    INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (
        winner_record.user_id,
        'credit',
        'game_win',
        v_winner_payout,
        '1v1 Winner - ' || config_id_param
    );

    -- Pay loser if exists
    IF loser_record IS NOT NULL THEN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
            updated_at = NOW()
        WHERE id = loser_record.user_id;

        -- Record loser transaction
        INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
        VALUES (
            loser_record.user_id,
            'credit',
            'game_participation',
            v_loser_payout,
            '1v1 Loser Prize - ' || config_id_param
        );
    END IF;

    -- Mark session as completed
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL),
        winner_prize = v_winner_payout,
        loser_prize = COALESCE(v_loser_payout, 0),
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    RAISE NOTICE '✅ [1V1 PAYOUT] Winner: % ($%), Loser: % ($%)', 
        winner_record.username, v_winner_payout,
        COALESCE(loser_record.username, 'N/A'), COALESCE(v_loser_payout, 0);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.username,
        'winner_user_id', winner_record.user_id::TEXT,
        'winner_score', winner_record.score,
        'winner_payout', v_winner_payout,
        'loser_username', COALESCE(loser_record.username, 'None'),
        'loser_payout', COALESCE(v_loser_payout, 0),
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '1v1 Payout error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

SELECT '✅ Step 6: Payout function created (50%/35%/15%)' as status;

-- ============================================================================
-- STEP 7: CREATE INITIAL SESSIONS FOR ALL CONFIGS
-- ============================================================================

-- Get all existing 1v1 configs and create sessions for them
DO $$
DECLARE
    config_rec RECORD;
    new_session_id UUID;
BEGIN
    FOR config_rec IN 
        SELECT * FROM one_v_one_configs
    LOOP
        -- Check if session already exists for this config
        SELECT id INTO new_session_id
        FROM one_v_one_sessions
        WHERE config_id::TEXT = config_rec.id::TEXT
        LIMIT 1;
        
        IF new_session_id IS NOT NULL THEN
            -- Update existing session
            UPDATE one_v_one_sessions
            SET 
                status = 'waiting',
                participants_count = 0,
                current_pot = 0,
                timer_started_at = NULL,
                winner_user_id = NULL,
                loser_user_id = NULL,
                winner_prize = 0,
                loser_prize = 0,
                platform_fee = 0,
                completed_at = NULL,
                prize_pool = config_rec.entry_fee,
                timer_duration = 7200,
                updated_at = NOW()
            WHERE id = new_session_id::TEXT;
            
            RAISE NOTICE '✅ Session reset for config: %', config_rec.id;
        ELSE
            -- Create new session
            new_session_id := gen_random_uuid();
            
            INSERT INTO one_v_one_sessions (
                id,
                config_id,
                prize_pool,
                participants_count,
                status,
                rng_seed,
                current_pot,
                timer_duration,
                created_at,
                updated_at
            )
            VALUES (
                new_session_id,
                config_rec.id::TEXT,
                config_rec.entry_fee,  -- prize_pool = entry_fee for 1v1
                0,
                'waiting',
                floor(random() * 99999 + 1)::integer,
                0,
                7200,  -- 2 hours
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '✅ Session created for config: %', config_rec.id;
        END IF;
    END LOOP;
END;
$$;

SELECT '✅ Step 7: Initial sessions created for all configs' as status;

-- ============================================================================
-- STEP 8: VERIFY SETUP
-- ============================================================================

SELECT '📊 1V1 SESSIONS:' as info;
SELECT 
    config_id,
    status,
    participants_count,
    current_pot,
    prize_pool,
    timer_started_at,
    timer_duration
FROM one_v_one_sessions
ORDER BY config_id
LIMIT 10;

SELECT '
✅ 1V1 COMPLETE SOLUTION READY!

What''s Included:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Sessions created for all 1v1 configs
2. ✅ Get sessions function (get_all_one_v_one_sessions)
3. ✅ Timer: 2 hours, starts when current_pot >= prize_pool
4. ✅ Join blocking: Max 2 players, blocks at 2 min remaining
5. ✅ Payout: 50% winner, 35% loser, 15% platform

How It Works:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$2 Listing (prize_pool = 2):
├─ Player 1 joins: Pays $1 → current_pot = $1
├─ Player 2 joins: Pays $1 → current_pot = $2
│  └─ Trigger fires: current_pot (2) >= prize_pool (2)
│  └─ Timer starts! (2 hours)
│  └─ Player 3: BLOCKED (2 players max)
├─ 01:58:00 remaining → Still can join (if not full)
├─ 01:58:00 remaining → BLOCKED (< 2 min)
├─ 02:00:00 → Timer expires
└─ Payout: Winner $1.00 (50%), Loser $0.70 (35%), Platform $0.30 (15%)

$25 Listing (prize_pool = 25):
├─ Player 1: Pays $12.50 → current_pot = $12.50
├─ Player 2: Pays $12.50 → current_pot = $25 → Timer starts!
└─ Payout: Winner $12.50 (50%), Loser $8.75 (35%), Platform $3.75 (15%)

Frontend Functions to Call:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Get all sessions
SELECT * FROM get_all_one_v_one_sessions();

// Join a session
SELECT one_v_one_join(
    ''session-id''::TEXT,
    ''user-id''::UUID,
    1.00  -- entry fee
);

// Process payout
SELECT process_1v1_payout(''config-id''::TEXT);

Ready to test! 🚀
' as summary;

