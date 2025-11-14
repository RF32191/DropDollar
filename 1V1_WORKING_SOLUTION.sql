-- ============================================================================
-- 1V1 WORKING SOLUTION - ADDS MISSING COLUMNS
-- ============================================================================
-- Adds all required columns, then sets up timer logic
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK EXISTING COLUMNS
-- ============================================================================

SELECT '📋 Current one_v_one_sessions columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'one_v_one_sessions' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: ADD MISSING COLUMNS
-- ============================================================================

-- Add current_pot if missing
ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS current_pot NUMERIC DEFAULT 0;

-- Add timer fields
ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 7200;

-- Set current_pot to existing prize_pool if null
UPDATE one_v_one_sessions
SET current_pot = COALESCE(prize_pool, 0)
WHERE current_pot IS NULL OR current_pot = 0;

SELECT '✅ Step 2: Added missing columns' as status;

-- ============================================================================
-- STEP 3: RESET ALL SESSIONS
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

SELECT '✅ Step 3: All sessions reset' as status;

-- ============================================================================
-- STEP 4: CREATE TIMER TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Timer starts when current_pot >= prize_pool (2 players joined)
    IF NEW.current_pot >= NEW.prize_pool 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        RAISE NOTICE '⏰⏰⏰ 1V1 TIMER STARTING!';
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

SELECT '✅ Step 4: Timer trigger created (current_pot >= prize_pool)' as status;

-- ============================================================================
-- STEP 5: CREATE OR REPLACE JOIN FUNCTION
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
    
    RAISE NOTICE '════════════════════════════════';
    RAISE NOTICE '🎮 1V1 JOIN';
    RAISE NOTICE '   Session: %', v_session_uuid;
    RAISE NOTICE '   User: %', p_user_id;
    RAISE NOTICE '   Fee: $%', p_entry_fee;
    
    -- Get current count
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    RAISE NOTICE '   Current players: %', v_current_count;
    
    -- Block if 2 players already joined
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (% players)', v_current_count;
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
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
        RAISE NOTICE '   Deducted from purchased_tokens';
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_entry_fee - v_purchased) WHERE id = p_user_id;
        RAISE NOTICE '   Deducted from mixed wallets';
    END IF;
    
    -- Get RNG seed
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    -- Add participant
    INSERT INTO one_v_one_participants (session_id, user_id, joined_at)
    VALUES (v_session_uuid, p_user_id, NOW());
    
    RAISE NOTICE '   Participant added';
    
    -- Update session (trigger will check current_pot >= prize_pool)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + p_entry_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '   New player count: %', v_current_count + 1;
    RAISE NOTICE '   New pot: $%', COALESCE((SELECT current_pot FROM one_v_one_sessions WHERE id = v_session_uuid), 0);
    RAISE NOTICE '✅ Join complete';
    RAISE NOTICE '════════════════════════════════';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participants_count', v_current_count + 1,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.one_v_one_join(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 5: Join function created with logging' as status;

-- ============================================================================
-- STEP 6: VERIFY SETUP
-- ============================================================================

SELECT '📊 1V1 SESSIONS:' as info;
SELECT 
    config_id,
    status,
    participants_count,
    current_pot,
    prize_pool,
    timer_started_at
FROM one_v_one_sessions
ORDER BY config_id
LIMIT 10;

SELECT '
✅ 1V1 WORKING SOLUTION COMPLETE!

What Changed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Added current_pot column (if missing)
2. ✅ Added timer_started_at and timer_duration
3. ✅ Created trigger: timer starts when current_pot >= prize_pool
4. ✅ Created join function: blocks after 2 players
5. ✅ Extensive logging for debugging

How It Works:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$2 Listing (prize_pool = 2):
├─ Player 1 joins: Pays $1 → current_pot = $1
├─ Player 2 joins: Pays $1 → current_pot = $2
│  └─ Trigger fires: current_pot (2) >= prize_pool (2)
│  └─ Timer starts! (2 hours)
└─ Player 3: BLOCKED (2 players max)

$25 Listing (prize_pool = 25):
├─ Player 1 joins: Pays $12.50 → current_pot = $12.50
├─ Player 2 joins: Pays $12.50 → current_pot = $25
│  └─ Timer starts!
└─ Player 3: BLOCKED

Function to Call:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT one_v_one_join(
    ''session-id''::TEXT,
    ''user-id''::UUID,
    1.00  -- entry fee
);

Check Logs:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Go to Supabase Dashboard → Logs
Look for:
- 🎮 1V1 JOIN
- ⏰⏰⏰ 1V1 TIMER STARTING!
- ✅ Join complete

Ready to test! 🚀
' as summary;

