-- ============================================================================
-- DIAGNOSE "SESSION NOT FOUND" ERROR
-- ============================================================================
-- Let's see what's actually in the database
-- ============================================================================

-- ============================================================================
-- 1. CHECK IF SESSIONS WERE CREATED
-- ============================================================================

SELECT '=== WINNER TAKES ALL SESSIONS ===' as info;
SELECT 
  id,
  config_id,
  status,
  current_pool,
  base_price,
  participants_count,
  created_at
FROM public.winner_takes_all_sessions
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== HOT SELL SESSIONS ===' as info;
SELECT 
  id,
  config_id,
  status,
  current_pool,
  base_price,
  participants_count,
  max_participants,
  created_at
FROM public.hot_sell_sessions
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. CHECK CONFIGS
-- ============================================================================

SELECT '=== WINNER TAKES ALL CONFIGS ===' as info;
SELECT id, game_type, title, entry_fee
FROM public.winner_takes_all_configs
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== HOT SELL CONFIGS ===' as info;
SELECT id, game_type, title, entry_fee
FROM public.hot_sell_configs
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. COUNT EVERYTHING
-- ============================================================================

SELECT 
  'Winner Takes All Configs' as type,
  COUNT(*) as total
FROM public.winner_takes_all_configs;

SELECT 
  'Winner Takes All Active Sessions' as type,
  COUNT(*) as total
FROM public.winner_takes_all_sessions
WHERE status = 'active';

SELECT 
  'Hot Sell Configs' as type,
  COUNT(*) as total
FROM public.hot_sell_configs;

SELECT 
  'Hot Sell Active Sessions' as type,
  COUNT(*) as total
FROM public.hot_sell_sessions
WHERE status = 'active';

-- ============================================================================
-- 4. CHECK IF ANY CONFIGS ARE MISSING SESSIONS
-- ============================================================================

SELECT '=== WINNER TAKES ALL - CONFIGS WITHOUT SESSIONS ===' as info;
SELECT 
  c.id as config_id,
  c.title,
  c.entry_fee,
  COUNT(s.id) as session_count
FROM public.winner_takes_all_configs c
LEFT JOIN public.winner_takes_all_sessions s ON s.config_id = c.id AND s.status = 'active'
GROUP BY c.id, c.title, c.entry_fee
HAVING COUNT(s.id) = 0;

SELECT '=== HOT SELL - CONFIGS WITHOUT SESSIONS ===' as info;
SELECT 
  c.id as config_id,
  c.title,
  c.entry_fee,
  COUNT(s.id) as session_count
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
GROUP BY c.id, c.title, c.entry_fee
HAVING COUNT(s.id) = 0;

-- ============================================================================
-- RESULT: This will show us exactly what's in the database
-- ============================================================================

