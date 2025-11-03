-- ============================================================================
-- CHECK FOR MISSING SESSIONS (CONFIGS WITHOUT ACTIVE SESSIONS)
-- ============================================================================

-- ============================================================================
-- 1. WINNER TAKES ALL - Check configs vs sessions
-- ============================================================================

SELECT '=== WINNER TAKES ALL CONFIGS ===' as info;
SELECT 
  id,
  game_type,
  title,
  entry_fee,
  max_participants,
  created_at
FROM public.winner_takes_all_configs
ORDER BY created_at DESC;

SELECT '=== WINNER TAKES ALL SESSIONS ===' as info;
SELECT 
  id,
  config_id,
  status,
  participants_count,
  max_participants,
  created_at
FROM public.winner_takes_all_sessions
ORDER BY created_at DESC;

-- Find configs WITHOUT sessions
SELECT '=== CONFIGS MISSING SESSIONS (Winner Takes All) ===' as info;
SELECT 
  c.id as config_id,
  c.title,
  c.entry_fee,
  c.game_type
FROM public.winner_takes_all_configs c
LEFT JOIN public.winner_takes_all_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL
ORDER BY c.created_at DESC;

-- ============================================================================
-- 2. HOT SELL - Check configs vs sessions
-- ============================================================================

SELECT '=== HOT SELL CONFIGS ===' as info;
SELECT 
  id,
  game_type,
  title,
  entry_fee,
  max_participants,
  created_at
FROM public.hot_sell_configs
ORDER BY created_at DESC;

SELECT '=== HOT SELL SESSIONS ===' as info;
SELECT 
  id,
  config_id,
  status,
  participants_count,
  max_participants,
  created_at
FROM public.hot_sell_sessions
ORDER BY created_at DESC;

-- Find configs WITHOUT sessions
SELECT '=== CONFIGS MISSING SESSIONS (Hot Sell) ===' as info;
SELECT 
  c.id as config_id,
  c.title,
  c.entry_fee,
  c.game_type
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL
ORDER BY c.created_at DESC;

-- ============================================================================
-- 3. CREATE MISSING SESSIONS
-- ============================================================================

-- Create missing Winner Takes All sessions
INSERT INTO public.winner_takes_all_sessions (
  id,
  config_id,
  current_pool,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  0, -- Start at 0
  0, -- No participants yet
  c.max_participants,
  'active',
  NOW(),
  NOW()
FROM public.winner_takes_all_configs c
LEFT JOIN public.winner_takes_all_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL;

-- Create missing Hot Sell sessions
INSERT INTO public.hot_sell_sessions (
  id,
  config_id,
  current_pool,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  0, -- Start at 0
  0, -- No participants yet
  c.max_participants,
  'active',
  NOW(),
  NOW()
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL;

-- ============================================================================
-- 4. VERIFY ALL SESSIONS NOW EXIST
-- ============================================================================

SELECT 'Total Winner Takes All Configs:' as info, COUNT(*) as count FROM public.winner_takes_all_configs;
SELECT 'Total Winner Takes All Sessions:' as info, COUNT(*) as count FROM public.winner_takes_all_sessions WHERE status = 'active';

SELECT 'Total Hot Sell Configs:' as info, COUNT(*) as count FROM public.hot_sell_configs;
SELECT 'Total Hot Sell Sessions:' as info, COUNT(*) as count FROM public.hot_sell_sessions WHERE status = 'active';

-- ============================================================================
-- RESULT: Creates missing sessions for all configs!
-- ============================================================================

