-- ============================================================================
-- DIAGNOSE AND FIX ALL TEXT = UUID ERRORS
-- ============================================================================
-- This will show us the actual column types and fix all comparisons
-- ============================================================================

-- ============================================================================
-- STEP 1: Show actual column types for all session tables
-- ============================================================================

SELECT 'hot_sell_sessions columns:' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_sessions'
ORDER BY ordinal_position;

SELECT 'winner_takes_all_sessions columns:' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'winner_takes_all_sessions'
ORDER BY ordinal_position;

SELECT 'one_v_one_sessions columns:' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'one_v_one_sessions'
ORDER BY ordinal_position;

SELECT 'hot_sell_participants columns:' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_participants'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check for any existing problematic functions
-- ============================================================================

-- Show all functions that might have UUID issues
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%hot_sell%'
   OR proname LIKE '%winner_takes_all%'
   OR proname LIKE '%1v1%'
   OR proname LIKE '%get_all%'
ORDER BY proname;

-- ============================================================================
-- STEP 3: Create diagnostic test function
-- ============================================================================

DROP FUNCTION IF EXISTS test_session_query() CASCADE;

CREATE OR REPLACE FUNCTION test_session_query()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Try to get a Hot Sell session
  BEGIN
    SELECT id::TEXT INTO result
    FROM public.hot_sell_sessions
    LIMIT 1;
    
    RETURN 'Hot Sell query works! Sample ID: ' || COALESCE(result, 'No sessions');
  EXCEPTION WHEN OTHERS THEN
    RETURN 'Hot Sell query failed: ' || SQLERRM;
  END;
END;
$$;

SELECT test_session_query();

-- ============================================================================
-- DONE - Review the output above to see actual column types
-- ============================================================================

