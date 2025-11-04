-- ============================================================================
-- FIND TEXT = UUID ERROR SOURCE
-- ============================================================================
-- This will show us EXACTLY where the error is coming from
-- ============================================================================

-- ============================================================================
-- STEP 1: Show ALL functions that might have the issue
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%hot_sell%'
    OR p.proname LIKE '%winner%'
    OR p.proname LIKE '%1v1%'
    OR p.proname LIKE '%spend%'
    OR p.proname LIKE '%check_rate%'
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 2: Check for TEXT columns where we expect UUID
-- ============================================================================

-- Check config_id column type in sessions tables
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hot_sell_sessions', 'winner_takes_all_sessions', 'one_v_one_sessions')
  AND column_name IN ('id', 'config_id', 'session_id')
ORDER BY table_name, column_name;

-- Check id column type in configs tables
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hot_sell_configs', 'winner_takes_all_configs', 'one_v_one_configs')
  AND column_name = 'id'
ORDER BY table_name;

-- ============================================================================
-- STEP 3: Check participants table session_id column types
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hot_sell_participants', 'winner_takes_all_participants', 'one_v_one_participants')
  AND column_name IN ('session_id', 'user_id')
ORDER BY table_name, column_name;

-- ============================================================================
-- STEP 4: Try to reproduce the error with a test query
-- ============================================================================

-- Test 1: Can we select from sessions?
DO $$
DECLARE
  test_id UUID;
BEGIN
  SELECT id INTO test_id FROM public.hot_sell_sessions LIMIT 1;
  RAISE NOTICE 'Test 1 passed: Can select from hot_sell_sessions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test 1 FAILED: %', SQLERRM;
END $$;

-- Test 2: Can we join sessions to configs?
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count
  FROM public.hot_sell_sessions s, public.hot_sell_configs c
  WHERE c.id::TEXT = s.config_id::TEXT
  LIMIT 1;
  RAISE NOTICE 'Test 2 passed: Can join with TEXT cast';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test 2 FAILED: %', SQLERRM;
END $$;

-- Test 3: Can we call join_hot_sell_session?
DO $$
DECLARE
  test_session_id TEXT;
  test_user_id UUID;
  test_result RECORD;
BEGIN
  SELECT id::TEXT INTO test_session_id FROM public.hot_sell_sessions WHERE status = 'active' LIMIT 1;
  SELECT id INTO test_user_id FROM public.users LIMIT 1;
  
  IF test_session_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Don't actually call it (would spend tokens), just check it exists
    RAISE NOTICE 'Test 3: Function inputs available - Session: %, User: %', test_session_id, test_user_id;
  ELSE
    RAISE NOTICE 'Test 3: No test data available';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Show exact SQL that causes the error
-- ============================================================================

-- This will help us pinpoint the exact comparison
SELECT 
  'Attempting direct comparison test' as test;

-- Try the comparison that might be failing
DO $$
DECLARE
  session_config_id TEXT;
  config_id_uuid UUID;
BEGIN
  -- Get a config_id from a session
  SELECT config_id::TEXT INTO session_config_id 
  FROM public.hot_sell_sessions 
  LIMIT 1;
  
  -- Try to find matching config
  SELECT id INTO config_id_uuid
  FROM public.hot_sell_configs
  WHERE id::TEXT = session_config_id;
  
  RAISE NOTICE 'Comparison test passed!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Comparison test FAILED: %', SQLERRM;
END $$;

