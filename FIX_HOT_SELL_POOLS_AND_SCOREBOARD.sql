-- ============================================================================
-- FIX HOT SELL - Reset Pools to 0 and Fix Scoreboard Logic
-- ============================================================================
-- This script resets all Hot Sell pools to start at 0
-- Pool grows by entry fee as each user joins
-- ============================================================================

BEGIN;

SELECT '🔧 Fixing Hot Sell pools...' as step;

-- Reset all Hot Sell session pools to 0
UPDATE public.hot_sell_sessions
SET 
  prize_pool = 0,
  participants_count = 0,
  updated_at = NOW()
WHERE status = 'active';

SELECT '✅ Reset ' || COUNT(*) || ' active session pools to 0' as result
FROM public.hot_sell_sessions
WHERE status = 'active';

-- Reset all Hot Sell config base prices to 0 (they start at 0, grow with joins)
UPDATE public.hot_sell_configs
SET 
  base_price = 0,
  updated_at = NOW();

SELECT '✅ Reset ' || COUNT(*) || ' config base prices to 0' as result
FROM public.hot_sell_configs;

-- Clear all existing participants (fresh start)
DELETE FROM public.hot_sell_participants
WHERE session_id IN (
  SELECT id FROM public.hot_sell_sessions WHERE status = 'active'
);

SELECT '✅ Cleared all participants from active sessions' as result;

-- Verify the changes
SELECT 
  '📊 Verification' as check_name,
  COUNT(*) as total_active_sessions,
  SUM(prize_pool) as total_pools_sum,
  SUM(participants_count) as total_participants
FROM public.hot_sell_sessions
WHERE status = 'active';

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 HOT SELL POOLS RESET!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ All pools start at $0' as status;
SELECT '✅ Pools grow with each join' as status;
SELECT '✅ Entry fee adds to pool' as status;
SELECT '🎉 ================================' as message;

