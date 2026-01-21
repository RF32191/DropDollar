-- ============================================================================
-- RESET ALL WINNER TAKES ALL LISTINGS FOR TESTING
-- ============================================================================
-- This script clears all participants and resets all WTA sessions to 0
-- Use this to clean slate for testing the WTA page
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Starting Winner Takes All Reset for Testing...';
END $$;

-- ============================================================================
-- STEP 1: Delete all WTA participants
-- ============================================================================
DELETE FROM winner_takes_all_participants;

DO $$ 
BEGIN
  RAISE NOTICE 'Deleted all WTA participants';
END $$;

-- ============================================================================
-- STEP 2: Reset all WTA sessions
-- ============================================================================
UPDATE winner_takes_all_sessions
SET 
  prize_pool = 0,
  participants_count = 0,
  status = 'waiting',
  winner_user_id = NULL,
  winner_prize = NULL,
  platform_fee_amount = NULL,
  timer_started_at = NULL,
  completed_at = NULL,
  updated_at = NOW()
WHERE status IN ('active', 'completed', 'waiting');

DO $$ 
BEGIN
  RAISE NOTICE 'Reset all WTA sessions to 0 progress';
END $$;

-- ============================================================================
-- STEP 3: Verify the reset
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '=== WINNER TAKES ALL RESET COMPLETE ===';
  RAISE NOTICE 'All participants removed';
  RAISE NOTICE 'All sessions reset to waiting state';
  RAISE NOTICE 'All prize pools set to $0.00';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Current WTA Sessions:';
END $$;

SELECT 
  config_id,
  participants_count || ' players' as players,
  '$' || COALESCE(prize_pool, 0)::TEXT as prize_pool,
  status,
  CASE 
    WHEN timer_started_at IS NULL THEN 'Not started'
    ELSE 'Timer: ' || EXTRACT(EPOCH FROM (NOW() - timer_started_at))::TEXT || 's'
  END as timer_status
FROM winner_takes_all_sessions
WHERE status = 'waiting'
ORDER BY config_id;

-- ============================================================================
-- STEP 4: Show participant count (should be 0)
-- ============================================================================
DO $$ 
DECLARE
  participant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO participant_count FROM winner_takes_all_participants;
  RAISE NOTICE ' ';
  RAISE NOTICE 'Total participants remaining: %', participant_count;
  
  IF participant_count = 0 THEN
    RAISE NOTICE 'All WTA listings successfully reset to 0!';
  ELSE
    RAISE WARNING 'Still have % participants remaining', participant_count;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE 'Winner Takes All page is ready for testing!';
  RAISE NOTICE 'Refresh your browser to see all listings at 0%%';
  RAISE NOTICE ' ';
END $$;
