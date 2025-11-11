-- ============================================================================
-- RESET ALL HOT SELL LISTINGS - Clear all participants and reset to zero
-- ============================================================================
-- This resets all Hot Sell sessions back to fresh state
-- Use this when you need to clear rate limits or start fresh
-- ============================================================================

SELECT '🔄 Resetting all Hot Sell listings...' as step;

-- Delete all participants (clears all joins)
DELETE FROM hot_sell_participants;

SELECT '✅ Cleared all participants' as result;

-- Reset all sessions to clean state
UPDATE hot_sell_sessions
SET 
  participants_count = 0,
  prize_pool = base_price,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = NULL,
  second_place_prize = NULL,
  third_place_prize = NULL,
  platform_fee = NULL,
  status = 'active',
  completed_at = NULL,
  updated_at = NOW();

SELECT '✅ Reset all sessions to clean state' as result;

-- Verify reset
SELECT 
  '📊 Verification' as check_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE participants_count = 0) as empty_sessions,
  SUM(participants_count) as total_participants
FROM hot_sell_sessions;

SELECT '🎉 All Hot Sell listings reset!' as message;
SELECT 'All rate limits cleared, ready for fresh games!' as status;

