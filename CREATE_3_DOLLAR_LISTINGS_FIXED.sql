-- ============================================================================
-- CREATE $3 HOT SELL LISTINGS - FIXED VERSION
-- ============================================================================
-- Creates affordable $3 test listings without is_active column
-- ============================================================================

BEGIN;

SELECT '🔧 Creating $3 Hot Sell listings...' as step;

-- Create $3 configurations (without is_active column)
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
  ('cash_stack', '💵 Cash Stack - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0)
ON CONFLICT (game_type, entry_fee, max_participants) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = NOW();

SELECT '✅ Created/updated ' || COUNT(*) || ' configs' as result
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
  id as config_id,
  0 as prize_pool,
  0 as participants_count,
  max_participants,
  'active' as status,
  rng_seed
FROM public.hot_sell_configs
WHERE entry_fee = 3
ON CONFLICT (config_id, status) WHERE status = 'active'
DO UPDATE SET
  prize_pool = 0,
  participants_count = 0,
  updated_at = NOW();

SELECT '✅ Created/updated ' || COUNT(*) || ' sessions' as result
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
WHERE c.entry_fee = 3 AND s.status = 'active';

-- Show created listings
SELECT 
  c.game_type,
  c.title,
  c.entry_fee,
  c.max_participants,
  s.prize_pool,
  s.participants_count,
  s.status
FROM public.hot_sell_configs c
JOIN public.hot_sell_sessions s ON s.config_id = c.id
WHERE c.entry_fee = 3 AND s.status = 'active'
ORDER BY c.game_type;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 $3 TEST LISTINGS CREATED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ 7 games with $3 entry fee' as status;
SELECT '✅ 5 max participants each' as status;
SELECT '💰 Total to fill: $15' as status;
SELECT '💰 Prizes: $7.50 / $3.00 / $2.25' as status;
SELECT '🎉 ================================' as message;

