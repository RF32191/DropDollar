-- ============================================================================
-- DIAGNOSTIC: Check current function definition
-- ============================================================================

-- Check if function exists and its return type
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_result(p.oid) as return_type,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_or_create_conversation'
AND n.nspname = 'public';

-- This will show you what the function currently looks like
-- If it shows RETURNS uuid instead of RETURNS TABLE, the SQL didn't run properly

