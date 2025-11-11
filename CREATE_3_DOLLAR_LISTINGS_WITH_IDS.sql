-- ============================================================================
-- CREATE $3 HOT SELL LISTINGS - WITH ID HANDLING
-- ============================================================================
-- Creates affordable $3 test listings with proper ID generation
-- ============================================================================

BEGIN;

SELECT '🔧 Creating $3 Hot Sell listings...' as step;

-- Delete any existing $3 listings first
DELETE FROM public.hot_sell_sessions 
WHERE config_id IN (
  SELECT id FROM public.hot_sell_configs WHERE entry_fee = 3
);

DELETE FROM public.hot_sell_configs 
WHERE entry_fee = 3;

SELECT '✅ Cleaned up old $3 listings' as result;

-- Create configs and store IDs in temp table
CREATE TEMP TABLE temp_config_ids (
  config_id UUID,
  game_type TEXT
);

-- Insert sword_parry
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'sword_parry', '⚔️ Sword Slash - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

-- Insert blade_bounce
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'blade_bounce', '🛡️ Blade Bounce - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

-- Insert laser_dodge
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'laser_dodge', '🚀 Laser Dodge - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

-- Insert multi_target_reaction
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'multi_target_reaction', '🎯 Multi-Target - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

-- Insert quick_click
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'quick_click', '⚡ Quick Click - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

-- Insert color_sequence
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'color_sequence', '🎨 Color Memory - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

-- Insert cash_stack
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'cash_stack', '💵 Cash Stack - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id, game_type
)
INSERT INTO temp_config_ids SELECT id, game_type FROM inserted;

SELECT '✅ Created ' || COUNT(*) || ' configs' as result FROM temp_config_ids;

-- Create sessions using the temp table
INSERT INTO public.hot_sell_sessions (
  config_id,
  prize_pool,
  participants_count,
  max_participants,
  status,
  rng_seed
)
SELECT 
  t.config_id,
  0,
  0,
  c.max_participants,
  'active',
  c.rng_seed
FROM temp_config_ids t
JOIN public.hot_sell_configs c ON c.id = t.config_id;

SELECT '✅ Created ' || COUNT(*) || ' sessions' as result
FROM public.hot_sell_sessions s
WHERE s.config_id IN (SELECT config_id FROM temp_config_ids);

-- Show results
SELECT 
  c.game_type,
  c.title,
  c.entry_fee,
  c.max_participants,
  s.prize_pool,
  s.participants_count,
  s.status
FROM temp_config_ids t
JOIN public.hot_sell_configs c ON c.id = t.config_id
JOIN public.hot_sell_sessions s ON s.config_id = t.config_id
ORDER BY c.game_type;

-- Cleanup temp table
DROP TABLE temp_config_ids;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 SUCCESS! $3 LISTINGS CREATED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ 7 games @ $3 entry' as info;
SELECT '✅ 5 players max' as info;
SELECT '💰 $15 to fill session' as info;
SELECT '🥇 $7.50 | 🥈 $3.00 | 🥉 $2.25' as prizes;
SELECT '🎉 ================================' as message;

