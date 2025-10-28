-- ============================================================================
-- PRODUCTION-SAFE HOT SELL SYSTEM UPDATE
-- This uses ALTER TABLE instead of DROP to preserve existing data
-- ============================================================================

-- ============================================================================
-- UPDATE EXISTING TABLES (SAFE FOR PRODUCTION)
-- ============================================================================

-- Add missing columns to hot_sell_sessions if they don't exist
DO $$
BEGIN
  -- Add base_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' AND column_name = 'base_price'
  ) THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN base_price NUMERIC;
    RAISE NOTICE 'Added base_price column to hot_sell_sessions';
  END IF;

  -- Add max_participants column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN max_participants INTEGER;
    RAISE NOTICE 'Added max_participants column to hot_sell_sessions';
  END IF;

  -- Update base_price and max_participants from configs for existing sessions
  UPDATE hot_sell_sessions s
  SET 
    base_price = c.base_price,
    max_participants = c.max_participants
  FROM hot_sell_configs c
  WHERE s.config_id = c.id
    AND (s.base_price IS NULL OR s.max_participants IS NULL);
  
  RAISE NOTICE 'Updated existing sessions with base_price and max_participants';
END $$;

-- Update hot_sell_configs to have correct prize percentages
UPDATE hot_sell_configs
SET 
  first_place_percent = 50,
  second_place_percent = 20,
  third_place_percent = 15,
  platform_fee_percent = 15,
  description = '1st: 50%, 2nd: 20%, 3rd: 15%'
WHERE first_place_percent != 50 OR second_place_percent != 20;

RAISE NOTICE '✅ Hot Sell tables updated for production!';
RAISE NOTICE '📊 Prize percentages: 1st (50%), 2nd (20%), 3rd (15%)';
RAISE NOTICE '💰 Platform fee: 15%';

