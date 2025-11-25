-- ============================================================================
-- SIMPLE AUDIT DIAGNOSTIC TEST
-- Run this to see what's wrong with your audit system
-- ============================================================================

-- TEST 1: Check if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'game_audit_log'
    ) THEN
        RAISE NOTICE '✅ TEST 1 PASSED: game_audit_log table EXISTS';
    ELSE
        RAISE NOTICE '❌ TEST 1 FAILED: game_audit_log table DOES NOT EXIST';
        RAISE NOTICE '   → You need to run DEPLOY_AUDIT_NO_DEADLOCK.sql first!';
    END IF;
END $$;

-- TEST 2: Check if frontend function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'frontend_log_game_completion'
    ) THEN
        RAISE NOTICE '✅ TEST 2 PASSED: frontend_log_game_completion function EXISTS';
    ELSE
        RAISE NOTICE '❌ TEST 2 FAILED: frontend_log_game_completion function DOES NOT EXIST';
        RAISE NOTICE '   → You need to run DEPLOY_AUDIT_NO_DEADLOCK.sql first!';
    END IF;
END $$;

-- TEST 3: Check if admin user exists
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'rf32191@gmail.com';
    
    IF v_admin_id IS NOT NULL THEN
        RAISE NOTICE '✅ TEST 3 PASSED: Admin user rf32191@gmail.com EXISTS (ID: %)', v_admin_id;
    ELSE
        RAISE NOTICE '❌ TEST 3 FAILED: Admin user rf32191@gmail.com NOT FOUND';
        RAISE NOTICE '   → Make sure you have created an account with this email';
    END IF;
END $$;

-- TEST 4: Try to insert a test record
DO $$
DECLARE
    v_admin_id UUID;
    v_test_id UUID;
BEGIN
    -- Get admin user
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'rf32191@gmail.com' LIMIT 1;
    
    IF v_admin_id IS NULL THEN
        RAISE NOTICE '⏭️  TEST 4 SKIPPED: No admin user found';
        RETURN;
    END IF;
    
    -- Try to insert test record
    BEGIN
        INSERT INTO game_audit_log (
            user_id,
            username,
            email,
            game_type,
            game_mode,
            score,
            score_rating,
            accuracy,
            cheat_score,
            threat_level
        ) VALUES (
            v_admin_id,
            'TEST_USER',
            'rf32191@gmail.com',
            'test_game',
            'practice',
            1000,
            8.5,
            95.0,
            0,
            'NONE'
        ) RETURNING id INTO v_test_id;
        
        RAISE NOTICE '✅ TEST 4 PASSED: Successfully inserted test record (ID: %)', v_test_id;
        RAISE NOTICE '   → Check your Admin Dashboard → Audit Logs tab NOW!';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST 4 FAILED: Could not insert test record';
        RAISE NOTICE '   → Error: %', SQLERRM;
    END;
END $$;

-- TEST 5: Check RLS policies
DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'game_audit_log';
    
    IF v_policy_count > 0 THEN
        RAISE NOTICE '✅ TEST 5 PASSED: Found % RLS policies on game_audit_log', v_policy_count;
    ELSE
        RAISE NOTICE '⚠️  TEST 5 WARNING: No RLS policies found (table might not exist)';
    END IF;
END $$;

-- TEST 6: Count existing audit logs
DO $$
DECLARE
    v_log_count INTEGER;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO v_log_count FROM game_audit_log;
        RAISE NOTICE '✅ TEST 6 PASSED: Found % existing audit logs in database', v_log_count;
        
        IF v_log_count = 0 THEN
            RAISE NOTICE '   → No logs yet. Play a game to create one!';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST 6 FAILED: Could not count audit logs';
        RAISE NOTICE '   → Error: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 DIAGNOSTIC SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'If ALL tests passed:';
    RAISE NOTICE '  1. Go to https://www.drop-dollar.com/games/practice';
    RAISE NOTICE '  2. Open browser console (F12)';
    RAISE NOTICE '  3. Play any game';
    RAISE NOTICE '  4. Look for: "✅ [GameAudit] Successfully logged game"';
    RAISE NOTICE '  5. Go to Admin Dashboard → Audit Logs tab';
    RAISE NOTICE '';
    RAISE NOTICE 'If ANY test failed:';
    RAISE NOTICE '  → Run DEPLOY_AUDIT_NO_DEADLOCK.sql first!';
    RAISE NOTICE '';
END $$;

