-- ============================================================================
-- EMERGENCY: Find out what's REALLY in the database
-- ============================================================================

-- 1. What are the ACTUAL column types?
SELECT 
  'HOT SELL SESSIONS' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'hot_sell_sessions'
AND column_name IN ('id', 'config_id')
ORDER BY column_name;

SELECT 
  'HOT SELL PARTICIPANTS' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'hot_sell_participants'
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY column_name;

SELECT 
  'WINNER TAKES ALL SESSIONS' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'winner_takes_all_sessions'
AND column_name IN ('id', 'config_id')
ORDER BY column_name;

SELECT 
  'WINNER TAKES ALL PARTICIPANTS' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'winner_takes_all_participants'
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY column_name;

-- 2. Are there any triggers that could be interfering?
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('hot_sell_participants', 'winner_takes_all_participants', 'hot_sell_sessions', 'winner_takes_all_sessions')
ORDER BY event_object_table, trigger_name;

-- 3. Are there any RLS policies?
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('hot_sell_participants', 'winner_takes_all_participants', 'hot_sell_sessions', 'winner_takes_all_sessions');

-- 4. Sample the actual data to see what format IDs are stored in
SELECT 
  'HOT SELL SESSIONS SAMPLE' as info,
  id,
  pg_typeof(id) as id_type
FROM hot_sell_sessions
LIMIT 1;

SELECT 
  'HOT SELL PARTICIPANTS SAMPLE' as info,
  id,
  session_id,
  pg_typeof(id) as id_type,
  pg_typeof(session_id) as session_id_type
FROM hot_sell_participants
LIMIT 1;

