-- ============================================================================
-- CHECK WHAT FAILED
-- ============================================================================

-- Check 1: Did the INSERT policy get created?
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'game_audit_log'
ORDER BY policyname;

-- Check 2: Does the function exist?
SELECT 
    proname,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'frontend_log_game_completion';

-- Check 3: Try calling it directly and capture result
DO $$
DECLARE
    v_result JSONB;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    RAISE NOTICE 'Current user ID: %', v_user_id;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ NOT AUTHENTICATED!';
        RAISE NOTICE 'You must be logged in to Supabase Dashboard';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Authenticated';
    RAISE NOTICE '';
    RAISE NOTICE 'Calling function...';
    
    -- Try to call it
    BEGIN
        SELECT frontend_log_game_completion(
            'debug_test',
            'practice',
            5555,
            85.5,
            0.5,
            60,
            '{"test": "debug"}'::jsonb
        ) INTO v_result;
        
        RAISE NOTICE 'Result: %', v_result;
        
        IF v_result->>'success' = 'true' THEN
            RAISE NOTICE '✅ Function returned success!';
        ELSE
            RAISE NOTICE '❌ Function returned failure';
            RAISE NOTICE 'Message: %', v_result->>'message';
            RAISE NOTICE 'Error code: %', v_result->>'error_code';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ EXCEPTION OCCURRED';
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'State: %', SQLSTATE;
    END;
END $$;

-- Check 4: Look for any debug_test record
SELECT COUNT(*) as debug_test_count
FROM game_audit_log
WHERE game_type = 'debug_test';

-- Check 5: Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'game_audit_log';

