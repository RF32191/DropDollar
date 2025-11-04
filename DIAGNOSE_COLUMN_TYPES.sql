-- ============================================================================
-- DIAGNOSE EXACT COLUMN TYPES - FIND THE ROOT CAUSE
-- ============================================================================

-- Show ALL columns in hot_sell_sessions
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_sessions'
ORDER BY ordinal_position;

-- Show ALL columns in hot_sell_configs
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_configs'
ORDER BY ordinal_position;

-- Show ALL columns in hot_sell_participants
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_participants'
ORDER BY ordinal_position;

-- Check for existing join_hot_sell_session functions
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE '%hot_sell%'
ORDER BY p.proname;

-- Try a simple query to see what works
SELECT 
  s.id::TEXT as session_id,
  s.config_id,
  pg_typeof(s.config_id) as config_id_type,
  s.status
FROM public.hot_sell_sessions s
LIMIT 1;

SELECT 
  c.id,
  pg_typeof(c.id) as id_type,
  c.entry_fee,
  c.rng_seed
FROM public.hot_sell_configs c
LIMIT 1;

