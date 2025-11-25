-- ============================================================================
-- CHECK 1V1 COLUMN TYPES
-- ============================================================================
-- This will show us the actual column types in the database
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('one_v_one_configs', 'one_v_one_sessions', 'one_v_one_participants')
  AND column_name IN ('id', 'config_id', 'session_id', 'user_id')
ORDER BY 
  CASE table_name
    WHEN 'one_v_one_configs' THEN 1
    WHEN 'one_v_one_sessions' THEN 2
    WHEN 'one_v_one_participants' THEN 3
  END,
  column_name;

