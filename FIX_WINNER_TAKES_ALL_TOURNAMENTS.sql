-- FIX WINNER TAKES IT ALL TOURNAMENTS
-- This fixes the existing Winner Takes It All tournaments and adds $2500

-- 1. Update existing Winner Takes It All tournaments to have correct titles and configurations
UPDATE public.fixed_games_config 
SET 
  title = CASE 
    WHEN title LIKE '%$100 Winner Takes It All%' THEN '$100 Winner Takes It All - Laser Dodge'
    WHEN title LIKE '%$250 Winner Takes It All%' THEN '$250 Winner Takes It All - Multi Target'
    WHEN title LIKE '%$1000 Winner Takes It All%' THEN '$1000 Winner Takes It All - Sword Parry'
    ELSE title
  END,
  description = CASE 
    WHEN title LIKE '%$100 Winner Takes It All%' THEN '1 winner takes the entire $100 prize pool! $1 entry, unlimited players, base price $10'
    WHEN title LIKE '%$250 Winner Takes It All%' THEN '1 winner takes the entire $250 prize pool! $1 entry, unlimited players, base price $25'
    WHEN title LIKE '%$1000 Winner Takes It All%' THEN '1 winner takes the entire $1000 prize pool! $1 entry, unlimited players, base price $100'
    ELSE description
  END,
  prize_pool = CASE 
    WHEN title LIKE '%$100 Winner Takes It All%' THEN 100
    WHEN title LIKE '%$250 Winner Takes It All%' THEN 250
    WHEN title LIKE '%$1000 Winner Takes It All%' THEN 1000
    ELSE prize_pool
  END,
  max_participants = 999999 -- Simulate unlimited
WHERE title LIKE '%Winner Takes It All%';

-- 2. Add $2500 Winner Takes It All tournament
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
  '$2500 Winner Takes It All - Laser Dodge',
  '1 winner takes the entire $2500 prize pool! $1 entry, unlimited players, base price $250',
  1,
  2500,
  999999, -- Simulate unlimited
  180,
  20,
  NOW()
);

-- 3. Create session for $2500 Winner Takes It All
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
  base_price INTEGER;
BEGIN
  -- Find the $2500 Winner Takes It All config
  SELECT * INTO config_rec FROM public.fixed_games_config WHERE title LIKE '%$2500 Winner Takes It All%';
  
  IF FOUND THEN
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
        created_at
      ) VALUES (
        gen_random_uuid(),
        config_rec.id,
        0, -- Start with empty pot
        base_price, -- Use base price as target_pot (10% of prize pool)
        0, -- Start with 0 participants
        'waiting', -- Waiting for base price
        NOW()
      );
      
      RAISE NOTICE 'Created $2500 Winner Takes It All session (Base Price: $%)', base_price;
    END IF;
  END IF;
END $$;

-- 4. Reset all Winner Takes It All sessions to start fresh
UPDATE public.hot_sell_sessions 
SET 
  current_pot = 0,
  participants_count = 0,
  status = 'waiting'
WHERE config_id IN (
  SELECT id FROM public.fixed_games_config 
  WHERE title LIKE '%Winner Takes It All%'
);

SELECT 'Winner Takes It All tournaments fixed and $2500 added!' as status;
