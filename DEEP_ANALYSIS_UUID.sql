-- ============================================================================
-- DEEP ANALYSIS - Find EXACT source of "operator does not exist: text = uuid"
-- ============================================================================

-- 1. Check actual column types RIGHT NOW
DO $$
DECLARE
  v_hs_sessions_id_type TEXT;
  v_hs_participants_sid_type TEXT;
  v_wta_sessions_id_type TEXT;
  v_wta_participants_sid_type TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ACTUAL COLUMN TYPES ===';
  
  SELECT data_type INTO v_hs_sessions_id_type
  FROM information_schema.columns
  WHERE table_name = 'hot_sell_sessions' AND column_name = 'id';
  
  SELECT data_type INTO v_hs_participants_sid_type
  FROM information_schema.columns
  WHERE table_name = 'hot_sell_participants' AND column_name = 'session_id';
  
  RAISE NOTICE 'hot_sell_sessions.id: %', v_hs_sessions_id_type;
  RAISE NOTICE 'hot_sell_participants.session_id: %', v_hs_participants_sid_type;
  
  IF v_hs_sessions_id_type != v_hs_participants_sid_type THEN
    RAISE NOTICE '❌ MISMATCH FOUND! This is the problem.';
  ELSE
    RAISE NOTICE '✅ Types match';
  END IF;
  
  SELECT data_type INTO v_wta_sessions_id_type
  FROM information_schema.columns
  WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'id';
  
  SELECT data_type INTO v_wta_participants_sid_type
  FROM information_schema.columns
  WHERE table_name = 'winner_takes_all_participants' AND column_name = 'session_id';
  
  RAISE NOTICE 'winner_takes_all_sessions.id: %', v_wta_sessions_id_type;
  RAISE NOTICE 'winner_takes_all_participants.session_id: %', v_wta_participants_sid_type;
  
  IF v_wta_sessions_id_type != v_wta_participants_sid_type THEN
    RAISE NOTICE '❌ MISMATCH FOUND! This is the problem.';
  ELSE
    RAISE NOTICE '✅ Types match';
  END IF;
END $$;

-- 2. Check for triggers that might be comparing
SELECT 
  'TRIGGER:' as type,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('hot_sell_participants', 'winner_takes_all_participants', 'hot_sell_sessions', 'winner_takes_all_sessions')
AND action_statement ILIKE '%session_id%'
ORDER BY event_object_table;

-- 3. Check for RLS policies
SELECT 
  'POLICY:' as type,
  tablename,
  policyname,
  qual as condition
FROM pg_policies
WHERE tablename IN ('hot_sell_participants', 'winner_takes_all_participants', 'hot_sell_sessions', 'winner_takes_all_sessions')
ORDER BY tablename;

-- 4. Check foreign key constraints
SELECT
  'FK:' as type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('hot_sell_participants', 'winner_takes_all_participants')
AND kcu.column_name = 'session_id';

-- 5. Sample actual data
SELECT 
  'SAMPLE DATA' as info,
  id,
  pg_typeof(id) as id_actual_type
FROM hot_sell_sessions
LIMIT 1;

SELECT 
  'SAMPLE DATA' as info,
  session_id,
  pg_typeof(session_id) as session_id_actual_type
FROM hot_sell_participants
LIMIT 1;

-- 6. Test the actual join query
DO $$
DECLARE
  v_test_session_id UUID;
  v_test_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING ACTUAL JOIN QUERY ===';
  
  -- Get a real session ID
  SELECT id INTO v_test_session_id FROM hot_sell_sessions WHERE status = 'active' LIMIT 1;
  
  IF v_test_session_id IS NULL THEN
    RAISE NOTICE 'No active sessions to test';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Test session ID: %', v_test_session_id;
  RAISE NOTICE 'Type: %', pg_typeof(v_test_session_id);
  
  -- Try the problematic query
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM hot_sell_participants 
      WHERE session_id = v_test_session_id
    ) INTO v_exists;
    
    RAISE NOTICE '✅ Query worked! No UUID error.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ANALYSIS COMPLETE ===';
  RAISE NOTICE 'Check output above to find the mismatch';
END $$;

