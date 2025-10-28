-- ============================================================================
-- PRODUCTION-SAFE WINNER TAKES ALL UPDATE
-- This ensures all required columns exist without dropping tables
-- ============================================================================

DO $$
BEGIN
  -- Add timer_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'timer_duration'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN timer_duration INTEGER DEFAULT 1800;
    RAISE NOTICE 'Added timer_duration column to winner_takes_all_sessions';
  END IF;

  -- Add winner_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'winner_user_id'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN winner_user_id UUID;
    RAISE NOTICE 'Added winner_user_id column to winner_takes_all_sessions';
  END IF;

  -- Add prize_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'prize_amount'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN prize_amount NUMERIC;
    RAISE NOTICE 'Added prize_amount column to winner_takes_all_sessions';
  END IF;

  -- Add platform_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN platform_fee NUMERIC;
    RAISE NOTICE 'Added platform_fee column to winner_takes_all_sessions';
  END IF;

  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added completed_at column to winner_takes_all_sessions';
  END IF;

  -- Add completed_at to participants if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_participants' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE winner_takes_all_participants ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added completed_at column to winner_takes_all_participants';
  END IF;

  -- Ensure score and accuracy columns are NUMERIC (not INTEGER)
  -- Check if score is INTEGER type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_participants' 
    AND column_name = 'score' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE winner_takes_all_participants ALTER COLUMN score TYPE NUMERIC;
    RAISE NOTICE 'Changed score column type to NUMERIC';
  END IF;

  RAISE NOTICE '✅ Winner Takes All tables updated for production!';
END $$;

