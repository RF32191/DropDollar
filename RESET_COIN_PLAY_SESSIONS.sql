-- ============================================================================
-- RESET COIN PLAY SESSIONS
-- ============================================================================
-- This script clears all coin play sessions and participants
-- Then recreates fresh waiting sessions for all configs
-- Use this to reset everything for testing
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 RESETTING COIN PLAY SESSIONS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Clear all participants
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
-- STEP 2: Clear all sessions
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
-- STEP 3: Verify configs exist
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
-- STEP 4: Create fresh waiting sessions for all configs
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
-- STEP 5: Verify reset
-- ============================================================================

DO $$
DECLARE
    v_session_count INTEGER;
    v_participant_count INTEGER;
    v_waiting_count INTEGER;
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
    
    IF v_session_count > 0 AND v_participant_count = 0 AND v_waiting_count = v_session_count THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ RESET SUCCESSFUL!';
        RAISE NOTICE '   All sessions are now in "waiting" status';
        RAISE NOTICE '   All participants have been cleared';
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
-- STEP 6: Test RPC function
-- ============================================================================

DO $$
DECLARE
    v_rpc_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing get_coin_play_sessions() RPC...';
    
    BEGIN
        SELECT COUNT(*) INTO v_rpc_count FROM get_coin_play_sessions();
        RAISE NOTICE '   ✅ RPC returned % sessions', v_rpc_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ RPC failed: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COIN PLAY RESET COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was done:';
    RAISE NOTICE '   1. ✅ Cleared all participants';
    RAISE NOTICE '   2. ✅ Cleared all sessions';
    RAISE NOTICE '   3. ✅ Created fresh waiting sessions for all configs';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)';
    RAISE NOTICE '   2. Navigate to /coin-play page';
    RAISE NOTICE '   3. All sessions should be ready to join!';
    RAISE NOTICE '';
END $$;

SELECT '✅ RESET COMPLETE - All coin play sessions are now fresh and ready!' as status;

