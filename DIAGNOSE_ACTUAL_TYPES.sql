-- ============================================================================
-- DIAGNOSE: What are the ACTUAL column types?
-- ============================================================================

-- Check Hot Sell table types
SELECT 
  'hot_sell_sessions' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'hot_sell_sessions' 
AND column_name IN ('id', 'config_id')
ORDER BY ordinal_position;

SELECT 
  'hot_sell_participants' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'hot_sell_participants' 
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY ordinal_position;

-- Check Winner Takes All table types
SELECT 
  'winner_takes_all_sessions' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_sessions' 
AND column_name IN ('id', 'config_id')
ORDER BY ordinal_position;

SELECT 
  'winner_takes_all_participants' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_participants' 
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('hot_sell_participants', 'winner_takes_all_participants')
AND kcu.column_name IN ('session_id', 'user_id');

