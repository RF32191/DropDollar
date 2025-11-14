-- ============================================================================
-- SHOW THE ACTUAL PROBLEM - Simple queries to reveal the UUID mismatch
-- ============================================================================

-- Show actual column types RIGHT NOW
SELECT 
  '🔍 COLUMN TYPES' as info,
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name IN ('hot_sell_sessions', 'hot_sell_participants', 'winner_takes_all_sessions', 'winner_takes_all_participants')
AND column_name IN ('id', 'session_id')
ORDER BY table_name, column_name;

-- Show sample actual data types
SELECT '📊 SAMPLE DATA TYPES - hot_sell_sessions' as info;
SELECT id, pg_typeof(id) as actual_type FROM hot_sell_sessions LIMIT 1;

SELECT '📊 SAMPLE DATA TYPES - hot_sell_participants' as info;
SELECT session_id, pg_typeof(session_id) as actual_type FROM hot_sell_participants LIMIT 1;

-- Test if we can compare them
DO $$
DECLARE
  test_session_id UUID;
  test_result BOOLEAN;
BEGIN
  SELECT id INTO test_session_id FROM hot_sell_sessions LIMIT 1;
  
  RAISE NOTICE '🧪 Testing comparison with session_id: %', test_session_id;
  RAISE NOTICE '🧪 Type of test_session_id: %', pg_typeof(test_session_id);
  
  -- Try the comparison that's failing
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM hot_sell_participants WHERE session_id = test_session_id
    ) INTO test_result;
    RAISE NOTICE '✅ Comparison works! Result: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Comparison FAILED: %', SQLERRM;
  END;
END $$;

-- Show ALL functions using these tables
SELECT 
  '📋 FUNCTIONS' as info,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname ILIKE '%hot_sell%' OR p.proname ILIKE '%join%')
ORDER BY p.proname;


