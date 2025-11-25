-- ============================================================================
-- VERIFICATION SCRIPT - Check if Audit System is Deployed
-- ============================================================================
-- Run this in Supabase SQL Editor to see if everything is set up
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 CHECKING AUDIT SYSTEM DEPLOYMENT';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 1: Tables
-- ============================================================================

DO $$
DECLARE
    v_game_audit_log BOOLEAN;
    v_game_security_alerts BOOLEAN;
    v_admin_notifications BOOLEAN;
BEGIN
    RAISE NOTICE '📋 CHECKING TABLES:';
    RAISE NOTICE '';
    
    -- Check game_audit_log
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_audit_log'
    ) INTO v_game_audit_log;
    
    IF v_game_audit_log THEN
        RAISE NOTICE '   ✅ game_audit_log EXISTS';
    ELSE
        RAISE NOTICE '   ❌ game_audit_log MISSING - DEPLOY SQL FILE!';
    END IF;
    
    -- Check game_security_alerts
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_security_alerts'
    ) INTO v_game_security_alerts;
    
    IF v_game_security_alerts THEN
        RAISE NOTICE '   ✅ game_security_alerts EXISTS';
    ELSE
        RAISE NOTICE '   ❌ game_security_alerts MISSING';
    END IF;
    
    -- Check admin_notifications
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_notifications'
    ) INTO v_admin_notifications;
    
    IF v_admin_notifications THEN
        RAISE NOTICE '   ✅ admin_notifications EXISTS';
    ELSE
        RAISE NOTICE '   ❌ admin_notifications MISSING';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 2: Functions
-- ============================================================================

DO $$
DECLARE
    v_frontend_log BOOLEAN;
    v_log_game_play BOOLEAN;
    v_detect_cheating BOOLEAN;
    v_notify_admin BOOLEAN;
BEGIN
    RAISE NOTICE '⚙️ CHECKING FUNCTIONS:';
    RAISE NOTICE '';
    
    -- Check frontend_log_game_completion
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'frontend_log_game_completion'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO v_frontend_log;
    
    IF v_frontend_log THEN
        RAISE NOTICE '   ✅ frontend_log_game_completion EXISTS';
    ELSE
        RAISE NOTICE '   ❌ frontend_log_game_completion MISSING - GAMES CANNOT LOG!';
    END IF;
    
    -- Check log_game_play
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'log_game_play'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO v_log_game_play;
    
    IF v_log_game_play THEN
        RAISE NOTICE '   ✅ log_game_play EXISTS';
    ELSE
        RAISE NOTICE '   ❌ log_game_play MISSING';
    END IF;
    
    -- Check detect_game_specific_cheating
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'detect_game_specific_cheating'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO v_detect_cheating;
    
    IF v_detect_cheating THEN
        RAISE NOTICE '   ✅ detect_game_specific_cheating EXISTS';
    ELSE
        RAISE NOTICE '   ❌ detect_game_specific_cheating MISSING';
    END IF;
    
    -- Check notify_admin_high_score
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'notify_admin_high_score'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO v_notify_admin;
    
    IF v_notify_admin THEN
        RAISE NOTICE '   ✅ notify_admin_high_score EXISTS';
    ELSE
        RAISE NOTICE '   ❌ notify_admin_high_score MISSING';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 3: Views
-- ============================================================================

DO $$
DECLARE
    v_all_games BOOLEAN;
    v_detailed BOOLEAN;
BEGIN
    RAISE NOTICE '👁️ CHECKING VIEWS:';
    RAISE NOTICE '';
    
    -- Check admin_all_games_stats
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_all_games_stats'
    ) INTO v_all_games;
    
    IF v_all_games THEN
        RAISE NOTICE '   ✅ admin_all_games_stats EXISTS';
    ELSE
        RAISE NOTICE '   ❌ admin_all_games_stats MISSING';
    END IF;
    
    -- Check admin_detailed_audit_view
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_detailed_audit_view'
    ) INTO v_detailed;
    
    IF v_detailed THEN
        RAISE NOTICE '   ✅ admin_detailed_audit_view EXISTS';
    ELSE
        RAISE NOTICE '   ❌ admin_detailed_audit_view MISSING';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 4: Data
-- ============================================================================

DO $$
DECLARE
    v_audit_count INTEGER := 0;
    v_notification_count INTEGER := 0;
BEGIN
    RAISE NOTICE '📊 CHECKING DATA:';
    RAISE NOTICE '';
    
    -- Check if we can query the table
    BEGIN
        SELECT COUNT(*) INTO v_audit_count FROM public.game_audit_log;
        RAISE NOTICE '   ✅ game_audit_log contains % games', v_audit_count;
        
        IF v_audit_count = 0 THEN
            RAISE NOTICE '   ℹ️ No games logged yet - play a game to test!';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Cannot query game_audit_log: %', SQLERRM;
    END;
    
    -- Check notifications
    BEGIN
        SELECT COUNT(*) INTO v_notification_count FROM public.admin_notifications;
        RAISE NOTICE '   ✅ admin_notifications contains % notifications', v_notification_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Cannot query admin_notifications: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FINAL VERDICT
-- ============================================================================

DO $$
DECLARE
    v_tables_ok BOOLEAN;
    v_functions_ok BOOLEAN;
    v_views_ok BOOLEAN;
    v_all_ok BOOLEAN;
BEGIN
    -- Check if all critical components exist
    SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_audit_log')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications')
    INTO v_tables_ok;
    
    SELECT 
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'frontend_log_game_completion')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_game_play')
    INTO v_functions_ok;
    
    SELECT 
        EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_detailed_audit_view')
    INTO v_views_ok;
    
    v_all_ok := v_tables_ok AND v_functions_ok AND v_views_ok;
    
    RAISE NOTICE '========================================';
    IF v_all_ok THEN
        RAISE NOTICE '✅ AUDIT SYSTEM IS DEPLOYED!';
        RAISE NOTICE '';
        RAISE NOTICE '🎮 You can now:';
        RAISE NOTICE '   1. Play any game';
        RAISE NOTICE '   2. Check admin dashboard';
        RAISE NOTICE '   3. See game results in Audit Logs tab';
    ELSE
        RAISE NOTICE '❌ AUDIT SYSTEM NOT DEPLOYED!';
        RAISE NOTICE '';
        RAISE NOTICE '📦 ACTION REQUIRED:';
        RAISE NOTICE '   1. Go to Supabase Dashboard';
        RAISE NOTICE '   2. Click SQL Editor';
        RAISE NOTICE '   3. Run: DEPLOY_AUDIT_NO_DEADLOCK.sql';
        RAISE NOTICE '';
        RAISE NOTICE '🚨 MISSING COMPONENTS:';
        IF NOT v_tables_ok THEN
            RAISE NOTICE '   ❌ Tables not created';
        END IF;
        IF NOT v_functions_ok THEN
            RAISE NOTICE '   ❌ Functions not created';
        END IF;
        IF NOT v_views_ok THEN
            RAISE NOTICE '   ❌ Views not created';
        END IF;
    END IF;
    RAISE NOTICE '========================================';
END $$;

