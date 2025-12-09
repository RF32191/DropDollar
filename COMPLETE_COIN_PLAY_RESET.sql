-- ============================================================================
-- COMPLETE COIN PLAY RESET
-- ============================================================================
-- This script does a FULL reset of all coin play sessions:
-- 1. Deletes ALL participants
-- 2. Deletes ALL sessions
-- 3. Recalculates and syncs participant counts
-- 4. Creates fresh waiting sessions for all configs
-- 5. Verifies everything is correct
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 COMPLETE COIN PLAY RESET';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Delete ALL participants
-- ============================================================================

DO $$
DECLARE
    v_participant_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Step 1: Deleting ALL participants...';
    
    SELECT COUNT(*) INTO v_participant_count FROM public.coin_play_participants;
    RAISE NOTICE '   Found % total participants', v_participant_count;
    
    DELETE FROM public.coin_play_participants;
    
    RAISE NOTICE '✅ Deleted all participants';
END $$;

-- ============================================================================
-- STEP 2: Delete ALL sessions
-- ============================================================================

DO $$
DECLARE
    v_session_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Step 2: Deleting ALL sessions...';
    
    SELECT COUNT(*) INTO v_session_count FROM public.coin_play_sessions;
    RAISE NOTICE '   Found % total sessions', v_session_count;
    
    DELETE FROM public.coin_play_sessions;
    
    RAISE NOTICE '✅ Deleted all sessions';
END $$;

-- ============================================================================
-- STEP 3: Verify configs exist
-- ============================================================================

DO $$
DECLARE
    v_config_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Step 3: Verifying configs...';
    
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
-- STEP 4: Create fresh waiting sessions for ALL configs
-- ============================================================================

DO $$
DECLARE
    v_created_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎲 Step 4: Creating fresh waiting sessions for all configs...';
    
    -- Create one waiting session per config with zero participants and zero prize pool
    INSERT INTO public.coin_play_sessions (
        config_id, 
        status, 
        prize_pool, 
        participants_count, 
        timer_duration,
        timer_started_at,
        winner_user_id,
        winner_prize,
        platform_fee,
        completed_at
    )
    SELECT 
        id,
        'waiting',
        0,
        0,
        120, -- 2 minutes
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    FROM public.coin_play_configs;
    
    GET DIAGNOSTICS v_created_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Created % fresh waiting sessions', v_created_count;
END $$;

-- ============================================================================
-- STEP 5: Verify participant counts are zero for all sessions
-- ============================================================================

DO $$
DECLARE
    v_bad_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Step 5: Verifying participant counts...';
    
    -- Check if any sessions have non-zero participant counts
    SELECT COUNT(*) INTO v_bad_count
    FROM public.coin_play_sessions
    WHERE participants_count != 0;
    
    IF v_bad_count > 0 THEN
        RAISE NOTICE '   ⚠️  Found % sessions with non-zero participant counts, fixing...', v_bad_count;
        
        -- Recalculate participant counts from actual data
        UPDATE public.coin_play_sessions s
        SET participants_count = (
            SELECT COUNT(*) 
            FROM public.coin_play_participants p 
            WHERE p.session_id = s.id
        );
        
        RAISE NOTICE '✅ Fixed participant counts';
    ELSE
        RAISE NOTICE '✅ All participant counts are correct (zero)';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Verify prize pools are zero for all sessions
-- ============================================================================

DO $$
DECLARE
    v_bad_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Step 6: Verifying prize pools...';
    
    -- Check if any sessions have non-zero prize pools
    SELECT COUNT(*) INTO v_bad_count
    FROM public.coin_play_sessions
    WHERE prize_pool != 0;
    
    IF v_bad_count > 0 THEN
        RAISE NOTICE '   ⚠️  Found % sessions with non-zero prize pools, resetting...', v_bad_count;
        
        UPDATE public.coin_play_sessions
        SET prize_pool = 0
        WHERE prize_pool != 0;
        
        RAISE NOTICE '✅ Reset prize pools to zero';
    ELSE
        RAISE NOTICE '✅ All prize pools are zero';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Final verification
