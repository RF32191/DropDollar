-- ============================================================================
-- 🔧 WTA: 2 Hour Timer + Block Last 2 Minutes
-- ============================================================================

-- Step 1: Update all sessions to 2 hour timer (7200 seconds)
UPDATE winner_takes_all_sessions SET
    timer_duration = 7200,  -- 2 hours
    updated_at = NOW();

-- Step 2: Update configs if they have timer_duration
UPDATE winner_takes_all_configs SET
    timer_duration = 7200
WHERE timer_duration IS NOT NULL;

-- Step 3: Update join function to block last 2 minutes
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.wta_join_v2(
    p_session TEXT, 
    p_user UUID, 
    p_fee NUMERIC
)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sid UUID; 
    v_p NUMERIC; 
    v_w NUMERIC; 
    v_s RECORD; 
    v_name TEXT; 
    v_bal NUMERIC;
    v_new_pool NUMERIC;
    v_new_count INTEGER;
    v_time_remaining INTEGER;
BEGIN
    -- Convert session ID
    BEGIN
        v_sid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    -- Check already joined
    IF EXISTS (SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_sid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Get session with lock
    SELECT * INTO v_s FROM winner_takes_all_sessions WHERE id = v_sid FOR UPDATE;
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Check if session is completed
    IF v_s.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session has ended');
    END IF;

    -- BLOCK LAST 2 MINUTES: If timer started, check remaining time
    IF v_s.timer_started_at IS NOT NULL THEN
        v_time_remaining := COALESCE(v_s.timer_duration, 7200) - 
            EXTRACT(EPOCH FROM (NOW() - v_s.timer_started_at))::INTEGER;
        
        -- Block if less than 120 seconds (2 minutes) remaining
        IF v_time_remaining <= 120 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Registration closed - less than 2 minutes remaining'
            );
        END IF;
    END IF;

    -- Get user with lock
    SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0), COALESCE(username, email, 'Player')
    INTO v_p, v_w, v_name FROM users WHERE id = p_user FOR UPDATE;
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Check balance
    IF (v_p + v_w) < p_fee THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    v_bal := (v_p + v_w) - p_fee;
    
    -- Deduct tokens
    IF v_p >= p_fee THEN 
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE 
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_p) WHERE id = p_user;
    END IF;

    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, v_bal, 'WTA Entry: ' || v_s.config_id, NOW());

    -- Add participant
    INSERT INTO winner_takes_all_participants (session_id, user_id, username, joined_at) 
    VALUES (v_sid, p_user, v_name, NOW());

    -- Calculate new values
    v_new_pool := COALESCE(v_s.prize_pool, 0) + p_fee;
    v_new_count := COALESCE(v_s.participants_count, 0) + 1;

    -- Update session with new prize_pool
    UPDATE winner_takes_all_sessions SET
        participants_count = v_new_count,
        prize_pool = v_new_pool,
        status = CASE 
            WHEN v_new_pool >= COALESCE(base_price, 2) THEN 'active' 
            ELSE 'waiting' 
        END,
        timer_started_at = CASE 
            WHEN v_new_pool >= COALESCE(base_price, 2) AND timer_started_at IS NULL THEN NOW() 
            ELSE timer_started_at 
        END,
        updated_at = NOW()
    WHERE id = v_sid;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Successfully joined',
        'rng_seed', v_s.rng_seed, 
        'username', v_name,
        'new_pool', v_new_pool,
        'participants_count', v_new_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;

-- Step 4: Reset all sessions with 2 hour timer
DELETE FROM winner_takes_all_participants;

UPDATE winner_takes_all_sessions SET
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    timer_duration = 7200,  -- 2 HOURS
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Verify
SELECT '✅ SESSIONS WITH 2 HOUR TIMER:' as info;
SELECT id::TEXT, config_id, status, timer_duration, participants_count 
FROM winner_takes_all_sessions LIMIT 5;

SELECT '
============================================
✅ WTA 2 HOUR TIMER SET!
============================================
- Timer duration: 7200 seconds (2 hours)
- Last 2 minutes: Registration blocked
- All sessions reset
============================================
' as done;

