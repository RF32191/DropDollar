-- ============================================================================
-- CHECK HOT SELL ACTUAL SCHEMA
-- ============================================================================
-- Run this to see the ACTUAL column names in your database
-- ============================================================================

-- Check hot_sell_sessions columns
SELECT 
  '📋 HOT_SELL_SESSIONS COLUMNS' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_sessions'
ORDER BY ordinal_position;

-- Check hot_sell_configs columns
SELECT 
  '📋 HOT_SELL_CONFIGS COLUMNS' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_configs'
ORDER BY ordinal_position;

-- Check hot_sell_participants columns
SELECT 
  '📋 HOT_SELL_PARTICIPANTS COLUMNS' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hot_sell_participants'
ORDER BY ordinal_position;

-- Check if functions exist
SELECT 
  '🔧 HOT SELL FUNCTIONS' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%hot_sell%'
ORDER BY routine_name;

