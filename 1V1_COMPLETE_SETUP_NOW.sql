-- ============================================================================
-- 1V1 COMPLETE SETUP - ONE SCRIPT TO RULE THEM ALL
-- ============================================================================
-- This script does everything needed to get 1v1 working
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ONE_V_ONE_CONFIGS TABLE EXISTS WITH DATA
-- ============================================================================

-- Check if table exists, if not, you'll need to create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'one_v_one_configs') THEN
        RAISE EXCEPTION 'Table one_v_one_configs does not exist! Please create it first.';
    END IF;
END $$;

-- Insert sample configs if none exist
INSERT INTO one_v_one_configs (id, game_type, title, description, entry_fee, prize_pool, game_duration, rng_seed, winner_prize, platform_fee)
VALUES 
    ('1v1-sword-$1', 'sword_parry', 'Sword Slash 1v1 - $1', 'Face off in sword combat', 1, 2, 30, 12345, 1.70, 0.30),
    ('1v1-sword-$5', 'sword_parry', 'Sword Slash 1v1 - $5', 'Face off in sword combat', 5, 10, 30, 12345, 8.50, 1.50),
    ('1v1-blade-$1', 'blade_bounce', 'Blade Bounce 1v1 - $1', 'Head-to-head blade action', 1, 2, 30, 54321, 1.70, 0.30),
    ('1v1-blade-$5', 'blade_bounce', 'Blade Bounce 1v1 - $5', 'Head-to-head blade action', 5, 10, 30, 54321, 8.50, 1.50),
    ('1v1-laser-$1', 'laser_dodge', 'Laser Dodge 1v1 - $1', 'Dodge lasers head-to-head', 1, 2, 30, 11111, 1.70, 0.30),
    ('1v1-laser-$5', 'laser_dodge', 'Laser Dodge 1v1 - $5', 'Dodge lasers head-to-head', 5, 10, 30, 11111, 8.50, 1.50)
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Step 1: Configs ensured' as status;

-- ============================================================================
-- STEP 2: ADD MISSING COLUMNS TO ONE_V_ONE_SESSIONS
-- ============================================================================

ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS current_pot NUMERIC DEFAULT 0;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS winner_user_id UUID;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS loser_user_id UUID;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS winner_prize NUMERIC DEFAULT 0;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS loser_prize NUMERIC DEFAULT 0;
ALTER TABLE one_v_one_sessions ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

SELECT '✅ Step 2: Columns added' as status;

-- ============================================================================
-- STEP 3: CLEAR OLD DATA AND CREATE FRESH SESSIONS
-- ============================================================================

DELETE FROM one_v_one_participants;
DELETE FROM one_v_one_sessions;

-- Insert sessions with explicit type casting
DO $$
DECLARE
    config_rec RECORD;
    new_session_id UUID;
BEGIN
    FOR config_rec IN SELECT * FROM one_v_one_configs LOOP
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
            new_session_id::TEXT,
            config_rec.id::TEXT,
            config_rec.entry_fee * 2,
            0,
            'waiting',
            floor(random() * 99999 + 1)::integer,
            0,
            7200,
            NOW(),
            NOW()
        );
    END LOOP;
END $$;

SELECT '✅ Step 3: Sessions created for all configs' as status;

-- ============================================================================
-- STEP 4: CREATE get_all_1v1_sessions FUNCTION (MATCHING FRONTEND)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_1v1_sessions();

CREATE OR REPLACE FUNCTION public.get_all_1v1_sessions()
RETURNS TABLE (
    id TEXT,
    config_id TEXT,
    current_pool NUMERIC,
    prize_pool NUMERIC,
    participants_count INTEGER,
    max_participants INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rng_seed INTEGER,
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
        COALESCE(sess.current_pot, 0)::NUMERIC as current_pool,
        COALESCE(sess.prize_pool, 0)::NUMERIC,
        COALESCE(sess.participants_count, 0)::INTEGER,
        2::INTEGER as max_participants,
        sess.status::TEXT,
        sess.timer_started_at,
        COALESCE(sess.timer_duration, 7200)::INTEGER,
        sess.winner_user_id::TEXT,
        COALESCE(sess.winner_prize, 0)::NUMERIC as prize_amount,
        COALESCE(sess.platform_fee, 0)::NUMERIC,
        sess.created_at,
        sess.updated_at,
        sess.completed_at,
        COALESCE(sess.rng_seed, 1)::INTEGER,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', part.id::TEXT,
                    'user_id', part.user_id::TEXT,
                    'score', part.score,
                    'accuracy', part.accuracy,
                    'joined_at', part.joined_at,
                    'completed_at', part.completed_at
                )
            ) FILTER (WHERE part.id IS NOT NULL),
            '[]'::jsonb
        ) as participants
    FROM public.one_v_one_sessions sess
    LEFT JOIN public.one_v_one_participants part ON part.session_id::TEXT = sess.id::TEXT
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
        sess.winner_prize,
        sess.platform_fee,
        sess.created_at,
        sess.updated_at,
        sess.completed_at,
        sess.rng_seed
    ORDER BY sess.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

