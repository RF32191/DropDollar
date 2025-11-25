-- ============================================================================
-- CHECK WHAT ADMIN DASHBOARD WILL SEE
-- ============================================================================
-- Run this to see exactly what data is available for the admin dashboard
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 CHECKING ADMIN DASHBOARD DATA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Check 1: Can we query the table directly?
DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 CHECK 1: Can we query game_audit_log?';
    
    BEGIN
        SELECT COUNT(*) INTO v_count FROM public.game_audit_log;
        RAISE NOTICE '   ✅ YES! Found % games', v_count;
        
        IF v_count = 0 THEN
            RAISE NOTICE '   ⚠️ Table is empty - no games played yet';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '   ❌ NO! Error: %', SQLERRM;
            RAISE NOTICE '   💡 Run DEPLOY_AUDIT_NO_DEADLOCK.sql first!';
    END;
    RAISE NOTICE '';
END $$;

-- Check 2: Can we query the view?
DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 CHECK 2: Can we query admin_detailed_audit_view?';
    
    BEGIN
        SELECT COUNT(*) INTO v_count FROM admin_detailed_audit_view;
        RAISE NOTICE '   ✅ YES! Found % games', v_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '   ❌ NO! Error: %', SQLERRM;
    END;
    RAISE NOTICE '';
END $$;

-- Check 3: Show actual data
DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.game_audit_log;
    
    IF v_count > 0 THEN
        RAISE NOTICE '📊 SHOWING LATEST GAMES:';
        RAISE NOTICE '';
    END IF;
END $$;

-- Show the data
SELECT 
    username,
    game_type,
    game_mode,
    score,
    score_rating,
    cheat_score,
    CASE 
        WHEN cheat_score >= 80 THEN 'CRITICAL'
        WHEN cheat_score >= 60 THEN 'HIGH'
        WHEN cheat_score >= 40 THEN 'MEDIUM'
        WHEN cheat_score >= 20 THEN 'LOW'
        ELSE 'CLEAN'
    END as threat_level,
    created_at
FROM public.game_audit_log 
ORDER BY created_at DESC 
LIMIT 10;

-- Check 4: Check RLS policies
DO $$
DECLARE
    v_policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 CHECK 3: RLS Policies on game_audit_log';
    
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'game_audit_log';
    
    IF v_policy_count > 0 THEN
        RAISE NOTICE '   ✅ Found % RLS policies', v_policy_count;
    ELSE
        RAISE NOTICE '   ⚠️ No RLS policies found';
    END IF;
    RAISE NOTICE '';
END $$;

-- Show RLS policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'game_audit_log';

-- Final summary
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_data_count INTEGER := 0;
    v_admin_user_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📋 SUMMARY';
    RAISE NOTICE '========================================';
    
    -- Check table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_audit_log'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
        SELECT COUNT(*) INTO v_data_count FROM public.game_audit_log;
        RAISE NOTICE 'Table Status: ✅ EXISTS';
        RAISE NOTICE 'Data Count: % games', v_data_count;
        
        IF v_data_count = 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE '⚠️ NO DATA YET!';
            RAISE NOTICE '';
            RAISE NOTICE '📝 TODO:';
            RAISE NOTICE '   Option 1: Run TEST_INSERT_GAME.sql to add test data';
            RAISE NOTICE '   Option 2: Play a game on the website';
        ELSE
            RAISE NOTICE '';
            RAISE NOTICE '✅ DATA EXISTS!';
            RAISE NOTICE '';
            RAISE NOTICE 'If admin dashboard still shows no data:';
            RAISE NOTICE '   1. Check you are logged in as rf32191@gmail.com';
            RAISE NOTICE '   2. Check browser console for errors';
            RAISE NOTICE '   3. Hard refresh the page (Cmd+Shift+R)';
        END IF;
    ELSE
        RAISE NOTICE 'Table Status: ❌ DOES NOT EXIST';
        RAISE NOTICE '';
        RAISE NOTICE '🚨 ACTION REQUIRED:';
        RAISE NOTICE '   Run DEPLOY_AUDIT_NO_DEADLOCK.sql in SQL Editor';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

