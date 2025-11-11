-- ============================================================================
-- CREATE $3 HOT SELL LISTINGS - WITH UUID CAST
-- ============================================================================

BEGIN;

-- Delete existing $3 listings
DELETE FROM public.hot_sell_sessions 
WHERE config_id IN (SELECT id FROM public.hot_sell_configs WHERE entry_fee = 3);

DELETE FROM public.hot_sell_configs WHERE entry_fee = 3;

-- Create temp table
CREATE TEMP TABLE temp_config_ids (
  config_id UUID,
  game_type TEXT
);

-- Insert sword_parry (cast id to UUID)
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'sword_parry', '⚔️ Sword Slash - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Insert blade_bounce
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'blade_bounce', '🛡️ Blade Bounce - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Insert laser_dodge
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'laser_dodge', '🚀 Laser Dodge - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Insert multi_target
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'multi_target_reaction', '🎯 Multi-Target - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Insert quick_click
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'quick_click', '⚡ Quick Click - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Insert color_sequence
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'color_sequence', '🎨 Color Memory - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Insert cash_stack
WITH inserted AS (
  INSERT INTO public.hot_sell_configs (
    game_type, title, description, entry_fee, base_price, max_participants,
    game_duration, rng_seed, first_place_percent, second_place_percent,
    third_place_percent, platform_fee_percent
  ) VALUES (
    'cash_stack', '💵 Cash Stack - TEST $3', 'Quick $3 test!', 3, 0, 5, 60,
    FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0
  ) RETURNING id::uuid, game_type
)
INSERT INTO temp_config_ids (config_id, game_type) SELECT * FROM inserted;

-- Create sessions
INSERT INTO public.hot_sell_sessions (
  config_id, prize_pool, participants_count, max_participants, status, rng_seed
)
SELECT 
  t.config_id, 0, 0, c.max_participants, 'active', c.rng_seed
FROM temp_config_ids t
JOIN public.hot_sell_configs c ON c.id = t.config_id;

-- Show results
SELECT 
  '✅ CREATED!' as status,
  c.game_type, 
  c.title, 
  c.entry_fee,
  s.participants_count || '/' || c.max_participants as players
FROM temp_config_ids t
JOIN public.hot_sell_configs c ON c.id = t.config_id
JOIN public.hot_sell_sessions s ON s.config_id = t.config_id
ORDER BY c.game_type;

COMMIT;

SELECT '🎉 7 games @ $3 created! Refresh website to see them.' as message;

