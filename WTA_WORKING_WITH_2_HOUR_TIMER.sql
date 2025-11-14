-- ============================================================================
-- WTA WORKING VERSION - 2 HOUR TIMER WITH 2 MINUTE BLOCKING
-- ============================================================================
-- Based on original working setup, just updates timer duration and blocking
-- ============================================================================

-- ============================================================================
-- STEP 1: UPDATE ALL TIMERS TO 2 HOURS
-- ============================================================================

UPDATE winner_takes_all_configs
SET timer_duration = 7200  -- 2 hours
WHERE timer_duration IS NOT NULL;

UPDATE winner_takes_all_sessions
SET timer_duration = 7200  -- 2 hours
WHERE timer_duration IS NOT NULL;

SELECT '✅ Step 1: All timers set to 2 hours (7200 seconds)' as status;

-- ============================================================================
-- STEP 2: UPDATE JOIN FUNCTION - ADD 2 MINUTE BLOCKING
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
    v_time_remaining NUMERIC;
BEGIN
    -- Convert to UUID
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    RAISE NOTICE '🎮 WTA JOIN: session=%', v_session_uuid;
    
    -- Get session timer info
    SELECT timer_started_at, COALESCE(timer_duration, 7200)
    INTO v_timer_started, v_timer_duration
    FROM winner_takes_all_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or completed');
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
    
    -- Update session
    UPDATE winner_takes_all_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        prize_pool = COALESCE(prize_pool, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Join successful';
    
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

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 2: Join function updated - blocks with ≤ 2 minutes remaining' as status;

-- ============================================================================
-- STEP 3: KEEP EXISTING TIMER TRIGGER (WORKING)
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

-- ============================================================================
-- STEP 4: VERIFY SETUP
-- ============================================================================

SELECT '📊 WTA SESSIONS:' as info;
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    base_price,
    timer_started_at,
    timer_duration
FROM winner_takes_all_sessions
WHERE status IN ('waiting', 'active')
ORDER BY config_id
LIMIT 10;

SELECT '
✅ WTA 2-HOUR TIMER COMPLETE!

Changes Made:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Timer duration: 2 hours (7200 seconds)
2. ✅ Blocks joins: When ≤ 2 minutes remaining (120 seconds)
3. ✅ Timer trigger: Starts when prize_pool >= base_price
4. ✅ Kept all working logic from before

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
00:00:00 - Prize pool reaches base price → Timer starts
...
01:58:00 - Players can still join (2+ min remaining)
01:58:01 - JOINS BLOCKED (< 2 min remaining)
02:00:00 - Timer expires → Payout triggers

Example ($2 listing):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Player 1: $1 → Prize pool = $1 (waiting)
Player 2: $1 → Prize pool = $2 = base_price
          → Timer starts! (2 hours)
...
1:58:00 left → Can still join
1:58:00 left → BLOCKED
2:00:00 → Payout

Ready to test! 🚀
' as summary;

