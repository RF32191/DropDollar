-- ============================================================================
-- COMPLETE AUDIT SYSTEM VERIFICATION & TEST
-- Run this to verify EVERYTHING is working
-- ============================================================================

-- TEST 1: Check if table exists
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 1: Checking if table exists...';
    RAISE NOTICE '========================================';
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_audit_log') THEN
        RAISE NOTICE '✅ PASS: game_audit_log table EXISTS';
    ELSE
        RAISE NOTICE '❌ FAIL: game_audit_log table DOES NOT EXIST';
        RAISE NOTICE '   → Run DEPLOY_AUDIT_FINAL_FIX.sql first!';
        RAISE EXCEPTION 'Table does not exist. Cannot continue tests.';
    END IF;
END $$;

-- TEST 2: Check table structure (including threat_level column)
DO $$
DECLARE
    v_column_count INTEGER;
    v_has_threat_level BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 2: Checking table structure...';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 'game_audit_log';
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'game_audit_log' 
        AND column_name = 'threat_level'
    ) INTO v_has_threat_level;
    
    RAISE NOTICE 'Table has % columns', v_column_count;
    
    IF v_has_threat_level THEN
        RAISE NOTICE '✅ PASS: threat_level column EXISTS';
    ELSE
        RAISE NOTICE '❌ FAIL: threat_level column MISSING';
        RAISE NOTICE '   → Run DEPLOY_AUDIT_FINAL_FIX.sql to add it!';
    END IF;
END $$;

-- TEST 3: Check if function exists
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 3: Checking if function exists...';
    RAISE NOTICE '========================================';
    
    IF EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'frontend_log_game_completion'
    ) THEN
        RAISE NOTICE '✅ PASS: frontend_log_game_completion function EXISTS';
    ELSE
        RAISE NOTICE '❌ FAIL: frontend_log_game_completion function DOES NOT EXIST';
        RAISE NOTICE '   → Run DEPLOY_AUDIT_FINAL_FIX.sql first!';
    END IF;
END $$;

-- TEST 4: Check if admin user exists
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 4: Checking if admin user exists...';
    RAISE NOTICE '========================================';
    
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'rf32191@gmail.com';
    
    IF v_admin_id IS NOT NULL THEN
        RAISE NOTICE '✅ PASS: Admin user rf32191@gmail.com EXISTS';
        RAISE NOTICE '   User ID: %', v_admin_id;
    ELSE
        RAISE NOTICE '❌ FAIL: Admin user rf32191@gmail.com NOT FOUND';
        RAISE NOTICE '   → Make sure you created an account with this email';
    END IF;
END $$;

-- TEST 5: Check RLS policies
DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 5: Checking RLS policies...';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'game_audit_log';
    
    IF v_policy_count >= 3 THEN
        RAISE NOTICE '✅ PASS: Found % RLS policies (expected 3+)', v_policy_count;
    ELSE
        RAISE NOTICE '⚠️  WARNING: Found only % RLS policies (expected 3+)', v_policy_count;
    END IF;
END $$;

-- TEST 6: Insert a test record DIRECTLY (bypass RLS)
DO $$
DECLARE
    v_admin_id UUID;
    v_test_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 6: Inserting test record...';
    RAISE NOTICE '========================================';
    
    -- Get admin user
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'rf32191@gmail.com';
    
    IF v_admin_id IS NULL THEN
        RAISE NOTICE '⏭️  SKIPPED: No admin user found';
        RETURN;
    END IF;
    
    -- Delete old test records first
    DELETE FROM game_audit_log WHERE username = 'TEST_USER_VERIFICATION';
    
    -- Insert new test record
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
        threat_level,
        suspicious,
        created_at
    ) VALUES (
        v_admin_id,
        'TEST_USER_VERIFICATION',
        'rf32191@gmail.com',
        'test_game_verification',
        'practice',
        999,
        9.5,
        99.0,
        0,
        'NONE',
        false,
        NOW()
    ) RETURNING id INTO v_test_id;
    
    RAISE NOTICE '✅ PASS: Test record inserted successfully';
    RAISE NOTICE '   Record ID: %', v_test_id;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 ACTION REQUIRED:';
    RAISE NOTICE '   1. Go to Admin Dashboard → Audit Logs tab';
    RAISE NOTICE '   2. You should see: TEST_USER_VERIFICATION';
    RAISE NOTICE '   3. If you see it → Database works!';
    RAISE NOTICE '   4. If you DON''T see it → Frontend RLS issue';
    
END $$;

-- TEST 7: Count all audit logs
DO $$
DECLARE
    v_total_count INTEGER;
    v_test_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 7: Counting audit logs...';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO v_total_count FROM game_audit_log;
    SELECT COUNT(*) INTO v_test_count FROM game_audit_log WHERE username = 'TEST_USER_VERIFICATION';
    
    RAISE NOTICE 'Total audit logs in database: %', v_total_count;
    RAISE NOTICE 'Test records: %', v_test_count;
    
    IF v_total_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: Database has NO audit logs!';
        RAISE NOTICE '   This means games are NOT calling the audit function.';
    ELSIF v_total_count = v_test_count THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: Only test records exist!';
        RAISE NOTICE '   Games are NOT logging. Check frontend console for errors.';
    ELSE
        RAISE NOTICE '✅ Database has real game data!';
    END IF;
END $$;

-- TEST 8: Show recent audit logs
DO $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 8: Recent audit logs...';
    RAISE NOTICE '========================================';
    
    FOR v_record IN 
        SELECT username, game_type, score, score_rating, threat_level, created_at
        FROM game_audit_log
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE '%: % played % (score: %, rating: %/10, threat: %)',
            v_count,
            v_record.username,
            v_record.game_type,
            v_record.score,
            v_record.score_rating,
            v_record.threat_level;
    END LOOP;
    
    IF v_count = 0 THEN
        RAISE NOTICE 'No audit logs found.';
    END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 WHAT TO DO NEXT:';
    RAISE NOTICE '';
    RAISE NOTICE '1. CHECK ADMIN DASHBOARD:';
    RAISE NOTICE '   → Go to: https://www.drop-dollar.com/admin/dashboard';
    RAISE NOTICE '   → Click "Audit Logs" tab';
    RAISE NOTICE '   → Look for: TEST_USER_VERIFICATION';
    RAISE NOTICE '';
    RAISE NOTICE '2. IF YOU SEE THE TEST RECORD:';
    RAISE NOTICE '   ✅ Database is working!';
    RAISE NOTICE '   → Now play a game and check browser console (F12)';
    RAISE NOTICE '   → Look for: "✅ Game audited successfully"';
    RAISE NOTICE '';
    RAISE NOTICE '3. IF YOU DON''T SEE THE TEST RECORD:';
    RAISE NOTICE '   ❌ Frontend RLS issue';
    RAISE NOTICE '   → Check browser console for errors';
    RAISE NOTICE '   → Make sure you''re logged in as rf32191@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '4. TO TEST FRONTEND LOGGING:';
    RAISE NOTICE '   → Open browser console (F12)';
    RAISE NOTICE '   → Go to: https://www.drop-dollar.com/games/practice';
    RAISE NOTICE '   → Play Quick Click (fastest)';
    RAISE NOTICE '   → Watch console for audit messages';
    RAISE NOTICE '';
END $$;

