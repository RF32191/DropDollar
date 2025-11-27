-- =====================================================
-- DIAGNOSE AUDIT SYSTEM - Run this in Supabase SQL Editor
-- This will show you exactly what's working and what's missing
-- =====================================================

-- Clean output
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║               AUDIT SYSTEM DIAGNOSTIC REPORT                  ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- Test 1: Check if game_audit_log table exists
SELECT 
    '1️⃣ TABLE CHECK' AS test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_audit_log' AND table_schema = 'public')
        THEN '✅ game_audit_log table EXISTS'
        ELSE '❌ game_audit_log table MISSING - Run the SQL deployment script!'
    END AS result;

-- Test 2: Check table columns
SELECT 
    '2️⃣ COLUMNS CHECK' AS test_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'game_audit_log' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Check if the RPC function exists
SELECT 
    '3️⃣ FUNCTION CHECK' AS test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
              AND p.proname = 'frontend_log_game_completion'
        )
        THEN '✅ frontend_log_game_completion function EXISTS'
        ELSE '❌ frontend_log_game_completion function MISSING - Run the SQL deployment script!'
    END AS result;

-- Test 4: Check RLS policies on game_audit_log
SELECT 
    '4️⃣ RLS POLICY CHECK' AS test_name,
    policyname,
    cmd,
    qual::text
FROM pg_policies 
WHERE tablename = 'game_audit_log';

-- Test 5: Count existing records
SELECT 
    '5️⃣ EXISTING DATA' AS test_name,
    COUNT(*) AS total_audit_logs,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24_hours,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS last_1_hour
FROM public.game_audit_log;

-- Test 6: Show most recent audit logs
SELECT 
    '6️⃣ RECENT LOGS' AS test_name,
    id,
    username,
    game_type,
    score,
    score_rating,
    created_at
FROM public.game_audit_log
ORDER BY created_at DESC
LIMIT 5;

-- Test 7: Test the function directly
DO $$
DECLARE
    test_result JSONB;
    test_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '7️⃣ TESTING FUNCTION DIRECTLY...';
    
    -- Try to call the function
    BEGIN
        SELECT frontend_log_game_completion(
            'DIAGNOSTIC_TEST',
            'practice',
            12345,
            95.0,
            0.25,
            60,
            '{"test": "diagnostic_run"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE '✅ Function call successful!';
        RAISE NOTICE 'Result: %', test_result;
        
        -- Check if record was inserted
        SELECT id INTO test_id
        FROM public.game_audit_log
        WHERE game_type = 'DIAGNOSTIC_TEST'
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF test_id IS NOT NULL THEN
            RAISE NOTICE '✅ Record inserted successfully: %', test_id;
        ELSE
            RAISE NOTICE '⚠️ Function returned but no record found in table';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Function call failed: %', SQLERRM;
        RAISE NOTICE 'This means the SQL deployment script was not run correctly.';
    END;
END $$;

-- Test 8: Check admin user exists
SELECT 
    '8️⃣ ADMIN USER CHECK' AS test_name,
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'rf32191@gmail.com';

-- Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'If you see ❌ anywhere above, the SQL backend is not properly deployed.';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run DEPLOY_AUDIT_NO_DEADLOCK.sql in Supabase SQL Editor';
    RAISE NOTICE '2. Wait for Vercel to deploy the latest frontend (after git push)';
    RAISE NOTICE '3. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)';
    RAISE NOTICE '4. Play a game and check browser console for audit messages';
    RAISE NOTICE '';
    RAISE NOTICE 'Look for these console messages when playing:';
    RAISE NOTICE '  🚀🚀🚀 [QuickClick] v3.0 AUDIT VERSION LOADED 🚀🚀🚀';
    RAISE NOTICE '  🎮 GAME AUDIT LOGGING STARTED';
    RAISE NOTICE '  ✅ BACKEND SUCCESS - AUDIT LOGGED!';
    RAISE NOTICE '';
END $$;

