-- ============================================================================
-- DIAGNOSE HOT SELL SESSION ISSUE
-- Run this first to see what's actually in your database
-- ============================================================================

-- 1. Check all Hot Sell configs
SELECT 
  'CONFIGS' as table_name,
  id as config_id, 
  title,
  game_type,
  base_price,
  max_participants
FROM public.hot_sell_configs
ORDER BY base_price;

-- 2. Check all Hot Sell sessions
SELECT 
  'SESSIONS' as table_name,
  id as session_id,
  config_id,
  status,
  prize_pool,
  participants_count,
  max_participants,
  first_place_user_id IS NOT NULL as has_been_paid,
  created_at
FROM public.hot_sell_sessions
ORDER BY config_id, created_at DESC;

-- 3. Check which configs are MISSING sessions
SELECT 
  'MISSING SESSIONS' as issue,
  c.id as config_id,
  c.title,
  'No waiting or active session' as problem
FROM public.hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM public.hot_sell_sessions s 
  WHERE s.config_id = c.id 
  AND s.status IN ('waiting', 'active')
  AND s.first_place_user_id IS NULL
);

-- 4. Check for duplicate sessions
SELECT 
  'DUPLICATE SESSIONS' as issue,
  config_id,
  COUNT(*) as session_count
FROM public.hot_sell_sessions
WHERE status IN ('waiting', 'active')
GROUP BY config_id
HAVING COUNT(*) > 1;

-- 5. Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'hot_sell_sessions'
ORDER BY ordinal_position;

