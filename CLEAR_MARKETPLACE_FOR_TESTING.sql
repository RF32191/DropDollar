-- ============================================================================
-- CLEAR ALL MARKETPLACE DATA FOR TESTING
-- ============================================================================
-- This script clears:
-- 1. All marketplace participants
-- 2. All marketplace sessions
-- 3. All marketplace messages
-- 4. All marketplace listings
-- ============================================================================

-- Step 1: Delete all participants (must be first due to foreign keys)
DELETE FROM public.marketplace_participants;

SELECT '✅ Step 1: Cleared all marketplace participants' as status;

-- Step 2: Delete all messages
DELETE FROM public.marketplace_messages;

SELECT '✅ Step 2: Cleared all marketplace messages' as status;

-- Step 3: Delete all sessions
DELETE FROM public.marketplace_sessions;

SELECT '✅ Step 3: Cleared all marketplace sessions' as status;

-- Step 4: Delete all listings
DELETE FROM public.marketplace_listings;

SELECT '✅ Step 4: Cleared all marketplace listings' as status;

-- Step 5: Show counts (should all be 0)
SELECT 
    '🔍 VERIFICATION: All counts should be 0' as info,
    (SELECT COUNT(*) FROM public.marketplace_participants) as participants_count,
    (SELECT COUNT(*) FROM public.marketplace_messages) as messages_count,
    (SELECT COUNT(*) FROM public.marketplace_sessions) as sessions_count,
    (SELECT COUNT(*) FROM public.marketplace_listings) as listings_count;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║          ✅ MARKETPLACE CLEARED FOR TESTING!                   ║
╚════════════════════════════════════════════════════════════════╝

WHAT WAS CLEARED:
✅ All marketplace participants
✅ All marketplace messages
✅ All marketplace sessions
✅ All marketplace listings

VERIFICATION:
Check the counts above - all should be 0

READY TO TEST:
1. Create new listings
2. Join and play games
3. Test scoreboard functionality
4. Test winner address submission
5. Test seller messaging

Fresh start! 🎮✨
' as success_message;

