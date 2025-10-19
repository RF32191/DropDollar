-- REVERT DECIMAL CHANGES AND FIX PRICING
-- This reverts the decimal changes and fixes the pricing structure

-- 1. Revert all prize pools to whole dollar amounts
UPDATE public.fixed_games_config 
SET 
  prize_pool = CASE 
    WHEN title LIKE '%$2 Hot Sell%' THEN 2 -- $2
    WHEN title LIKE '%$3 Winner Takes%' THEN 3 -- $3
    WHEN title LIKE '%$10%' THEN 10 -- $10
    WHEN title LIKE '%$100%' THEN 100 -- $100
    WHEN title LIKE '%$250%' THEN 250 -- $250
    WHEN title LIKE '%$1000%' THEN 1000 -- $1000
    WHEN title LIKE '%$2500%' THEN 2500 -- $2500
    ELSE prize_pool
  END,
  entry_fee = CASE 
    WHEN title LIKE '%$2 Hot Sell%' THEN 1 -- 1 token = $1
    WHEN title LIKE '%$3 Winner Takes%' THEN 1 -- 1 token = $1
    WHEN title LIKE '%$10%' THEN 1 -- 1 token = $1
    WHEN title LIKE '%$100%' THEN 1 -- 1 token = $1
    WHEN title LIKE '%$250%' THEN 1 -- 1 token = $1
    WHEN title LIKE '%$1000%' THEN 1 -- 1 token = $1
    WHEN title LIKE '%$2500%' THEN 1 -- 1 token = $1
    ELSE entry_fee
  END,
  max_participants = CASE 
    WHEN title LIKE '%$2 Hot Sell%' THEN 2 -- 2 players for $2
    WHEN title LIKE '%$3 Winner Takes%' THEN 2 -- 2 players for $3
    WHEN title LIKE '%$10%' THEN 10 -- 10 players for $10
    WHEN title LIKE '%$100%' THEN 100 -- 100 players for $100
    WHEN title LIKE '%$250%' THEN 250 -- 250 players for $250
    WHEN title LIKE '%$1000%' THEN 1000 -- 1000 players for $1000
    WHEN title LIKE '%$2500%' THEN 2500 -- 2500 players for $2500
    ELSE max_participants
  END
WHERE tournament_type = 'hot_sell';

-- 2. Create proper game configs for the standard tiers
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
-- $100 Hot Sell
(gen_random_uuid(), 'laser_dodge', 'hot_sell', '$100 Hot Sell - Laser Dodge', '100-player tournament! Winner takes $85, 2nd gets $15. Platform fee: $15', 1, 100, 100, 120, 17, NOW()),
-- $250 Hot Sell  
(gen_random_uuid(), 'multi_target', 'hot_sell', '$250 Hot Sell - Multi Target', '250-player tournament! Winner takes $212.50, 2nd gets $37.50. Platform fee: $37.50', 1, 250, 250, 120, 18, NOW()),
-- $1000 Hot Sell
(gen_random_uuid(), 'sword_parry', 'hot_sell', '$1000 Hot Sell - Sword Parry', '1000-player tournament! Winner takes $850, 2nd gets $150. Platform fee: $150', 1, 1000, 1000, 120, 19, NOW()),
-- $2500 Hot Sell
(gen_random_uuid(), 'memory_color', 'hot_sell', '$2500 Hot Sell - Memory Color', '2500-player tournament! Winner takes $2125, 2nd gets $375. Platform fee: $375', 1, 2500, 2500, 120, 20, NOW())
ON CONFLICT DO NOTHING;

-- 3. Ensure all configs have sessions
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

SELECT 'Pricing reverted to whole dollars and proper structure!' as status;
