-- ============================================================================
-- RESET HOT SELL LISTINGS FOR TESTING
-- ============================================================================
-- This script resets all Hot Sell listings without changing any functions
-- or database structure. Use this to quickly reset for testing.
-- ============================================================================

-- Step 1: Clear all participants
DELETE FROM public.hot_sell_participants;
SELECT '✅ Step 1: All hot_sell_participants cleared' as status;

-- Step 2: Reset all sessions to active state
UPDATE public.hot_sell_sessions
SET
  status = 'active',
  prize_pool = 0,
  participants_count = 0,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = 0,
  second_place_prize = 0,
  third_place_prize = 0,
  platform_fee_amount = 0,
  completed_at = NULL,
  rng_seed = floor(random() * 1000000) + 1, -- Generate new RNG seed for fairness
  created_at = NOW(), -- Reset creation time to bring to top of list
  updated_at = NOW();
SELECT '✅ Step 2: All hot_sell_sessions reset to active with new RNG seeds' as status;

-- Step 3: Ensure all configs have valid RNG seeds
UPDATE public.hot_sell_configs
SET rng_seed = floor(random() * 1000000) + 1
WHERE rng_seed IS NULL OR rng_seed = 0;
SELECT '✅ Step 3: All hot_sell_configs have valid RNG seeds' as status;

-- Step 4: Create missing sessions for any configs without an active session
INSERT INTO public.hot_sell_sessions (
    id, config_id, prize_pool, participants_count, max_participants, status, rng_seed, base_price
)
SELECT
    uuid_generate_v4(),
    c.id,
    0,
    0,
    c.max_participants,
    'active',
    floor(random() * 1000000) + 1, -- Generate new RNG seed
    c.entry_fee
FROM public.hot_sell_configs c
WHERE NOT EXISTS (
    SELECT 1
    FROM public.hot_sell_sessions s
    WHERE s.config_id = c.id AND s.status = 'active'
);
SELECT '✅ Step 4: Missing active sessions created for configs' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '🎉 HOT SELL RESET COMPLETE!' as message;

SELECT 
    '📊 Current Active Sessions:' as info,
    COUNT(*) as total_active_sessions
FROM public.hot_sell_sessions 
WHERE status = 'active';

SELECT 
    '👥 Total Participants:' as info,
    COUNT(*) as total_participants
FROM public.hot_sell_participants;

-- Show all active sessions with details
SELECT 
    '📋 Active Session Details:' as info,
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    s.prize_pool,
    s.participants_count,
    s.max_participants,
    s.status,
    s.rng_seed,
    s.created_at
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;

SELECT '✅ Ready for testing!' as status;

