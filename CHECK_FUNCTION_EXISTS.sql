-- ============================================================================
-- CHECK IF FUNCTIONS EXIST AND THEIR DEFINITIONS
-- ============================================================================

-- Check if frontend_log_game_completion exists
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    prosecdef as is_security_definer,
    provolatile as volatility
FROM pg_proc
WHERE proname = 'frontend_log_game_completion';

-- Check if log_game_play exists
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'log_game_play';

-- Check if detect_game_specific_cheating exists
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'detect_game_specific_cheating';

-- Check if game_audit_log table exists and structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'game_audit_log'
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECK RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'If functions exist: ✅ Functions deployed';
    RAISE NOTICE 'If missing: ❌ Need to run FIX_AUDIT_WITHOUT_PROFILES.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'If table exists: ✅ Table ready';
    RAISE NOTICE 'If missing: ❌ Need to run DEPLOY_AUDIT_FINAL_FIX.sql';
    RAISE NOTICE '';
END $$;

