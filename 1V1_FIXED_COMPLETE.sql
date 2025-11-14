-- ============================================================================
-- 1V1 COMPLETE SOLUTION - CORRECTED TABLE NAMES
-- ============================================================================
-- Tables: one_v_one_configs, one_v_one_sessions, one_v_one_participants
-- Timer: 2 hours, starts when current_pot >= prize_pool (base price)
-- Blocks: After 2 players join
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD TIMER FIELDS
-- ============================================================================

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;

ALTER TABLE one_v_one_configs 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;

UPDATE one_v_one_configs
SET timer_duration = 7200
WHERE timer_duration IS NULL OR timer_duration != 7200;

SELECT '✅ Step 1: Timer fields added' as status;

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
    prize_amount = 0,
    platform_fee = 0,
    completed_at = NULL,
    updated_at = NOW();

SELECT '✅ Step 2: All sessions reset' as status;

-- ============================================================================
-- STEP 3: CREATE TIMER TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Timer starts when current_pot >= prize_pool (2 players = base price reached)
    IF NEW.current_pot >= NEW.prize_pool 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        RAISE NOTICE '⏰ 1V1 TIMER STARTING!';
        RAISE NOTICE '   Config: %', NEW.config_id;
        RAISE NOTICE '   Current Pot: $%', NEW.current_pot;
        RAISE NOTICE '   Prize Pool (Base): $%', NEW.prize_pool;
        
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

SELECT '✅ Step 3: Timer trigger created' as status;

-- ============================================================================
-- STEP 4: CREATE JOIN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.one_v_one_join(
    p_session_id TEXT,
    p_user_id UUID,
    p_entry_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_current_count INT;
    v_rng_seed INT;
BEGIN
    v_session_uuid := p_session_id::UUID;
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%, user=%', v_session_uuid, p_user_id;
    
    -- Get current count
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Block if 2 players already joined
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = p_user_id;
    
    IF (v_purchased + v_won) < p_entry_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= p_entry_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_entry_fee WHERE id = p_user_id;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_entry_fee - v_purchased) WHERE id = p_user_id;
    END IF;
    
    -- Get RNG seed
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    -- Add participant
    INSERT INTO one_v_one_participants (session_id, user_id, joined_at)
    VALUES (v_session_uuid, p_user_id, NOW());
    
    -- Update session (trigger will check current_pot >= prize_pool and start timer)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + p_entry_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Join successful';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.one_v_one_join(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 4: Join function created' as status;

SELECT '
✅ 1V1 COMPLETE!

How It Works:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. TIMER STARTS: When current_pot >= prize_pool
   - $2 listing: 2 players @ $1 = $2
   - $25 listing: 2 players @ $12.50 = $25

2. BLOCKING: After 2 players join (listing full)

3. TIMER: 2 hours (7200 seconds)

4. Function: one_v_one_join(session_id, user_id, entry_fee)

Ready to test! 🚀
' as summary;

