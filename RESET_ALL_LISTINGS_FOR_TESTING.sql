-- ============================================================================
-- RESET ALL LISTINGS FOR TESTING
-- ============================================================================
-- This script resets all tournament/listing data for fresh testing
-- Run this in your Supabase SQL Editor
-- 
-- ⚠️ WARNING: This will DELETE all tournament/listing progress!
-- This is for TESTING ONLY - do not run in production with real users
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Reset 1v1 Tournament Data
-- ============================================================================

-- Delete all 1v1 participants (scores, entries)
DELETE FROM public.one_v_one_participants WHERE true;
RAISE NOTICE '✅ Cleared one_v_one_participants';

-- Reset 1v1 sessions to waiting state
UPDATE public.one_v_one_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pool = 0,
    prize_pool = 0,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    completed_at = NULL,
    updated_at = NOW();
RAISE NOTICE '✅ Reset one_v_one_sessions to waiting state';

-- Alternatively, delete all 1v1 sessions and let them be recreated
-- DELETE FROM public.one_v_one_sessions WHERE true;

-- ============================================================================
-- STEP 2: Reset Hot Sell / Marketplace Sessions
-- ============================================================================

-- Delete all marketplace sessions (game results)
DELETE FROM public.marketplace_sessions WHERE true;
RAISE NOTICE '✅ Cleared marketplace_sessions';

-- Reset marketplace listings to active state with fresh timers
UPDATE public.marketplace_listings
SET 
    status = 'active',
    current_entries = 0,
    current_pool = 0,
    winner_id = NULL,
    winning_score = NULL,
    completed_at = NULL,
    -- Reset timer to 24 hours from now
    timer_ends_at = NOW() + INTERVAL '24 hours',
    updated_at = NOW();
RAISE NOTICE '✅ Reset marketplace_listings to active state';

-- ============================================================================
-- STEP 3: Reset Hot Sell Tournaments (if they exist)
-- ============================================================================

-- Delete hot sell sessions
DELETE FROM public.hot_sell_sessions WHERE true;
RAISE NOTICE '✅ Cleared hot_sell_sessions (if table exists)';

-- Reset hot sell tournaments
UPDATE public.hot_sell_tournaments
SET 
    status = 'active',
    current_participants = 0,
    winner_id = NULL,
    winning_score = NULL,
    completed_at = NULL,
    started_at = NOW(),
    updated_at = NOW();
RAISE NOTICE '✅ Reset hot_sell_tournaments (if table exists)';

-- ============================================================================
-- STEP 4: Reset Game History (Optional - uncomment if needed)
-- ============================================================================

-- Uncomment to clear all game history
-- DELETE FROM public.game_history WHERE true;
-- RAISE NOTICE '✅ Cleared game_history';

-- ============================================================================
-- STEP 5: Reset User Balances/Tokens (Optional - uncomment if needed)
-- ============================================================================

-- Uncomment to reset all user tokens to a specific amount (e.g., 1000)
-- UPDATE public.user_balances SET tokens = 1000, updated_at = NOW();
-- RAISE NOTICE '✅ Reset all user tokens to 1000';

-- Uncomment to reset a specific user's tokens (replace with your email)
-- UPDATE public.user_balances 
-- SET tokens = 1000, updated_at = NOW()
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com');
-- RAISE NOTICE '✅ Reset rf32191@gmail.com tokens to 1000';

-- ============================================================================
-- STEP 6: Clean up any orphaned data
-- ============================================================================

-- Delete listing entries
DELETE FROM public.listing_entries WHERE true;
RAISE NOTICE '✅ Cleared listing_entries (if table exists)';

-- Delete tournament participants
DELETE FROM public.tournament_participants WHERE true;
RAISE NOTICE '✅ Cleared tournament_participants (if table exists)';

-- Reset daily tournaments
UPDATE public.daily_tournaments
SET 
    status = 'active',
    current_participants = 0,
    current_prize_pool = 0,
    winner_id = NULL,
    completed_at = NULL,
    updated_at = NOW();
RAISE NOTICE '✅ Reset daily_tournaments (if table exists)';

COMMIT;

-- ============================================================================
-- VERIFICATION - Check what was reset
-- ============================================================================

SELECT '=== RESET VERIFICATION ===' as status;

-- Check 1v1 status
SELECT 
    'one_v_one_sessions' as table_name,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM public.one_v_one_sessions;

SELECT 
    'one_v_one_participants' as table_name,
    COUNT(*) as total_participants
FROM public.one_v_one_participants;

-- Check marketplace status
SELECT 
    'marketplace_listings' as table_name,
    COUNT(*) as total_listings,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM public.marketplace_listings;

SELECT 
    'marketplace_sessions' as table_name,
    COUNT(*) as total_sessions
FROM public.marketplace_sessions;

-- Done!
SELECT '✅ ALL LISTINGS RESET FOR TESTING!' as result;

