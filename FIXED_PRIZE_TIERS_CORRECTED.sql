-- FIXED PRIZE TIERS SQL - CORRECTED TOURNAMENT TYPES
-- This adds $2 hot sell and $3 winner takes it all prizes with correct tournament types

-- 1. Add $2 Hot Sell Prize
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
  'hot_sell',
  '$2 Hot Sell - Laser Dodge',
  'Quick 2-minute laser dodge game for $2 prize pool',
  1, -- 1 token entry
  200, -- $2 prize pool (200 cents)
  50, -- 50 max participants
  120, -- 2 minutes
  15, -- RNG seed
  NOW()
);

-- 2. Add $3 Winner Takes It All Prize (using 'hot_sell' tournament type)
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
  'hot_sell', -- Use 'hot_sell' instead of 'winner_takes_all'
  '$3 Winner Takes It All - Multi Target',
  'Winner takes the entire $3 prize pool!',
  1, -- 1 token entry
  300, -- $3 prize pool (300 cents)
  100, -- 100 max participants
  90, -- 1.5 minutes
  16, -- RNG seed
  NOW()
);

-- 3. Create sessions for all existing configs that don't have sessions
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
BEGIN
  FOR config_rec IN SELECT * FROM public.fixed_games_config LOOP
    -- Check if session already exists
    SELECT EXISTS(
      SELECT 1 FROM public.hot_sell_sessions 
      WHERE config_id = config_rec.id
    ) INTO session_exists;
    
    -- Create session if it doesn't exist
    IF NOT session_exists THEN
      PERFORM create_hot_sell_session(config_rec.id::TEXT);
      RAISE NOTICE 'Created session for config: %', config_rec.title;
    END IF;
  END LOOP;
END $$;

-- 4. Update existing configs to ensure they have proper prize pools
UPDATE public.fixed_games_config 
SET prize_pool = CASE 
  WHEN tournament_type = 'hot_sell' AND entry_fee = 1 AND title LIKE '%Winner Takes%' THEN 300 -- $3 for winner takes all
  WHEN tournament_type = 'hot_sell' AND entry_fee = 1 THEN 200 -- $2 for 1 token hot sell
  WHEN tournament_type = 'hot_sell' AND entry_fee = 2 THEN 300 -- $3 for 2 token hot sell  
  WHEN tournament_type = 'hot_sell' AND entry_fee = 3 THEN 500 -- $5 for 3 token hot sell
  ELSE prize_pool
END
WHERE tournament_type = 'hot_sell';

SELECT 'Fixed prize tiers added with correct tournament types!' as status;
