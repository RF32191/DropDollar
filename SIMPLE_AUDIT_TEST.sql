-- ============================================================================
-- SIMPLEST POSSIBLE TEST - See Exact Error
-- ============================================================================

-- Test 1: Call function and see result
DO $$
DECLARE
    v_result JSONB;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Testing frontend_log_game_completion...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Call the function
    SELECT frontend_log_game_completion(
        'simple_test',
        'practice',
        1234,
        85.5,
        0.35,
        60,
        '{"test": "simple"}'::jsonb
    ) INTO v_result;
    
    RAISE NOTICE 'Result: %', v_result;
    RAISE NOTICE '';
    
    IF v_result->>'success' = 'true' THEN
        RAISE NOTICE '✅ SUCCESS!';
        RAISE NOTICE 'Audit ID: %', v_result->>'audit_id';
    ELSE
        RAISE NOTICE '❌ FAILED!';
        RAISE NOTICE 'Message: %', v_result->>'message';
    END IF;
    RAISE NOTICE '';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR OCCURRED!';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Detail: %', SQLSTATE;
END $$;

-- Test 2: Check if any record was created
SELECT 
    COUNT(*) as new_logs
FROM game_audit_log
WHERE game_type = 'simple_test';

-- Test 3: Show the most recent log
SELECT 
    username,
    email,
    game_type,
    score,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 3;
