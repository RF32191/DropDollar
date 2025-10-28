-- ============================================================================
-- SET WINNER TAKES ALL TIMER TO 30 MINUTES
-- ============================================================================
-- This updates the timer_duration to 1800 seconds (30 minutes) for all sessions
-- ============================================================================

-- Update all existing sessions to 30-minute timer
UPDATE winner_takes_all_sessions
SET timer_duration = 1800
WHERE timer_duration IS NULL OR timer_duration != 1800;

-- Ensure the default is set to 30 minutes (1800 seconds)
ALTER TABLE winner_takes_all_sessions 
  ALTER COLUMN timer_duration SET DEFAULT 1800;

-- Summary
DO $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions;
  
  RAISE NOTICE '✅ Winner Takes All timer set to 30 minutes (1800 seconds)';
  RAISE NOTICE '📊 Total sessions updated: %', session_count;
  RAISE NOTICE '⏱️  Timer starts when base price is reached';
  RAISE NOTICE '🎯 Winner is determined after timer expires';
END $$;

