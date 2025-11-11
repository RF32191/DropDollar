-- ============================================================================
-- CREATE ALL GAME SESSIONS - Run this in Supabase to initialize all games
-- ============================================================================
-- This script creates 'active' sessions for all game configs so players can join
-- ============================================================================

BEGIN;

-- ============================================
-- PART 1: HOT SELL SESSIONS
-- ============================================

SELECT '🔥 Creating Hot Sell Sessions...' as step;

INSERT INTO hot_sell_sessions (
  id,
  config_id,
  prize_pool,
  base_price,
  max_participants,
  participants_count,
  status,
  rng_seed,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.base_price,
  c.base_price,
  c.max_participants,
  0,
  'active', -- CRITICAL: Status must be 'active' for players to join
  floor(random() * 1000000)::INTEGER,
  NOW(),
  NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
);

SELECT 
  '✅ Hot Sell Sessions Created' as result,
  COUNT(*) as total_active_sessions
FROM hot_sell_sessions
WHERE status = 'active';

-- ============================================
-- PART 2: WINNER TAKES ALL SESSIONS
-- ============================================

SELECT '🏆 Creating Winner Takes All Sessions...' as step;

INSERT INTO winner_takes_all_sessions (
  id,
  config_id,
  current_pool,
  base_price,
  participants_count,
  status,
  timer_started_at,
  timer_duration,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.base_price,
  c.base_price,
  0,
  'active', -- CRITICAL: Status must be 'active'
  NULL, -- Timer starts when first player joins
  c.game_duration,
  NOW(),
  NOW()
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM winner_takes_all_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
);

SELECT 
  '✅ Winner Takes All Sessions Created' as result,
  COUNT(*) as total_active_sessions
FROM winner_takes_all_sessions
WHERE status = 'active';

-- ============================================
-- PART 3: 1V1 TOURNAMENT SESSIONS
-- ============================================

SELECT '⚔️ Creating 1v1 Tournament Sessions...' as step;

INSERT INTO one_v_one_sessions (
  id,
  config_id,
  current_pool,
  prize_pool,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.prize_pool,
  c.prize_pool,
  0,
  2, -- 1v1 always has max 2 participants
  'active', -- CRITICAL: Status must be 'active'
  NOW(),
  NOW()
FROM one_v_one_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM one_v_one_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
);

SELECT 
  '✅ 1v1 Sessions Created' as result,
  COUNT(*) as total_active_sessions
FROM one_v_one_sessions
WHERE status = 'active';

-- ============================================
-- FINAL VERIFICATION
-- ============================================

SELECT '📊 FINAL SUMMARY' as step;

SELECT 
  'Hot Sell' as game_type,
  (SELECT COUNT(*) FROM hot_sell_configs) as total_configs,
  (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') as active_sessions,
  CASE 
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') >= (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '✅ ALL CONFIGS HAVE SESSIONS'
    ELSE '❌ MISSING SESSIONS'
  END as status
UNION ALL
SELECT 
  'Winner Takes All' as game_type,
  (SELECT COUNT(*) FROM winner_takes_all_configs) as total_configs,
  (SELECT COUNT(*) FROM winner_takes_all_sessions WHERE status = 'active') as active_sessions,
  CASE 
    WHEN (SELECT COUNT(*) FROM winner_takes_all_sessions WHERE status = 'active') >= (SELECT COUNT(*) FROM winner_takes_all_configs)
    THEN '✅ ALL CONFIGS HAVE SESSIONS'
    ELSE '❌ MISSING SESSIONS'
  END as status
UNION ALL
SELECT 
  '1v1 Tournament' as game_type,
  (SELECT COUNT(*) FROM one_v_one_configs) as total_configs,
  (SELECT COUNT(*) FROM one_v_one_sessions WHERE status = 'active') as active_sessions,
  CASE 
    WHEN (SELECT COUNT(*) FROM one_v_one_sessions WHERE status = 'active') >= (SELECT COUNT(*) FROM one_v_one_configs)
    THEN '✅ ALL CONFIGS HAVE SESSIONS'
    ELSE '❌ MISSING SESSIONS'
  END as status;

COMMIT;

SELECT '🎉 ALL GAME SESSIONS CREATED!' as message;
SELECT '🚀 Players can now join games!' as next_step;

