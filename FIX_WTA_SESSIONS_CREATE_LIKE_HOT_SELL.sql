-- ============================================================================
-- FIX WINNER TAKES ALL SESSIONS - MIRROR HOT SELL WORKING SOLUTION
-- This script creates WTA sessions exactly like Hot Sell sessions are created
-- ============================================================================

-- PART 1: Grant permissions first (for signed-out users)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
SELECT '✅ Step 1: Granted permissions to anon users' as status;

-- PART 2: Ensure all WTA configs have valid RNG seeds
-- ============================================================================
UPDATE public.winner_takes_all_configs
SET rng_seed = floor(random() * 1000000) + 1
WHERE rng_seed IS NULL OR rng_seed = 0 OR rng_seed < 1;

SELECT '✅ Step 2: All winner_takes_all_configs have valid RNG seeds (1-1000000)' as status;

-- PART 3: Reset all WTA listings for testing (EXACTLY like Hot Sell)
-- ============================================================================

-- Clear all participants
TRUNCATE TABLE public.winner_takes_all_participants CASCADE;
SELECT '✅ Step 3a: All WTA participants cleared' as status;

-- Delete all existing sessions
TRUNCATE TABLE public.winner_takes_all_sessions CASCADE;
SELECT '✅ Step 3b: All old WTA sessions deleted' as status;

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recreate fresh sessions for all configs with proper RNG seeds (EXACTLY like Hot Sell)
INSERT INTO public.winner_takes_all_sessions (
    id,
    config_id,
    prize_pool,
    participants_count,
    status,
    rng_seed,
    base_price,
    timer_duration,
    created_at,
    updated_at
)
SELECT
    uuid_generate_v4(),
    c.id,
    0,
    0,
    'waiting',
    floor(random() * 1000000) + 1, -- Fresh RNG seed for each session
    c.base_price,
    60, -- 1 minute timer for testing
    NOW(),
    NOW()
FROM public.winner_takes_all_configs c;

SELECT '✅ Step 3c: Fresh WTA sessions created with unique RNG seeds' as status;

-- PART 4: Verification
-- ============================================================================

SELECT '🎉 COMPLETE! All Winner Takes All games ready, listings reset!' as message;

-- Show configs with their RNG seeds
SELECT 
    '📊 WTA Config RNG Seeds:' as info,
    id,
    game_type,
    title,
    rng_seed,
    timer_duration
FROM public.winner_takes_all_configs
ORDER BY base_price ASC;

-- Show sessions with their RNG seeds
SELECT 
    '📊 WTA Session RNG Seeds:' as info,
    id,
    config_id,
    status,
    prize_pool,
    participants_count,
    timer_duration,
    rng_seed
FROM public.winner_takes_all_sessions
ORDER BY created_at DESC;

-- Count check
SELECT 
    '📈 Summary:' as info,
    (SELECT COUNT(*) FROM public.winner_takes_all_configs) as total_configs,
    (SELECT COUNT(*) FROM public.winner_takes_all_sessions WHERE status = 'waiting') as waiting_sessions,
    (SELECT COUNT(*) FROM public.winner_takes_all_participants) as total_participants;

SELECT '
✅ WINNER TAKES ALL SESSIONS FIXED!

What this did (same as Hot Sell fix):
1. Granted execute permissions to anon (signed-out) users
2. Updated all configs with valid RNG seeds
3. Cleared all old participants and sessions (TRUNCATE)
4. Created fresh sessions using uuid_generate_v4()
5. Set status to "waiting" (not "active")
6. 1 minute timer for testing

Result:
- WTA sessions now exist and are findable
- Signed-out users can view sessions
- Ready to join and test!

Next steps:
- Refresh Winner Takes All page
- Sessions should now appear
- Test joining and playing
' as summary;

