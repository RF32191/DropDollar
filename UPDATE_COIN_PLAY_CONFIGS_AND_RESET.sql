-- ============================================================================
-- UPDATE COIN PLAY CONFIGS AND RESET SESSIONS
-- ============================================================================
-- This script:
-- 1. Updates max_participants to match target pool (4 for $1, 40 for $10, etc.)
-- 2. Clears all participants and sessions
-- 3. Creates fresh waiting sessions
-- Winner gets 85% of pool (15% platform fee)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 UPDATING COIN PLAY CONFIGS & RESET';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Update max_participants to match target pool
-- ============================================================================

DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Updating max_participants to match target pool...';
    RAISE NOTICE '   Formula: max_participants = prize_pool / entry_fee';
    RAISE NOTICE '   Example: $10 pool / $0.25 entry = 40 participants';
    
    -- Update max_participants: prize_pool / entry_fee (0.25)
    -- This ensures exactly enough players to fill the target pool
    UPDATE public.coin_play_configs
    SET 
        max_participants = (prize_pool / entry_fee)::INTEGER,
        updated_at = NOW()
    WHERE max_participants != (prize_pool / entry_fee)::INTEGER;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Updated % configs', v_updated_count;
    
    -- Show some examples
    RAISE NOTICE '';
    RAISE NOTICE '📋 Example Configs:';
    RAISE NOTICE '   $1 pool → % participants', (1.00 / 0.25)::INTEGER;
    RAISE NOTICE '   $10 pool → % participants', (10.00 / 0.25)::INTEGER;
    RAISE NOTICE '   $100 pool → % participants', (100.00 / 0.25)::INTEGER;
    RAISE NOTICE '   $1000 pool → % participants', (1000.00 / 0.25)::INTEGER;
END $$;

-- ============================================================================
-- STEP 2: Clear all participants
-- ============================================================================

DO $$
DECLARE
    v_participant_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Clearing all participants...';
    
    SELECT COUNT(*) INTO v_participant_count FROM public.coin_play_participants;
    RAISE NOTICE '   Found % participants to delete', v_participant_count;
    
    DELETE FROM public.coin_play_participants;
    
    RAISE NOTICE '✅ All participants cleared';
END $$;

-- ============================================================================
-- STEP 3: Clear all sessions
-- ============================================================================

DO $$
DECLARE
    v_session_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Clearing all sessions...';
    
    SELECT COUNT(*) INTO v_session_count FROM public.coin_play_sessions;
    RAISE NOTICE '   Found % sessions to delete', v_session_count;
    
    DELETE FROM public.coin_play_sessions;
    
    RAISE NOTICE '✅ All sessions cleared';
END $$;

-- ============================================================================
-- STEP 4: Verify configs exist
-- ============================================================================

DO $$
DECLARE
    v_config_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Checking configs...';
    
    SELECT COUNT(*) INTO v_config_count FROM public.coin_play_configs;
    RAISE NOTICE '   Found % configs', v_config_count;
    
    IF v_config_count = 0 THEN
        RAISE NOTICE '   ❌ NO CONFIGS FOUND!';
        RAISE NOTICE '   ⚠️  Run CREATE_COIN_PLAY_SYSTEM.sql first to create configs';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Configs exist';
END $$;

-- ============================================================================
-- STEP 5: Create fresh waiting sessions for all configs
-- ============================================================================

DO $$
DECLARE
    v_created_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎲 Creating fresh waiting sessions...';
    
    -- Create one waiting session per config
    INSERT INTO public.coin_play_sessions (config_id, status, prize_pool, participants_count, timer_duration)
    SELECT 
        id,
        'waiting',
        0,
        0,
        120 -- 2 minutes
    FROM public.coin_play_configs;
    
    GET DIAGNOSTICS v_created_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Created % fresh waiting sessions', v_created_count;
END $$;

-- ============================================================================
-- STEP 6: Verify reset and show payout info
-- ============================================================================

DO $$
DECLARE
    v_session_count INTEGER;
    v_participant_count INTEGER;
    v_waiting_count INTEGER;
    v_config_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Verifying reset...';
    
    SELECT COUNT(*) INTO v_session_count FROM public.coin_play_sessions;
    SELECT COUNT(*) INTO v_participant_count FROM public.coin_play_participants;
    SELECT COUNT(*) INTO v_waiting_count FROM public.coin_play_sessions WHERE status = 'waiting';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current State:';
    RAISE NOTICE '   Total Sessions: %', v_session_count;
    RAISE NOTICE '   Waiting Sessions: %', v_waiting_count;
    RAISE NOTICE '   Participants: %', v_participant_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '💰 Payout Structure:';
    RAISE NOTICE '   Winner gets: 85%% of pool (15%% platform fee)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Example Payouts:';
    
    -- Show examples
    FOR v_config_record IN 
        SELECT DISTINCT prize_pool, max_participants 
        FROM public.coin_play_configs 
        WHERE prize_pool IN (1.00, 10.00, 100.00, 1000.00)
        ORDER BY prize_pool
    LOOP
        RAISE NOTICE '   $% pool (% players) → Winner gets $%', 
            v_config_record.prize_pool, 
            v_config_record.max_participants,
            (v_config_record.prize_pool * 0.85)::NUMERIC(10,2);
    END LOOP;
    
    IF v_session_count > 0 AND v_participant_count = 0 AND v_waiting_count = v_session_count THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ RESET SUCCESSFUL!';
        RAISE NOTICE '   All sessions are now in "waiting" status';
        RAISE NOTICE '   All participants have been cleared';
        RAISE NOTICE '   Max participants updated to match target pools';
        RAISE NOTICE '   Ready for testing!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Reset completed but verification shows:';
        IF v_session_count = 0 THEN
            RAISE NOTICE '   ❌ No sessions created';
        END IF;
        IF v_participant_count > 0 THEN
            RAISE NOTICE '   ⚠️  % participants still exist', v_participant_count;
        END IF;
        IF v_waiting_count != v_session_count THEN
            RAISE NOTICE '   ⚠️  Not all sessions are in waiting status';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Show updated configs
-- ============================================================================

SELECT 
    '=== Updated Coin Play Configs ===' as info;

SELECT 
    id,
    game_type,
    prize_pool,
    entry_fee,
    max_participants,
    (prize_pool * 0.85)::NUMERIC(10,2) as winner_payout,
    (prize_pool * 0.15)::NUMERIC(10,2) as platform_fee
FROM public.coin_play_configs
ORDER BY game_type, prize_pool
LIMIT 20;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COIN PLAY UPDATE & RESET COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was done:';
    RAISE NOTICE '   1. ✅ Updated max_participants to match target pools';
    RAISE NOTICE '   2. ✅ Cleared all participants';
    RAISE NOTICE '   3. ✅ Cleared all sessions';
    RAISE NOTICE '   4. ✅ Created fresh waiting sessions';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Payout Rules:';
    RAISE NOTICE '   - Winner gets 85%% of pool (highest score)';
    RAISE NOTICE '   - Platform fee: 15%% of pool';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)';
    RAISE NOTICE '   2. Navigate to /coin-play page';
    RAISE NOTICE '   3. All sessions should show correct max participants';
    RAISE NOTICE '   4. Payouts will show 85%% to winner';
    RAISE NOTICE '';
END $$;

SELECT '✅ UPDATE COMPLETE - Coin play configs updated and sessions reset!' as status;

