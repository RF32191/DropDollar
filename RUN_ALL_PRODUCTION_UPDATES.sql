-- ============================================================================
-- MASTER PRODUCTION UPDATE SCRIPT
-- Run this in Supabase to update all tables safely for production
-- ============================================================================

-- ============================================================================
-- WINNER TAKES ALL UPDATES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🏆 Updating Winner Takes All tables...';
  
  -- Add timer_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'timer_duration'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN timer_duration INTEGER DEFAULT 1800;
    RAISE NOTICE '  ✓ Added timer_duration column';
  END IF;

  -- Add winner_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'winner_user_id'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN winner_user_id UUID;
    RAISE NOTICE '  ✓ Added winner_user_id column';
  END IF;

  -- Add prize_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'prize_amount'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN prize_amount NUMERIC;
    RAISE NOTICE '  ✓ Added prize_amount column';
  END IF;

  -- Add platform_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN platform_fee NUMERIC;
    RAISE NOTICE '  ✓ Added platform_fee column';
  END IF;

  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE '  ✓ Added completed_at column to sessions';
  END IF;

  -- Add completed_at to participants if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_participants' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE winner_takes_all_participants ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE '  ✓ Added completed_at column to participants';
  END IF;

  -- Ensure score column is NUMERIC (not INTEGER)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_participants' 
    AND column_name = 'score' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE winner_takes_all_participants ALTER COLUMN score TYPE NUMERIC;
    RAISE NOTICE '  ✓ Changed score to NUMERIC type';
  END IF;

  RAISE NOTICE '✅ Winner Takes All updated successfully!';
END $$;

-- ============================================================================
-- HOT SELL UPDATES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔥 Updating Hot Sell tables...';
  
  -- Add base_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' AND column_name = 'base_price'
  ) THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN base_price NUMERIC;
    RAISE NOTICE '  ✓ Added base_price column';
  END IF;

  -- Add max_participants column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN max_participants INTEGER;
    RAISE NOTICE '  ✓ Added max_participants column';
  END IF;

  -- Update base_price and max_participants from configs for existing sessions
  UPDATE hot_sell_sessions s
  SET 
    base_price = COALESCE(s.base_price, c.base_price),
    max_participants = COALESCE(s.max_participants, c.max_participants)
  FROM hot_sell_configs c
  WHERE s.config_id = c.id
    AND (s.base_price IS NULL OR s.max_participants IS NULL);
  
  RAISE NOTICE '  ✓ Updated existing sessions with values from configs';

  -- Update hot_sell_configs to have correct prize percentages
  UPDATE hot_sell_configs
  SET 
    first_place_percent = 50,
    second_place_percent = 20,
    third_place_percent = 15,
    platform_fee_percent = 15,
    description = '1st: 50%, 2nd: 20%, 3rd: 15%'
  WHERE first_place_percent != 50 OR second_place_percent != 20;

  RAISE NOTICE '  ✓ Updated prize percentages: 1st (50%%), 2nd (20%%), 3rd (15%%)';
  RAISE NOTICE '✅ Hot Sell updated successfully!';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ALL PRODUCTION UPDATES COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🏆 Winner Takes All: All columns added';
  RAISE NOTICE '🔥 Hot Sell: All columns added, prize %% updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh your pages to see the updates!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

