-- ============================================================================
-- QUICK RESET ALL HOT SELL LISTINGS FOR TESTING
-- ============================================================================
-- Run this whenever you want to clear all players and reset listings to 0/5
-- ============================================================================

-- Step 1: Clear all participants
TRUNCATE TABLE public.hot_sell_participants CASCADE;

-- Step 2: Delete all existing sessions
TRUNCATE TABLE public.hot_sell_sessions CASCADE;

-- Step 3: Create fresh sessions for all configs
INSERT INTO public.hot_sell_sessions (
    id,
    config_id,
    prize_pool,
    participants_count,
    max_participants,
    status,
    rng_seed,
    base_price,
    created_at,
    updated_at
)
SELECT
    uuid_generate_v4(),
    c.id,
    0,  -- Prize pool starts at 0
    0,  -- No participants yet
    c.max_participants,
    'active',
    floor(random() * 1000000) + 1,  -- Fresh RNG seed
    c.entry_fee,  -- Base price matches entry fee
    NOW(),
    NOW()
FROM public.hot_sell_configs c;

-- ============================================================================
-- DONE! All listings reset
-- ============================================================================

SELECT '✅ ALL LISTINGS RESET!' as status;
SELECT '📊 Active Sessions:' as info, COUNT(*) as total FROM public.hot_sell_sessions WHERE status = 'active';
SELECT '👥 Participants:' as info, COUNT(*) as total FROM public.hot_sell_participants;

-- Show all active sessions
SELECT 
    c.title as game,
    c.entry_fee as fee,
    s.participants_count as players,
    s.max_participants as max,
    s.prize_pool as pool,
    s.rng_seed as seed
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
WHERE s.status = 'active'
ORDER BY c.entry_fee, c.title;

