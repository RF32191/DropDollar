-- ============================================================================
-- ADD RNG SEED TO ALL CONFIG TABLES
-- ============================================================================
-- This ensures all competition configs have RNG seeds for fairness
-- All players in same session will use the same RNG seed
-- ============================================================================

-- ============================================================================
-- STEP 1: Add rng_seed to hot_sell_configs
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hot_sell_configs' 
    AND column_name = 'rng_seed'
  ) THEN
    ALTER TABLE public.hot_sell_configs 
    ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
    
    RAISE NOTICE '✅ Added rng_seed to hot_sell_configs';
  ELSE
    RAISE NOTICE '⚠️  rng_seed already exists in hot_sell_configs';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add rng_seed to winner_takes_all_configs
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'winner_takes_all_configs' 
    AND column_name = 'rng_seed'
  ) THEN
    ALTER TABLE public.winner_takes_all_configs 
    ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
    
    RAISE NOTICE '✅ Added rng_seed to winner_takes_all_configs';
  ELSE
    RAISE NOTICE '⚠️  rng_seed already exists in winner_takes_all_configs';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add rng_seed to one_v_one_configs
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'one_v_one_configs' 
    AND column_name = 'rng_seed'
  ) THEN
    ALTER TABLE public.one_v_one_configs 
    ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
    
    RAISE NOTICE '✅ Added rng_seed to one_v_one_configs';
  ELSE
    RAISE NOTICE '⚠️  rng_seed already exists in one_v_one_configs';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Regenerate RNG seeds for all existing configs (for fairness)
-- ============================================================================

-- Update Hot Sell configs with unique seeds
UPDATE public.hot_sell_configs
SET rng_seed = floor(random() * 2147483647)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

-- Update Winner Takes All configs with unique seeds
UPDATE public.winner_takes_all_configs
SET rng_seed = floor(random() * 2147483647)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

-- Update 1v1 configs with unique seeds
UPDATE public.one_v_one_configs
SET rng_seed = floor(random() * 2147483647)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show Hot Sell configs with RNG seeds
SELECT 
  id,
  game_type,
  entry_fee,
  rng_seed,
  created_at
FROM public.hot_sell_configs
ORDER BY created_at DESC
LIMIT 5;

-- Show Winner Takes All configs with RNG seeds
SELECT 
  id,
  game_type,
  entry_fee,
  rng_seed,
  created_at
FROM public.winner_takes_all_configs
ORDER BY created_at DESC
LIMIT 5;

-- Show 1v1 configs with RNG seeds
SELECT 
  id,
  game_type,
  entry_fee,
  rng_seed,
  created_at
FROM public.one_v_one_configs
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ rng_seed column added to all config tables
-- ✅ All existing configs now have unique RNG seeds
-- ✅ New configs will automatically get RNG seeds
-- ✅ All players in same session will use same RNG = FAIR!
-- ============================================================================

