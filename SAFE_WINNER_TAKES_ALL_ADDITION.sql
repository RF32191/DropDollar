-- SAFE WINNER TAKES IT ALL ADDITION
-- This ONLY adds new tournaments without touching existing data

-- 1. Add Winner Takes It All tournaments (safe INSERT only)
INSERT INTO public.fixed_games_config (
  id,
  game_type,
  tournament_type,
  title,
  description,
  entry_fee,
  prize_pool,
  max_participants,
  game_duration,
  rng_seed,
  created_at
) VALUES 
-- $100 Winner Takes It All
(
  gen_random_uuid(),
  'laser_dodge',
  'hot_sell',
  '$100 Winner Takes It All - Laser Dodge',
  'Winner takes 85% of the pot! Unlimited players, base price $10',
  1,
  100,
  999999, -- Simulates unlimited
  120,
  17,
  NOW()
),
-- $250 Winner Takes It All
(
  gen_random_uuid(),
  'multi_target',
  'hot_sell',
  '$250 Winner Takes It All - Multi Target',
  'Winner takes 85% of the pot! Unlimited players, base price $25',
  1,
  250,
  999999, -- Simulates unlimited
  90,
  18,
  NOW()
),
-- $1000 Winner Takes It All
(
  gen_random_uuid(),
  'sword_parry',
  'hot_sell',
  '$1000 Winner Takes It All - Sword Parry',
  'Winner takes 85% of the pot! Unlimited players, base price $100',
  1,
  1000,
  999999, -- Simulates unlimited
  180,
  19,
  NOW()
);

-- 2. Create sessions ONLY for Winner Takes It All configs (safe)
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
  base_price INTEGER;
BEGIN
  -- Only process Winner Takes It All configs
  FOR config_rec IN SELECT * FROM public.fixed_games_config WHERE title LIKE '%Winner Takes It All%' LOOP
    -- Calculate base price (10% of total prize)
    base_price := CEIL(config_rec.prize_pool * 0.1);
    
    -- Check if session already exists
    SELECT EXISTS(
      SELECT 1 FROM public.hot_sell_sessions 
      WHERE config_id = config_rec.id
    ) INTO session_exists;
    
    -- Create session if it doesn't exist
    IF NOT session_exists THEN
      INSERT INTO public.hot_sell_sessions (
        id,
        config_id,
        current_pot,
        target_pot,
        participants_count,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        config_rec.id,
        0, -- Start with empty pot
        base_price, -- Use base price as target_pot (10% of prize pool)
        0, -- Start with 0 participants
        'waiting', -- Waiting for base price
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created Winner Takes It All session for config: % (Base Price: $%)', config_rec.title, base_price;
    END IF;
  END LOOP;
END $$;

SELECT 'Winner Takes It All tournaments added safely!' as status;
