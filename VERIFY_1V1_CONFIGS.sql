-- ============================================================================
-- VERIFY 1V1 CONFIGS EXIST
-- ============================================================================

-- Check how many configs exist
SELECT 
  COUNT(*) as total_configs,
  COUNT(DISTINCT game_type) as unique_games
FROM public.one_v_one_configs;

-- List all configs
SELECT 
  id,
  game_type,
  title,
  entry_fee,
  winner_prize,
  prize_pool
FROM public.one_v_one_configs
ORDER BY game_type, entry_fee;

-- Check sessions
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM public.one_v_one_sessions;

-- Check if get_all_1v1_sessions function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_all_1v1_sessions';

