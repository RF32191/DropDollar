-- ============================================================================
-- RESET COMPLETED COIN PLAY SESSIONS
-- ============================================================================
-- This script resets all completed coin play sessions back to waiting status
-- Use this if sessions are stuck in "completed" status
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 RESETTING COMPLETED COIN PLAY SESSIONS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Check current status
-- ============================================================================

DO $$
DECLARE
    v_completed_count INTEGER;
    v_active_count INTEGER;
    v_waiting_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current Session Status:';
    
    SELECT COUNT(*) INTO v_completed_count FROM public.coin_play_sessions WHERE status = 'completed';
    SELECT COUNT(*) INTO v_active_count FROM public.coin_play_sessions WHERE status = 'active';
    SELECT COUNT(*) INTO v_waiting_count FROM public.coin_play_sessions WHERE status = 'waiting';
    
    RAISE NOTICE '   Completed: %', v_completed_count;
    RAISE NOTICE '   Active: %', v_active_count;
    RAISE NOTICE '   Waiting: %', v_waiting_count;
END $$;

-- ============================================================================
-- STEP 2: Clear participants from completed sessions
-- ============================================================================

DO $$
DECLARE
    v_participant_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Clearing participants from completed sessions...';
    
    -- Count participants in completed sessions
    SELECT COUNT(*) INTO v_participant_count
    FROM public.coin_play_participants p
    JOIN public.coin_play_sessions s ON p.session_id = s.id
    WHERE s.status = 'completed';
    
    RAISE NOTICE '   Found % participants in completed sessions', v_participant_count;
    
    -- Delete participants from completed sessions
    DELETE FROM public.coin_play_participants
    WHERE session_id IN (
        SELECT id FROM public.coin_play_sessions WHERE status = 'completed'
    );
    
    RAISE NOTICE '✅ Cleared participants from completed sessions';
END $$;

-- ============================================================================
-- STEP 3: Reset completed sessions to waiting
-- ============================================================================

DO $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Resetting completed sessions to waiting...';
    
    -- Reset completed sessions to waiting status
    UPDATE public.coin_play_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_prize = NULL,
        platform_fee = NULL,
        completed_at = NULL,
        updated_at = NOW()
    WHERE status = 'completed';
    
    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Reset % completed sessions to waiting', v_reset_count;
END $$;

-- ============================================================================
-- STEP 4: Ensure we have one waiting session per config
-- ============================================================================

DO $$
DECLARE
    v_created_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎲 Ensuring one waiting session per config...';
    
    -- Create waiting sessions for configs that don't have one
    INSERT INTO public.coin_play_sessions (config_id, status, prize_pool, participants_count, timer_duration)
    SELECT 
        c.id,
        'waiting',
        0,
        0,
        120
    FROM public.coin_play_configs c
    WHERE NOT EXISTS (
        SELECT 1 FROM public.coin_play_sessions s
        WHERE s.config_id = c.id AND s.status = 'waiting'
    );
    
    GET DIAGNOSTICS v_created_count = ROW_COUNT;
    
    IF v_created_count > 0 THEN
        RAISE NOTICE '✅ Created % new waiting sessions', v_created_count;
    ELSE
        RAISE NOTICE '✅ All configs already have waiting sessions';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Verify reset
-- ============================================================================

DO $$
DECLARE
    v_completed_count INTEGER;
    v_active_count INTEGER;
    v_waiting_count INTEGER;
    v_total_configs INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Verifying reset...';
    
    SELECT COUNT(*) INTO v_completed_count FROM public.coin_play_sessions WHERE status = 'completed';
    SELECT COUNT(*) INTO v_active_count FROM public.coin_play_sessions WHERE status = 'active';
    SELECT COUNT(*) INTO v_waiting_count FROM public.coin_play_sessions WHERE status = 'waiting';
    SELECT COUNT(*) INTO v_total_configs FROM public.coin_play_configs;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Final Status:';
    RAISE NOTICE '   Completed: %', v_completed_count;
    RAISE NOTICE '   Active: %', v_active_count;
    RAISE NOTICE '   Waiting: %', v_waiting_count;
    RAISE NOTICE '   Total Configs: %', v_total_configs;
    
    IF v_completed_count = 0 AND v_waiting_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ RESET SUCCESSFUL!';
        RAISE NOTICE '   All completed sessions have been reset';
        RAISE NOTICE '   All sessions are now in waiting status';
        RAISE NOTICE '   Ready for new games!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Reset completed but status may need review';
    END IF;
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RESET COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was done:';
    RAISE NOTICE '   1. ✅ Cleared participants from completed sessions';
    RAISE NOTICE '   2. ✅ Reset completed sessions to waiting status';
    RAISE NOTICE '   3. ✅ Created waiting sessions for missing configs';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)';
    RAISE NOTICE '   2. Navigate to /coin-play page';
    RAISE NOTICE '   3. All sessions should be ready to join!';
    RAISE NOTICE '';
END $$;

SELECT '✅ COMPLETED SESSIONS RESET - All sessions are now waiting!' as status;