SELECT '✅ Step 4: get_all_1v1_sessions() created' as status;

-- ============================================================================
-- STEP 5: CREATE join_1v1_session FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);

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
    v_current_count INT;
    v_timer_started TIMESTAMPTZ;
    v_timer_duration INT;
    v_time_remaining NUMERIC;
BEGIN
    v_session_uuid := session_id_param::UUID;
    
    -- Get session info (explicit type cast)
    SELECT 
        COALESCE(participants_count, 0),
        timer_started_at, 
        COALESCE(timer_duration, 7200)
    INTO v_current_count, v_timer_started, v_timer_duration
    FROM one_v_one_sessions
    WHERE id::TEXT = v_session_uuid::TEXT
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Block if 2 players already
    IF v_current_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check if timer running and < 2 minutes remaining
    IF v_timer_started IS NOT NULL THEN
        v_time_remaining := v_timer_duration - EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        IF v_time_remaining <= 120 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Listing closed - less than 2 minutes remaining');
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
    
    -- Check not already joined (explicit type cast)
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id::TEXT = v_session_uuid::TEXT AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_purchased) WHERE id = user_id_param;
    END IF;
    
    -- Get RNG seed (explicit type cast)
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id::TEXT = v_session_uuid::TEXT;
    
    -- Add participant (explicit type casts)
    v_participant_id := gen_random_uuid();
    INSERT INTO one_v_one_participants (id, session_id, user_id, joined_at)
    VALUES (v_participant_id::TEXT, v_session_uuid::TEXT, user_id_param, NOW());
    
    -- Update session (explicit type cast)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id::TEXT = v_session_uuid::TEXT;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 5: join_1v1_session() created' as status;

-- ============================================================================
-- STEP 6: CREATE update_1v1_score FUNCTION
-- ============================================================================

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
    WHERE session_id::TEXT = session_id_param::TEXT
    AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 6: update_1v1_score() created' as status;

-- ============================================================================
-- STEP 7: CREATE process_1v1_payout FUNCTION
-- ============================================================================

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
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id::TEXT = config_id_param::TEXT
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;

    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid out', 'already_paid', true);
    END IF;

    SELECT p.*, u.username
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner found');
    END IF;

    SELECT p.*, u.username
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    AND p.user_id != winner_record.user_id
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout WHERE id = winner_record.user_id;
    INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (winner_record.user_id, 'credit', 'game_win', v_winner_payout, '1v1 Winner');

    IF loser_record IS NOT NULL THEN
        UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout WHERE id = loser_record.user_id;
        INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
        VALUES (loser_record.user_id, 'credit', 'game_participation', v_loser_payout, '1v1 Participation');
    END IF;

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
    WHERE id::TEXT = session_record.id::TEXT;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.username,
        'winner_payout', v_winner_payout,
        'loser_payout', COALESCE(v_loser_payout, 0),
        'platform_fee', v_platform_fee
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

SELECT '✅ Step 7: process_1v1_payout() created' as status;

-- ============================================================================
-- STEP 8: CREATE TIMER TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_pot >= NEW.prize_pool 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.timer_duration := 7200;
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_start_1v1_timer
    BEFORE UPDATE OR INSERT ON one_v_one_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_1v1_timer();

SELECT '✅ Step 8: Timer trigger created' as status;

-- ============================================================================
-- STEP 9: VERIFY EVERYTHING
-- ============================================================================

SELECT '📊 CONFIGS:' as info;
SELECT COUNT(*) as config_count FROM one_v_one_configs;

SELECT '📊 SESSIONS:' as info;
SELECT COUNT(*) as session_count FROM one_v_one_sessions WHERE status = 'waiting';

SELECT '📊 TEST get_all_1v1_sessions():' as info;
SELECT id, config_id, status, participants_count, max_participants, current_pool, prize_pool
FROM get_all_1v1_sessions()
LIMIT 5;

SELECT '
✅✅✅ 1V1 COMPLETE SETUP DONE! ✅✅✅

Everything is ready:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Configs created
✅ Sessions created (waiting state)
✅ get_all_1v1_sessions() - Returns sessions
✅ join_1v1_session() - Join game
✅ update_1v1_score() - Save score
✅ process_1v1_payout() - 50%/35%/15% payout
✅ Timer trigger - 2 hours, blocks at 2 min

NOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Hard refresh your 1v1 page (Cmd+Shift+R / Ctrl+F5)
2. Clear browser cache if still issues
3. Check browser console for any errors
4. You should see game listings now!

Ready! 🚀🚀🚀
' as summary;

