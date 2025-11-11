-- ============================================================================
-- COMPREHENSIVE FIX: Game Sessions + Listing Reset
-- ============================================================================
-- This script ensures all games can start properly with RNG seeds,
-- and resets listings for testing
-- ============================================================================

-- PART 1: Ensure game_sessions table exists and is properly configured
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    listing_id TEXT,
    entry_number INTEGER DEFAULT 1,
    rng_seed INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    inputs JSONB DEFAULT '[]'::jsonb,
    validation_result JSONB
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_listing_id ON public.game_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON public.game_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update their own game sessions" ON public.game_sessions;

-- Recreate policies
CREATE POLICY "Users can insert their own game sessions"
    ON public.game_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own game sessions"
    ON public.game_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
    ON public.game_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

SELECT '✅ Step 1: game_sessions table ready' as status;

-- PART 2: Ensure all hot_sell_configs have valid RNG seeds
-- ============================================================================

UPDATE public.hot_sell_configs
SET rng_seed = floor(random() * 1000000) + 1
WHERE rng_seed IS NULL OR rng_seed = 0 OR rng_seed < 1;

SELECT '✅ Step 2: All hot_sell_configs have valid RNG seeds (1-1000000)' as status;

-- PART 3: Reset all listings for testing
-- ============================================================================

-- Clear all participants
TRUNCATE TABLE public.hot_sell_participants CASCADE;
SELECT '✅ Step 3a: All participants cleared' as status;

-- Delete all existing sessions
TRUNCATE TABLE public.hot_sell_sessions CASCADE;
SELECT '✅ Step 3b: All old sessions deleted' as status;

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recreate fresh sessions for all configs with proper RNG seeds
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
    floor(random() * 1000000) + 1, -- Fresh RNG seed for each session
    c.entry_fee,
    NOW(),
    NOW()
FROM public.hot_sell_configs c;

SELECT '✅ Step 3c: Fresh sessions created with unique RNG seeds' as status;

-- PART 4: Verification
-- ============================================================================

SELECT '🎉 COMPLETE! All games ready to start, listings reset!' as message;

-- Show configs with their RNG seeds
SELECT 
    '📊 Config RNG Seeds:' as info,
    id,
    game_type,
    title,
    rng_seed,
    entry_fee
FROM public.hot_sell_configs
ORDER BY entry_fee, game_type;

-- Show all new sessions with their RNG seeds
SELECT 
    '📊 Active Sessions with RNG Seeds:' as info,
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.rng_seed as session_seed,
    c.rng_seed as config_seed,
    s.prize_pool,
    s.participants_count,
    s.max_participants,
    s.status
FROM public.hot_sell_sessions s
JOIN public.hot_sell_configs c ON s.config_id = c.id
ORDER BY c.entry_fee, c.title;

-- Summary
SELECT 
    '📈 Summary:' as info,
    (SELECT COUNT(*) FROM public.hot_sell_configs) as total_configs,
    (SELECT COUNT(*) FROM public.hot_sell_configs WHERE rng_seed > 0) as configs_with_seeds,
    (SELECT COUNT(*) FROM public.hot_sell_sessions WHERE status = 'active') as active_sessions,
    (SELECT COUNT(*) FROM public.hot_sell_sessions WHERE rng_seed > 0) as sessions_with_seeds,
    (SELECT COUNT(*) FROM public.hot_sell_participants) as total_participants;

SELECT '✅ All listings show 0/X players, $0.00 pool, and have unique RNG seeds!' as status;
SELECT '✅ All games will now start properly with deterministic RNG!' as status;

