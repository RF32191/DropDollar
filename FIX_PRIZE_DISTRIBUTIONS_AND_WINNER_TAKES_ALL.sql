-- FIXED PRIZE DISTRIBUTIONS AND WINNER TAKES IT ALL
-- This fixes the prize distributions and makes Winner Takes It All work

-- 1. Update $2 Hot Sell to 2 players max with correct distribution
UPDATE public.fixed_games_config 
SET 
  max_participants = 2,
  prize_pool = 200, -- $2 total
  description = '2-player tournament! 1st gets $1.50, 2nd gets $0.35. Platform fee: $0.15'
WHERE title = '$2 Hot Sell - Laser Dodge';

-- 2. Update $10 Hot Sell to correct distribution (4-way split including platform fee)
UPDATE public.fixed_games_config 
SET 
  prize_pool = 1000, -- $10 total
  description = '1st gets most, 2nd gets less, 3rd gets least. Platform fee: 15%'
WHERE title LIKE '%$10%' AND tournament_type = 'hot_sell';

-- 3. Ensure Winner Takes It All configs exist and work properly
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
  'hot_sell',
  'Winner Takes It All - Multi Target',
  'Winner takes everything! Base pot: $3, grows with each player.',
  1, -- 1 token entry
  300, -- $3 base prize pool (300 cents)
  1000, -- Unlimited participants
  90, -- 1.5 minutes
  16, -- RNG seed
  NOW()
) ON CONFLICT DO NOTHING;

-- 4. Create sessions for all configs
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

SELECT 'Prize distributions fixed and Winner Takes It All configured!' as status;
