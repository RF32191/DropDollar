-- ADD WINNER TAKES IT ALL TOURNAMENTS
-- This creates Winner Takes It All tournaments with proper configuration

-- Add $100 Winner Takes It All
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
) VALUES (
  gen_random_uuid(),
  'laser_dodge',
  'hot_sell', -- Use hot_sell type for compatibility
  '$100 Winner Takes It All - Laser Dodge',
  'Winner takes 85% of the pot! Unlimited players, base price $10',
  1, -- 1 token entry
  100, -- $100 total prize
  NULL, -- No max participants limit
  120, -- 2 minutes
  17, -- RNG seed
  NOW()
);

-- Add $250 Winner Takes It All
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
) VALUES (
  gen_random_uuid(),
  'multi_target',
  'hot_sell', -- Use hot_sell type for compatibility
  '$250 Winner Takes It All - Multi Target',
  'Winner takes 85% of the pot! Unlimited players, base price $25',
  1, -- 1 token entry
  250, -- $250 total prize
  NULL, -- No max participants limit
  90, -- 1.5 minutes
  18, -- RNG seed
  NOW()
);

-- Add $1000 Winner Takes It All
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
) VALUES (
  gen_random_uuid(),
  'sword_parry',
  'hot_sell', -- Use hot_sell type for compatibility
  '$1000 Winner Takes It All - Sword Parry',
  'Winner takes 85% of the pot! Unlimited players, base price $100',
  1, -- 1 token entry
  1000, -- $1000 total prize
  NULL, -- No max participants limit
  180, -- 3 minutes
  19, -- RNG seed
  NOW()
);

-- Create sessions for all Winner Takes It All configs
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
BEGIN
  FOR config_rec IN SELECT * FROM public.fixed_games_config WHERE title LIKE '%Winner Takes It All%' LOOP
    -- Check if session already exists
    SELECT EXISTS(
      SELECT 1 FROM public.hot_sell_sessions 
      WHERE config_id = config_rec.id
    ) INTO session_exists;
    
    -- Create session if it doesn't exist
    IF NOT session_exists THEN
      PERFORM create_hot_sell_session(config_rec.id::TEXT);
      RAISE NOTICE 'Created Winner Takes It All session for config: %', config_rec.title;
    END IF;
  END LOOP;
END $$;

SELECT 'Winner Takes It All tournaments created successfully!' as status;
