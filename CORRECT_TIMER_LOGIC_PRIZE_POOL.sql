-- ============================================================================
-- CORRECT TIMER LOGIC - BASED ON PRIZE POOL NOT PLAYER COUNT
-- ============================================================================
-- Timer starts when prize_pool >= base_price
-- Example: $250 listing needs $250 in prize pool to start timer
-- ============================================================================

-- ============================================================================
-- STEP 1: MANUALLY START TIMER FOR SESSIONS THAT REACHED BASE PRICE
-- ============================================================================

SELECT 
    '🔍 SESSIONS AT OR ABOVE BASE PRICE:' as status,
    s.config_id,
    s.prize_pool,
    s.base_price,
    s.participants_count,
    s.timer_started_at,
    CASE 
        WHEN s.prize_pool >= s.base_price AND s.timer_started_at IS NULL 
        THEN '❌ SHOULD HAVE STARTED!'
        WHEN s.prize_pool >= s.base_price AND s.timer_started_at IS NOT NULL 
        THEN '✅ Timer running'
        ELSE format('⏳ $%s / $%s', s.prize_pool, s.base_price)
    END as status
FROM winner_takes_all_sessions s
WHERE s.status IN ('waiting', 'active')
ORDER BY s.prize_pool DESC;

-- Start timer for sessions that reached base price
UPDATE winner_takes_all_sessions
SET 
    status = 'active',
    timer_started_at = NOW(),
    timer_duration = 60,
    updated_at = NOW()
WHERE prize_pool >= base_price
AND timer_started_at IS NULL
AND status != 'completed';

SELECT '✅ Step 1: Started timers for sessions at base price' as status;

-- ============================================================================
-- STEP 2: CREATE TRIGGER BASED ON PRIZE POOL
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS auto_start_wta_timer ON winner_takes_all_sessions;
DROP FUNCTION IF EXISTS auto_start_wta_timer();

-- Create new trigger function
CREATE OR REPLACE FUNCTION auto_start_wta_timer()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE '🎯 TRIGGER: config=%, prize_pool=$%, base_price=$%, timer=%',
        NEW.config_id, NEW.prize_pool, NEW.base_price, NEW.timer_started_at;
    
    -- Check if prize pool reached or exceeded base price
    IF NEW.prize_pool >= NEW.base_price 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        RAISE NOTICE '⏰⏰⏰ PRIZE POOL REACHED! STARTING TIMER! ⏰⏰⏰';
        RAISE NOTICE '   Prize Pool: $%', NEW.prize_pool;
        RAISE NOTICE '   Base Price: $%', NEW.base_price;
        
        -- Start the timer!
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.timer_duration := COALESCE(NEW.timer_duration, 60);
        NEW.updated_at := NOW();
        
        RAISE NOTICE '✅ Timer started at: %', NEW.timer_started_at;
    ELSE
        RAISE NOTICE '⏳ Not yet: $% / $%', NEW.prize_pool, NEW.base_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER auto_start_wta_timer
    BEFORE UPDATE OR INSERT ON winner_takes_all_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_wta_timer();

SELECT '✅ Step 2: Created trigger based on prize_pool >= base_price' as status;

-- ============================================================================
-- STEP 3: UPDATE wta_join_v2 FUNCTION
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
    v_base_price NUMERIC;
    v_current_pool NUMERIC;
    v_new_pool NUMERIC;
BEGIN
    -- Convert to UUID
    v_session_uuid := p_session::UUID;
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '🎮 WTA JOIN';
    RAISE NOTICE '   Session: %', v_session_uuid;
    RAISE NOTICE '   User: %', p_user;
    RAISE NOTICE '   Entry Fee: $%', p_fee;
    
    -- Get session details
    SELECT base_price, COALESCE(prize_pool, 0)
    INTO v_base_price, v_current_pool
    FROM winner_takes_all_sessions
    WHERE id = v_session_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    v_new_pool := v_current_pool + p_fee;
    
    RAISE NOTICE '💰 PRIZE POOL:';
    RAISE NOTICE '   Current: $%', v_current_pool;
    RAISE NOTICE '   After join: $%', v_new_pool;
    RAISE NOTICE '   Base Price: $%', v_base_price;
    RAISE NOTICE '   Will start timer: %', v_new_pool >= v_base_price;
    
    -- Check tokens
    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users
    WHERE id = p_user;
    
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
    
    RAISE NOTICE '✅ Participant added';
    
    -- Update session (TRIGGER will check prize_pool >= base_price and start timer!)
    UPDATE winner_takes_all_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        prize_pool = v_new_pool,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Session updated (trigger handles timer based on prize pool)';
    RAISE NOTICE '═══════════════════════════════════════';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed,
        'prize_pool', v_new_pool,
        'base_price', v_base_price
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Step 3: Updated wta_join_v2 with prize pool logic' as status;

-- ============================================================================
-- STEP 4: VERIFY EVERYTHING
-- ============================================================================

-- Check trigger
SELECT 
    '✅ TRIGGER:' as info,
    trigger_name,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'auto_start_wta_timer';

-- Check all sessions with prize pool vs base price
SELECT 
    '📊 ALL SESSIONS:' as info,
    s.config_id,
    s.status,
    s.participants_count,
    CONCAT('$', s.prize_pool) as prize_pool,
    CONCAT('$', s.base_price) as base_price,
    ROUND((s.prize_pool / NULLIF(s.base_price, 0)) * 100, 1) || '%' as progress,
    s.timer_started_at,
    CASE 
        WHEN s.timer_started_at IS NOT NULL THEN '✅ Timer running'
        WHEN s.prize_pool >= s.base_price THEN '❌ Should be running!'
        ELSE format('⏳ Need $%s more', s.base_price - s.prize_pool)
    END as timer_status
FROM winner_takes_all_sessions s
WHERE s.status IN ('waiting', 'active')
ORDER BY (s.prize_pool / NULLIF(s.base_price, 0)) DESC;

SELECT '
✅ CORRECT TIMER LOGIC APPLIED!

How It Works Now:
- Timer starts when: prize_pool >= base_price
- NOT based on player count anymore!

Examples:
- $2 listing: Needs $2 in pool (2 players @ $1 each)
- $5 listing: Needs $5 in pool (5 players @ $1 each)  
- $250 listing: Needs $250 in pool (250 players @ $1 each)
- $10,000 listing: Needs $10,000 in pool (10,000 players @ $1 each)

Progress Bar:
- Shows: (prize_pool / base_price) * 100%
- Reaches 100% → Timer starts!

Testing:
1. Join $2 listing twice → Timer starts at $2
2. Join $250 listing 250 times → Timer starts at $250
3. Check logs for:
   - 💰 PRIZE POOL messages
   - ⏰⏰⏰ PRIZE POOL REACHED! STARTING TIMER!

Database trigger automatically handles everything! 🚀
' as summary;

