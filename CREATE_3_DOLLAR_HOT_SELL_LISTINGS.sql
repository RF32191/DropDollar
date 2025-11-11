-- ============================================================================
-- CREATE $3 HOT SELL LISTINGS FOR PAYOUT TESTING
-- ============================================================================
-- Creates small $3 entry fee listings to make testing affordable
-- ============================================================================

BEGIN;

SELECT '🔧 Creating $3 Hot Sell listings for testing...' as step;

-- Create $3 configurations for each game type
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
  platform_fee_percent,
  is_active
) VALUES
  -- Sword Parry $3
  (
    'sword_parry',
    '⚔️ Sword Slash - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  ),
  -- Blade Bounce $3
  (
    'blade_bounce',
    '🛡️ Blade Bounce - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  ),
  -- Laser Dodge $3
  (
    'laser_dodge',
    '🚀 Laser Dodge - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  ),
  -- Multi-Target $3
  (
    'multi_target_reaction',
    '🎯 Multi-Target - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  ),
  -- Quick Click $3
  (
    'quick_click',
    '⚡ Quick Click - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  ),
  -- Color Memory $3
  (
    'color_sequence',
    '🎨 Color Memory - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  ),
  -- Cash Stack $3
  (
    'cash_stack',
    '💵 Cash Stack - TEST $3',
    'Quick $3 test game - Top 3 win!',
    3,
    0,
    5,
    60,
    FLOOR(RANDOM() * 1000000)::INTEGER,
    50.0,
    20.0,
    15.0,
    15.0,
    true
  )
ON CONFLICT (game_type, entry_fee, max_participants) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = NOW();

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
  AND is_active = true
ON CONFLICT (config_id, status) WHERE status = 'active'
DO UPDATE SET
  prize_pool = 0,
  participants_count = 0,
  updated_at = NOW();

-- Show created listings
SELECT 
  '📊 Created $3 Test Listings' as summary,
  COUNT(*) as total_configs
FROM public.hot_sell_configs
WHERE entry_fee = 3 AND is_active = true;

-- Show details
SELECT 
  c.game_type,
  c.title,
  c.entry_fee,
  c.max_participants,
  s.id as session_id,
  s.prize_pool,
  s.participants_count,
  s.status
FROM public.hot_sell_configs c
JOIN public.hot_sell_sessions s ON s.config_id = c.id
WHERE c.entry_fee = 3 
  AND c.is_active = true
  AND s.status = 'active'
ORDER BY c.game_type;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 $3 TEST LISTINGS CREATED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ 7 games with $3 entry fee' as status;
SELECT '✅ 5 max participants each' as status;
SELECT '✅ Perfect for quick testing!' as status;
SELECT '💰 Total cost to fill a session: $15' as status;
SELECT '💰 Prize pool when full: $15' as status;
SELECT '🥇 1st place: $7.50 (50%)' as status;
SELECT '🥈 2nd place: $3.00 (20%)' as status;
SELECT '🥉 3rd place: $2.25 (15%)' as status;
SELECT '🏦 Platform fee: $2.25 (15%)' as status;
SELECT '🎉 ================================' as message;