-- ============================================================================

DO $$
DECLARE
    v_session_count INTEGER;
    v_participant_count INTEGER;
    v_waiting_count INTEGER;
    v_active_count INTEGER;
    v_completed_count INTEGER;
    v_config_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Step 7: Final verification...';
    
    SELECT COUNT(*) INTO v_session_count FROM public.coin_play_sessions;
    SELECT COUNT(*) INTO v_participant_count FROM public.coin_play_participants;
    SELECT COUNT(*) INTO v_waiting_count FROM public.coin_play_sessions WHERE status = 'waiting';
    SELECT COUNT(*) INTO v_active_count FROM public.coin_play_sessions WHERE status = 'active';
    SELECT COUNT(*) INTO v_completed_count FROM public.coin_play_sessions WHERE status = 'completed';
    SELECT COUNT(*) INTO v_config_count FROM public.coin_play_configs;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Final Status:';
    RAISE NOTICE '   Total Sessions: %', v_session_count;
    RAISE NOTICE '   Waiting Sessions: %', v_waiting_count;
    RAISE NOTICE '   Active Sessions: %', v_active_count;
    RAISE NOTICE '   Completed Sessions: %', v_completed_count;
    RAISE NOTICE '   Total Participants: %', v_participant_count;
    RAISE NOTICE '   Total Configs: %', v_config_count;
    
    IF v_session_count = v_config_count 
       AND v_waiting_count = v_config_count 
       AND v_participant_count = 0 
       AND v_active_count = 0 
       AND v_completed_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ COMPLETE RESET SUCCESSFUL!';
        RAISE NOTICE '   All sessions are fresh and waiting';
        RAISE NOTICE '   All participants cleared';
        RAISE NOTICE '   All prize pools reset';
        RAISE NOTICE '   Ready for new games!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Reset completed but verification shows issues:';
        IF v_session_count != v_config_count THEN
            RAISE NOTICE '   ⚠️  Session count (%) does not match config count (%)', v_session_count, v_config_count;
        END IF;
        IF v_waiting_count != v_config_count THEN
            RAISE NOTICE '   ⚠️  Not all sessions are waiting (%) waiting, (%) configs', v_waiting_count, v_config_count;
        END IF;
        IF v_participant_count > 0 THEN
            RAISE NOTICE '   ⚠️  % participants still exist', v_participant_count;
        END IF;
        IF v_active_count > 0 THEN
            RAISE NOTICE '   ⚠️  % active sessions still exist', v_active_count;
        END IF;
        IF v_completed_count > 0 THEN
            RAISE NOTICE '   ⚠️  % completed sessions still exist', v_completed_count;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Show sample sessions by game type
-- ============================================================================

SELECT 
    '=== Sample Sessions by Game Type ===' as info;

SELECT 
    c.game_type,
    COUNT(s.id) as session_count,
    SUM(s.participants_count) as total_participants,
    SUM(s.prize_pool) as total_prize_pool
FROM public.coin_play_configs c
LEFT JOIN public.coin_play_sessions s ON c.id = s.config_id
GROUP BY c.game_type
ORDER BY c.game_type;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPLETE COIN PLAY RESET FINISHED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was done:';
    RAISE NOTICE '   1. ✅ Deleted ALL participants';
    RAISE NOTICE '   2. ✅ Deleted ALL sessions';
    RAISE NOTICE '   3. ✅ Created fresh waiting sessions for all configs';
    RAISE NOTICE '   4. ✅ Verified participant counts are zero';
    RAISE NOTICE '   5. ✅ Verified prize pools are zero';
    RAISE NOTICE '   6. ✅ All sessions reset to waiting status';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)';
    RAISE NOTICE '   2. Navigate to /coin-play page';
    RAISE NOTICE '   3. All sessions should be fresh and ready to join!';
    RAISE NOTICE '';
END $$;

SELECT '✅ COMPLETE RESET FINISHED - All coin play listings are now fresh!' as status;

