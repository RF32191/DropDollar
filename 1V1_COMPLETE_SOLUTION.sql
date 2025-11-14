-- ============================================================================
-- 1V1 COMPLETE SOLUTION - SAME AS WTA
-- ============================================================================
-- Timer starts when: prize_pool >= base_price
-- Example: $2 listing = 2 players @ $1 each
--          $25 listing = 2 players @ $12.50 each
-- Timer: 2 hours (7200 seconds)
-- Block: When listing filled (2 players joined)
-- ============================================================================

-- ============================================================================
-- STEP 1: RESET ALL 1V1 SESSIONS
-- ============================================================================

DELETE FROM one_v_one_participants;

UPDATE one_v_one_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    winner_user_id = NULL,
    prize_amount = 0,
    platform_fee = 0,
    completed_at = NULL,
    updated_at = NOW();

SELECT '✅ Step 1: All 1v1 sessions reset' as status;

-- ============================================================================
-- STEP 2: ADD TIMER FIELDS TO SESSIONS TABLE
-- ============================================================================

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS base_price NUMERIC;

-- Set base_price from prize_pool if not set
UPDATE one_v_one_sessions s
SET base_price = s.prize_pool
WHERE base_price IS NULL;

SELECT '✅ Step 2: Added timer fields to sessions table' as status;

-- ============================================================================
-- STEP 3: ADD TIMER DURATION TO CONFIGS
-- ============================================================================

ALTER TABLE one_v_one_configs 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;

UPDATE one_v_one_configs
SET timer_duration = 7200  -- 2 hours
WHERE timer_duration IS NULL OR timer_duration != 7200;

SELECT '✅ Step 3: All configs have timer_duration = 7200 (2 hours)' as status;

-- ============================================================================
-- STEP 4: CREATE TIMER TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Timer starts when current_pot >= base_price (2 players joined)
    IF NEW.current_pot >= NEW.base_price 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        RAISE NOTICE '⏰ 1V1 TIMER STARTING!';
        RAISE NOTICE '   Config: %', NEW.config_id;
        RAISE NOTICE '   Current Pot: $%', NEW.current_pot;
        RAISE NOTICE '   Base Price: $%', NEW.base_price;
        
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

SELECT '✅ Step 4: Timer trigger created (current_pot >= base_price)' as status;

-- ============================================================================
-- STEP 5: CREATE JOIN FUNCTION - BLOCKS WHEN 2 PLAYERS JOINED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.one_v_one_join_v2(
    p_session TEXT,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_participant_id UUID;
    v_rng_seed INT;
    v_username TEXT;
    v_current_count INT;
    v_player_slot INT;
BEGIN
    v_session_uuid := p_session::UUID;
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%, user=%', v_session_uuid, p_user;
    
    -- Get current participant count
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Block if 2 players already joined (listing full)
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Listing full - 2 players already joined'
        );
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
    
    -- Add participant
    v_participant_id := gen_random_uuid();
    v_player_slot := v_current_count + 1;  -- Player 1 or 2
    
    INSERT INTO one_v_one_participants (session_id, user_id, joined_at)
    VALUES (v_session_uuid, p_user, NOW());
    
    -- Update session (trigger checks current_pot >= base_price)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Join successful, slot=%', v_player_slot;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'player_slot', v_player_slot,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.one_vs_one_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 5: Join function created - blocks after 2 players' as status;

-- ============================================================================
-- STEP 6: CREATE PAYOUT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
    v_loser RECORD;
    v_winner_prize NUMERIC;
    v_loser_prize NUMERIC;
    v_platform_fee NUMERIC;
    v_total_pot NUMERIC;
