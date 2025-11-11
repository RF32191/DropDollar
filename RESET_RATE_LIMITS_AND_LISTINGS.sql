-- ============================================================================
-- RESET RATE LIMITS AND CLEAR ALL LISTINGS - Complete Testing Reset
-- ============================================================================
-- This script clears ALL rate limits and resets ALL game listings
-- Perfect for fresh testing without any restrictions
-- ============================================================================

SELECT '🔄 Starting complete reset...' as step;

-- ============================================================================
-- STEP 1: Clear all user rate limits
-- ============================================================================
SELECT '📊 Resetting all user rate limits...' as step;

-- Reset all rate limit counters to zero
UPDATE user_rate_limits
SET 
  games_last_hour = 0,
  games_last_day = 0,
  last_game_at = NULL,
  hourly_reset_at = NOW(),
  daily_reset_at = NOW(),
  updated_at = NOW();

-- Get count of users reset
SELECT 
  '✅ Rate limits reset for ' || COUNT(*) || ' users' as result
FROM user_rate_limits;

-- Clear any active bans
DELETE FROM user_bans WHERE is_permanent = FALSE;
UPDATE user_bans SET banned_until = NOW() WHERE is_permanent = TRUE; -- Expire permanent bans for testing

SELECT '✅ All bans cleared' as result;

-- ============================================================================
-- STEP 2: Clear all Hot Sell participants
-- ============================================================================
SELECT '🎮 Clearing all Hot Sell participants...' as step;

DELETE FROM hot_sell_participants;

SELECT '✅ All participants cleared' as result;

-- ============================================================================
-- STEP 3: Reset all Hot Sell sessions
-- ============================================================================
SELECT '🎯 Resetting all Hot Sell sessions...' as step;

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

SELECT 
  '✅ Reset ' || COUNT(*) || ' Hot Sell sessions' as result
FROM hot_sell_sessions;

-- ============================================================================
-- STEP 4: Clear any anti-cheat flags (if table exists)
-- ============================================================================
SELECT '🔒 Clearing anti-cheat logs...' as step;

-- Only delete unreviewed flags to allow historical review
DELETE FROM anti_cheat_logs 
WHERE reviewed_at IS NULL;

SELECT '✅ Cleared unreviewed anti-cheat flags' as result;

-- ============================================================================
-- STEP 5: Verification Report
-- ============================================================================
SELECT '📋 === VERIFICATION REPORT ===' as section;

-- Rate Limits Check
SELECT 
  '🔓 Rate Limits' as check_type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE games_last_hour = 0) as users_at_zero_hourly,
  COUNT(*) FILTER (WHERE games_last_day = 0) as users_at_zero_daily
FROM user_rate_limits;

-- Hot Sell Sessions Check
SELECT 
  '🎮 Hot Sell Sessions' as check_type,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE participants_count = 0) as empty_sessions,
  SUM(participants_count) as total_participants
FROM hot_sell_sessions;

-- Hot Sell Participants Check
SELECT 
  '👥 Hot Sell Participants' as check_type,
  COUNT(*) as remaining_participants
FROM hot_sell_participants;

-- Anti-cheat Check
SELECT 
  '🛡️ Anti-Cheat' as check_type,
  COUNT(*) FILTER (WHERE reviewed_at IS NULL) as pending_flags,
  COUNT(*) FILTER (WHERE reviewed_at IS NOT NULL) as reviewed_flags
FROM anti_cheat_logs;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT '🎉 ================================' as message;
SELECT '🎉 RESET COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✨ All rate limits cleared' as status;
SELECT '✨ All listings reset to fresh state' as status;
SELECT '✨ All participants removed' as status;
SELECT '✨ Ready for testing!' as status;
SELECT '🎉 ================================' as message;

