-- ============================================================================
-- RESET ALL HOT SELL LISTINGS FOR TESTING
-- ============================================================================
-- Clears all participants and resets sessions
-- Allows same user to test multiple times
-- ============================================================================

BEGIN;

SELECT '🔧 Resetting all Hot Sell listings for testing...' as step;

-- Delete all participants from all sessions
DELETE FROM public.hot_sell_participants;

SELECT '✅ Cleared all participants' as result;

-- Reset all active sessions
UPDATE public.hot_sell_sessions
SET 
  prize_pool = 0,
  participants_count = 0,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = NULL,
  second_place_prize = NULL,
  third_place_prize = NULL,
  platform_fee = NULL,
  completed_at = NULL,
  updated_at = NOW()
WHERE status = 'active';

SELECT '✅ Reset ' || COUNT(*) || ' active sessions' as result
FROM public.hot_sell_sessions WHERE status = 'active';

-- Change any completed sessions back to active
UPDATE public.hot_sell_sessions
SET 
  status = 'active',
  prize_pool = 0,
  participants_count = 0,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = NULL,
  second_place_prize = NULL,
  third_place_prize = NULL,
  platform_fee = NULL,
  completed_at = NULL,
  updated_at = NOW()
WHERE status = 'completed';

SELECT '✅ Reactivated ' || COUNT(*) || ' completed sessions' as result
FROM public.hot_sell_sessions WHERE status = 'active';

-- Show all active sessions
SELECT 
  c.game_type,
  c.title,
  c.entry_fee,
  c.max_participants,
  s.prize_pool,
  s.participants_count,
  s.status
FROM public.hot_sell_configs c
JOIN public.hot_sell_sessions s ON s.config_id = c.id
WHERE s.status = 'active'
ORDER BY c.entry_fee, c.game_type;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 ALL LISTINGS RESET!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ All participants cleared' as status;
SELECT '✅ All sessions reset to $0' as status;
SELECT '✅ You can now test again!' as status;
SELECT '🎉 ================================' as message;

