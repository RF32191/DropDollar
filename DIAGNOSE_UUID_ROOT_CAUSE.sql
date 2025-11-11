-- ============================================================================
-- DIAGNOSE UUID ROOT CAUSE
-- Find the EXACT source of "operator does not exist: text = uuid"
-- ============================================================================

-- 1. Check actual column types
SELECT 
  '🔍 HOT SELL SCHEMA' as info,
  'hot_sell_sessions.id' as column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'hot_sell_sessions' AND column_name = 'id'
UNION ALL
SELECT 
  '🔍 HOT SELL SCHEMA',
  'hot_sell_participants.session_id',
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'hot_sell_participants' AND column_name = 'session_id'
UNION ALL
SELECT 
  '🔍 HOT SELL SCHEMA',
  'hot_sell_participants.id',
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'hot_sell_participants' AND column_name = 'id';

-- 2. Check foreign key constraints
SELECT 
  '🔗 FOREIGN KEYS' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'hot_sell_participants'
AND kcu.column_name = 'session_id';

-- 3. Check for triggers
SELECT 
  '⚡ TRIGGERS' as info,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('hot_sell_sessions', 'hot_sell_participants')
ORDER BY event_object_table, trigger_name;

-- 4. Check for RLS policies
SELECT 
  '🛡️ RLS POLICIES' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('hot_sell_sessions', 'hot_sell_participants');

-- 5. Check for views that might compare these
SELECT 
  '👁️ VIEWS' as info,
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (
  view_definition ILIKE '%hot_sell%'
  OR view_definition ILIKE '%session_id%'
);

-- 6. Sample actual data to see format
SELECT 
  '📊 SAMPLE DATA' as info,
  id::TEXT as session_id,
  pg_typeof(id) as id_type
FROM hot_sell_sessions
LIMIT 1;

SELECT 
  '📊 SAMPLE DATA' as info,
  session_id::TEXT as session_id,
  pg_typeof(session_id) as session_id_type
FROM hot_sell_participants
LIMIT 1;

