-- ============================================================================
-- CREATE $3 HOT SELL LISTINGS - WITH MANUAL UUID GENERATION
-- ============================================================================

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Delete existing $3 listings
DELETE FROM public.hot_sell_sessions 
WHERE config_id IN (SELECT id FROM public.hot_sell_configs WHERE entry_fee = 3);

DELETE FROM public.hot_sell_configs WHERE entry_fee = 3;

-- Insert configs with explicit UUID generation
INSERT INTO public.hot_sell_configs (
  id,
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
  (uuid_generate_v4(), 'sword_parry', '⚔️ Sword Slash - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  (uuid_generate_v4(), 'blade_bounce', '🛡️ Blade Bounce - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  (uuid_generate_v4(), 'laser_dodge', '🚀 Laser Dodge - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  (uuid_generate_v4(), 'multi_target_reaction', '🎯 Multi-Target - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  (uuid_generate_v4(), 'quick_click', '⚡ Quick Click - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  (uuid_generate_v4(), 'color_sequence', '🎨 Color Memory - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0),
  (uuid_generate_v4(), 'cash_stack', '💵 Cash Stack - TEST $3', 'Quick $3 test!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0);

SELECT '✅ Created ' || COUNT(*) || ' configs' as result
FROM public.hot_sell_configs WHERE entry_fee = 3;

-- Create sessions with explicit UUID generation
INSERT INTO public.hot_sell_sessions (
  id,
  config_id,
  prize_pool,
  participants_count,
  max_participants,
  status,
  rng_seed
)
SELECT 
  uuid_generate_v4(),
  c.id,
  0,
  0,
  c.max_participants,
  'active',
  c.rng_seed
FROM public.hot_sell_configs c
WHERE c.entry_fee = 3;

SELECT '✅ Created ' || COUNT(*) || ' sessions' as result
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
WHERE c.entry_fee = 3 AND s.status = 'active';

-- Show results
SELECT 
  c.game_type,
  c.title,
  '$' || c.entry_fee::text as entry_fee,
  c.max_participants,
  '$' || s.prize_pool::text as current_pool,
  s.participants_count || '/' || c.max_participants as players
FROM public.hot_sell_configs c
JOIN public.hot_sell_sessions s ON s.config_id = c.id
WHERE c.entry_fee = 3 AND s.status = 'active'
ORDER BY c.game_type;

COMMIT;

SELECT '🎉 ================================================' as message;
SELECT '🎉 SUCCESS! 7 TEST GAMES CREATED @ $3 EACH!' as message;
SELECT '🎉 ================================================' as message;
SELECT '✅ Entry fee: $3 (affordable testing!)' as info;
SELECT '✅ Max players: 5 per game' as info;
SELECT '✅ Total to fill: $15' as info;
SELECT '💰 Prizes: $7.50 / $3.00 / $2.25 (Platform: $2.25)' as info;
SELECT '🎮 Refresh website to see the new listings!' as info;
SELECT '🎉 ================================================' as message;

