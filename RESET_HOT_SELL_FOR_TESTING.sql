-- ============================================================================
-- RESET ALL HOT SELL LISTINGS FOR TESTING
-- ============================================================================
-- This script clears all participants and resets all hot sell sessions to 0
-- Use this to clean slate for testing the hot sell page
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting Hot Sell Reset for Testing...';
END $$;

-- ============================================================================
-- STEP 1: Delete all Hot Sell participants
-- ============================================================================
DELETE FROM hot_sell_participants;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Deleted all Hot Sell participants';
END $$;

-- ============================================================================
-- STEP 2: Reset all Hot Sell sessions
-- ============================================================================
UPDATE hot_sell_sessions
SET 
  prize_pool = 0,
  current_pool = 0,
  participants_count = 0,
  status = 'waiting',
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = 0,
  second_place_prize = 0,
  third_place_prize = 0,
  platform_fee = 0,
  completed_at = NULL,
  updated_at = NOW()
WHERE status IN ('active', 'completed', 'waiting');

DO $$ 
BEGIN
  RAISE NOTICE '✅ Reset all Hot Sell sessions to 0 progress';
END $$;

-- ============================================================================
-- STEP 3: Verify the reset
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== HOT SELL RESET COMPLETE ===';
  RAISE NOTICE '✅ All participants removed';
  RAISE NOTICE '✅ All sessions reset to waiting state';
  RAISE NOTICE '✅ All prize pools set to $0.00';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Hot Sell Sessions:';
END $$;

SELECT 
  config_id,
  participants_count || ' players' as players,
  '$' || COALESCE(prize_pool, 0)::TEXT as prize_pool,
  status,
  max_participants || ' max' as capacity
FROM hot_sell_sessions
WHERE status = 'waiting'
ORDER BY config_id;

-- ============================================================================
-- STEP 4: Show participant count (should be 0)
-- ============================================================================
DO $$ 
DECLARE
  participant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO participant_count FROM hot_sell_participants;
  RAISE NOTICE '';
  RAISE NOTICE 'Total participants remaining: %', participant_count;
  
  IF participant_count = 0 THEN
    RAISE NOTICE '✅ All Hot Sell listings successfully reset to 0!';
  ELSE
    RAISE WARNING '⚠️ Still have % participants remaining', participant_count;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Hot Sell page is ready for testing!';
  RAISE NOTICE '📱 Refresh your browser to see all listings at 0%';
  RAISE NOTICE '';
END $$;
