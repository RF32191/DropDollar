-- ============================================================================
-- CREATE $3 HOT SELL LISTINGS - SIMPLE VERSION
-- ============================================================================
-- Creates affordable $3 test listings (no ON CONFLICT)
-- ============================================================================

BEGIN;

SELECT '🔧 Creating $3 Hot Sell listings...' as step;

-- Delete any existing $3 configs first (to avoid duplicates)
DELETE FROM public.hot_sell_sessions 
WHERE config_id IN (
  SELECT id FROM public.hot_sell_configs WHERE entry_fee = 3
);

DELETE FROM public.hot_sell_configs 
WHERE entry_fee = 3;

SELECT '✅ Cleaned up old $3 listings' as result;

-- Create fresh $3 configurations
INSERT INTO public.hot_sell_configs (
  game_type,
  title,
  description,
  entry_fee,
  base_price,
  max_participants,
  game_duration,
  rng_seed,
  first_place_percent,
  second_place_percent,
  third_place_percent,
  platform_fee_percent
) VALUES
  ('sword_parry', '⚔️ Sword Slash - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  ('blade_bounce', '🛡️ Blade Bounce - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  ('laser_dodge', '🚀 Laser Dodge - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  ('multi_target_reaction', '🎯 Multi-Target - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  ('quick_click', '⚡ Quick Click - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  ('color_sequence', '🎨 Color Memory - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  ('cash_stack', '💵 Cash Stack - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0);

SELECT '✅ Created ' || COUNT(*) || ' $3 configs' as result
FROM public.hot_sell_configs
WHERE entry_fee = 3;

-- Create active sessions for each config
INSERT INTO public.hot_sell_sessions (
  config_id,
  prize_pool,
  participants_count,
  max_participants,
  status,
  rng_seed
)
SELECT 
  id,
  0,
  0,
  max_participants,
  'active',
  rng_seed
FROM public.hot_sell_configs
WHERE entry_fee = 3;

SELECT '✅ Created ' || COUNT(*) || ' active sessions' as result
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
WHERE c.entry_fee = 3 AND s.status = 'active';

-- Show the created listings
SELECT 
  '📊 CREATED LISTINGS' as section,
  c.game_type as game,
  c.title,
  '$' || c.entry_fee as entry,
  c.max_participants as max_players,
  '$' || s.prize_pool as current_pool,
  s.participants_count as players_joined
FROM public.hot_sell_configs c
JOIN public.hot_sell_sessions s ON s.config_id = c.id
WHERE c.entry_fee = 3 AND s.status = 'active'
ORDER BY c.game_type;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 SUCCESS! $3 LISTINGS CREATED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ 7 games @ $3 entry fee' as info;
SELECT '✅ 5 players max per game' as info;
SELECT '💰 $15 total to fill a session' as info;
SELECT '🥇 1st: $7.50 (50%)' as prizes;
SELECT '🥈 2nd: $3.00 (20%)' as prizes;
SELECT '🥉 3rd: $2.25 (15%)' as prizes;
SELECT '🏦 Platform: $2.25 (15%)' as prizes;
SELECT '🎉 ================================' as message;

