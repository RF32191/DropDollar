-- ============================================================================
-- DEBUG AND FORCE RESET HOT SELL LISTINGS
-- ============================================================================
-- First let's see what's actually in the database
-- ============================================================================

-- Check current sessions
SELECT 
    '🔍 Current Sessions Before Reset:' as info,
    s.id as session_id,
    s.config_id,
    s.prize_pool,
    s.participants_count,
    s.max_participants,
    s.status,
    s.rng_seed
FROM public.hot_sell_sessions s
ORDER BY s.created_at DESC;

-- Check participants
SELECT 
    '👥 Current Participants Before Reset:' as info,
    COUNT(*) as total
FROM public.hot_sell_participants;

-- ============================================================================
-- AGGRESSIVE RESET - Delete and recreate everything
-- ============================================================================

-- Step 1: Delete ALL participants (with CASCADE if needed)
TRUNCATE TABLE public.hot_sell_participants CASCADE;
SELECT '✅ Step 1: All participants deleted' as status;

-- Step 2: Delete ALL sessions
TRUNCATE TABLE public.hot_sell_sessions CASCADE;
SELECT '✅ Step 2: All sessions deleted' as status;

-- Step 3: Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT '✅ Step 3: UUID extension ready' as status;

-- Step 4: Recreate fresh sessions for ALL configs
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
    0,
    0,
    c.max_participants,
    'active',
    floor(random() * 1000000) + 1,
    c.entry_fee,
    NOW(),
    NOW()
FROM public.hot_sell_configs c;

SELECT '✅ Step 4: Fresh sessions created for all configs' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '🎉 AGGRESSIVE RESET COMPLETE!' as message;

-- Show all new sessions
SELECT 
    '📊 New Sessions Created:' as info,
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.entry_fee,
    s.prize_pool,
    s.participants_count,
    s.max_participants,
    s.status,
    s.rng_seed,
    s.base_price
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
ORDER BY c.entry_fee, c.title;

-- Count everything
SELECT 
    '📈 Summary:' as info,
    (SELECT COUNT(*) FROM public.hot_sell_configs) as total_configs,
    (SELECT COUNT(*) FROM public.hot_sell_sessions WHERE status = 'active') as active_sessions,
    (SELECT COUNT(*) FROM public.hot_sell_participants) as total_participants;

SELECT '✅ All listings should now show 0/X players and $0.00 pool!' as status;

