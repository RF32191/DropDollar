-- ============================================================================
-- WTA 2-HOUR TIMER WITH 2-MINUTE BLOCKING
-- ============================================================================
-- Timer: 2 hours (7200 seconds)
-- Block joins: When 2 minutes or less remaining (120 seconds)
-- ============================================================================

-- Update all configs to 2-hour timer
UPDATE winner_takes_all_configs
SET timer_duration = 7200  -- 2 hours
WHERE timer_duration IS NOT NULL;

-- Update all sessions to 2-hour timer
UPDATE winner_takes_all_sessions
SET timer_duration = 7200  -- 2 hours
WHERE timer_duration IS NOT NULL;

SELECT '✅ Step 1: All timers set to 2 hours (7200 seconds)' as status;

-- ============================================================================
-- UPDATE JOIN FUNCTION - BLOCK WHEN 2 MINUTES REMAINING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wta_join_v2(
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
    v_timer_started TIMESTAMPTZ;
    v_timer_duration INT;
    v_time_elapsed NUMERIC;
    v_time_remaining NUMERIC;
BEGIN
    v_session_uuid := p_session::UUID;
    
    RAISE NOTICE '🎮 WTA JOIN: session=%, user=%', v_session_uuid, p_user;
    
    -- Get session timer info
    SELECT timer_started_at, COALESCE(timer_duration, 7200)
    INTO v_timer_started, v_timer_duration
    FROM winner_takes_all_sessions
    WHERE id = v_session_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if timer is running and if 2 minutes or less remaining
    IF v_timer_started IS NOT NULL THEN
        v_time_elapsed := EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        v_time_remaining := v_timer_duration - v_time_elapsed;
        
        RAISE NOTICE '⏰ Timer: elapsed=%, remaining=%', v_time_elapsed, v_time_remaining;
        
        -- Block joins when 2 minutes (120 seconds) or less remaining
        IF v_time_remaining <= 120 THEN
            RAISE NOTICE '❌ BLOCKED: Only % seconds remaining', v_time_remaining;
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Listing closed - less than 2 minutes remaining',
                'time_remaining', v_time_remaining
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
    IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= p_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    END IF;
    
    -- Get RNG seed and username
    SELECT rng_seed INTO v_rng_seed FROM winner_takes_all_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = p_user;
    
    -- Add participant
    v_participant_id := gen_random_uuid();
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, COALESCE(v_username, 'Anonymous'), NOW());
    
    -- Update session (trigger checks prize_pool >= base_price)
    UPDATE winner_takes_all_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        prize_pool = COALESCE(prize_pool, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Join successful, time_remaining=%s', v_time_remaining;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed,
        'time_remaining', v_time_remaining
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 2: Join function updated - blocks with 2 minutes remaining' as status;

-- ============================================================================
-- UPDATE TIMER TRIGGER FOR 2-HOUR DURATION
-- ============================================================================

DROP TRIGGER IF EXISTS auto_start_wta_timer ON winner_takes_all_sessions;
DROP FUNCTION IF EXISTS auto_start_wta_timer();

CREATE OR REPLACE FUNCTION auto_start_wta_timer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prize_pool >= NEW.base_price 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        RAISE NOTICE '⏰ TIMER STARTING - 2 HOURS!';
        RAISE NOTICE '   Config: %', NEW.config_id;
        RAISE NOTICE '   Prize Pool: $%', NEW.prize_pool;
        RAISE NOTICE '   Base Price: $%', NEW.base_price;
        
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.timer_duration := 7200;  -- 2 hours
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_start_wta_timer
    BEFORE UPDATE OR INSERT ON winner_takes_all_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_wta_timer();

SELECT '✅ Step 3: Timer trigger updated for 2-hour duration' as status;

SELECT '
✅ WTA 2-HOUR TIMER COMPLETE!

Changes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Timer duration: 2 hours (7200 seconds)
2. ✅ Joins blocked: When ≤ 2 minutes remaining (120 seconds)
3. ✅ Timer starts: When prize_pool >= base_price
4. ✅ All configs and sessions updated

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0:00 - Prize pool reaches base price → Timer starts
...
1:58:00 - Players can still join (2 min remaining)
1:58:01 - JOINS BLOCKED (less than 2 min)
2:00:00 - Timer expires → Payout

Ready! 🚀
' as summary;