BEGIN
    RAISE NOTICE '💰 [1V1 PAYOUT] Starting for: %', config_id_param;
    
    -- Get active session
    SELECT * INTO v_session 
    FROM public.one_vs_one_sessions 
    WHERE config_id = config_id_param 
    AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Check if already paid out
    IF v_session.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Check if timer expired
    IF v_session.timer_started_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer not started');
    END IF;

    IF EXTRACT(EPOCH FROM (NOW() - v_session.timer_started_at)) < COALESCE(v_session.timer_duration, 7200) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer not expired yet');
    END IF;

    -- Get winner and loser (highest score wins)
    SELECT p.*, u.username
    INTO v_winner
    FROM public.one_vs_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id 
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;

    -- Get loser
    SELECT p.*, u.username
    INTO v_loser
    FROM public.one_vs_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id 
    AND p.user_id != v_winner.user_id
    LIMIT 1;

    -- Calculate prizes (50% winner, 35% loser, 15% platform)
    v_total_pot := COALESCE(v_session.prize_pool, 0);
    
    IF v_total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;
    
    v_platform_fee := v_total_pot * 0.15;
    v_winner_prize := v_total_pot * 0.50;
    v_loser_prize := v_total_pot * 0.35;

    -- Pay winner
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_prize,
        updated_at = NOW()
    WHERE id = v_winner.user_id;

    -- Pay loser
    IF v_loser.user_id IS NOT NULL THEN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_loser_prize,
            updated_at = NOW()
        WHERE id = v_loser.user_id;
    END IF;

    -- Record transactions
    INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
    VALUES 
        (v_winner.user_id, 'credit', 'game_win', v_winner_prize, '1v1 Winner: ' || config_id_param),
        (v_loser.user_id, 'credit', 'game_participation', v_loser_prize, '1v1 Participant: ' || config_id_param);

    -- Mark session as completed
    UPDATE public.one_vs_one_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        player1_prize = CASE WHEN player1_user_id = v_winner.user_id THEN v_winner_prize ELSE v_loser_prize END,
        player2_prize = CASE WHEN player2_user_id = v_winner.user_id THEN v_winner_prize ELSE v_loser_prize END,
        platform_fee_amount = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;

    RAISE NOTICE '✅ [1V1 PAYOUT] Winner: %, Prize: $%', v_winner.username, v_winner_prize;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', v_winner.username,
        'winner_prize', v_winner_prize,
        'loser_prize', v_loser_prize,
        'platform_fee', v_platform_fee,
        'total_pot', v_total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Payout error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

SELECT '✅ Step 5: Payout function created (50% winner, 35% loser, 15% platform)' as status;

-- ============================================================================
-- STEP 6: VERIFY SETUP
-- ============================================================================

SELECT 
    '📊 1V1 CONFIGS:' as info,
    id,
    CONCAT('$', base_price) as base_price,
    timer_duration
FROM one_vs_one_configs
ORDER BY base_price
LIMIT 10;

SELECT 
    '🎮 1V1 SESSIONS:' as info,
    config_id,
    status,
    participants_count,
    CONCAT('$', prize_pool) as prize_pool,
    CONCAT('$', base_price) as base_price,
    timer_started_at
FROM one_vs_one_sessions
WHERE status IN ('waiting', 'active')
ORDER BY config_id
LIMIT 10;

SELECT '
✅ 1V1 COMPLETE SOLUTION!

How It Works:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PRIZE POOL BASED TIMER
   └─ Timer starts when: prize_pool >= base_price
   
2. EXAMPLES
   └─ $2 listing:  2 players @ $1 = $2 → Timer starts
   └─ $25 listing: 2 players @ $12.50 = $25 → Timer starts
   └─ $100 listing: 2 players @ $50 = $100 → Timer starts

3. BLOCKING
   └─ Listing fills when 2 players join
   └─ 3rd player BLOCKED (listing full)

4. TIMER
   └─ Duration: 2 hours (7200 seconds)
   └─ Starts when both players joined

5. PAYOUT
   └─ Winner: 50% of prize pool
   └─ Loser: 35% of prize pool
   └─ Platform: 15%

Ready to test! 🚀
' as summary;

