-- ============================================================================
-- COMPLETE WINNER TAKES ALL FIX WITH RLS - EXACTLY LIKE HOT SELL
-- This script creates WTA with the EXACT same RLS setup as Hot Sell
-- ============================================================================

-- PART 1: Enable RLS on all WTA tables
-- ============================================================================
ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_configs ENABLE ROW LEVEL SECURITY;

SELECT '✅ Step 1a: RLS enabled on all WTA tables' as status;

-- PART 2: Drop existing policies (avoid conflicts)
-- ============================================================================
DROP POLICY IF EXISTS "Public can view winner takes all configs" ON public.winner_takes_all_configs;
DROP POLICY IF EXISTS "Public can view winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Users can view own winner takes all participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can insert own winner takes all participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can update own winner takes all participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Public can view winner takes all participants" ON public.winner_takes_all_participants;

-- Drop any other variations
DROP POLICY IF EXISTS "Anyone can view active configs" ON public.winner_takes_all_configs;
DROP POLICY IF EXISTS "Admin can manage configs" ON public.winner_takes_all_configs;
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Users can update sessions they participate in" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Users can view participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.winner_takes_all_participants;

SELECT '✅ Step 1b: Dropped all existing WTA policies' as status;

-- PART 3: Create RLS policies (EXACTLY like Hot Sell)
-- ============================================================================

-- Configs: Public read access (like Hot Sell)
CREATE POLICY "Public can view winner takes all configs" 
ON public.winner_takes_all_configs 
FOR SELECT 
USING (true);

-- Sessions: Public read access (like Hot Sell)
CREATE POLICY "Public can view winner takes all sessions" 
ON public.winner_takes_all_sessions 
FOR SELECT 
USING (true);

-- Participants: Users own + Public read for leaderboards (like Hot Sell)
CREATE POLICY "Users can view own winner takes all participants" 
ON public.winner_takes_all_participants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own winner takes all participants" 
ON public.winner_takes_all_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own winner takes all participants" 
ON public.winner_takes_all_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view winner takes all participants" 
ON public.winner_takes_all_participants 
FOR SELECT 
USING (true);

SELECT '✅ Step 1c: Created RLS policies (same as Hot Sell)' as status;

-- PART 4: Grant permissions to RPC functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_winner_takes_all_payout_complete(TEXT) TO authenticated, anon;

SELECT '✅ Step 2: Granted permissions to RPC functions' as status;

-- PART 5: Ensure all WTA configs have valid RNG seeds
-- ============================================================================
UPDATE public.winner_takes_all_configs
SET rng_seed = floor(random() * 1000000) + 1
WHERE rng_seed IS NULL OR rng_seed = 0 OR rng_seed < 1;

SELECT '✅ Step 3: All winner_takes_all_configs have valid RNG seeds' as status;

-- PART 6: Reset all WTA listings (EXACTLY like Hot Sell)
-- ============================================================================

-- Clear all participants
TRUNCATE TABLE public.winner_takes_all_participants CASCADE;
SELECT '✅ Step 4a: All WTA participants cleared' as status;

-- Delete all existing sessions
TRUNCATE TABLE public.winner_takes_all_sessions CASCADE;
SELECT '✅ Step 4b: All old WTA sessions deleted' as status;

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
    floor(random() * 1000000) + 1,
    c.base_price,
    60, -- 1 minute timer for testing
    NOW(),
    NOW()
FROM public.winner_takes_all_configs c;

SELECT '✅ Step 4c: Fresh WTA sessions created with unique RNG seeds' as status;

-- PART 7: Verification
-- ============================================================================

SELECT '🎉 COMPLETE! Winner Takes All is now EXACTLY like Hot Sell!' as message;

-- Show RLS status
SELECT 
    '🛡️ RLS Status:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename LIKE 'winner_takes_all%'
ORDER BY tablename;

-- Show policies
SELECT 
    '📋 RLS Policies:' as info,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename LIKE 'winner_takes_all%'
ORDER BY tablename, policyname;

-- Show configs
SELECT 
    '📊 WTA Configs:' as info,
    id,
    game_type,
    title,
    rng_seed,
    timer_duration
FROM public.winner_takes_all_configs
ORDER BY base_price ASC;

-- Show sessions
SELECT 
    '📊 WTA Sessions:' as info,
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
✅ WINNER TAKES ALL COMPLETE WITH RLS!

What this did (EXACTLY like Hot Sell):
1. ✅ Enabled RLS on all WTA tables
2. ✅ Created public read policies for configs and sessions
3. ✅ Created user ownership policies for participants
4. ✅ Public can view participants (for leaderboards)
5. ✅ Granted execute permissions to anon users
6. ✅ Created sessions with TRUNCATE + uuid_generate_v4()
7. ✅ 1 minute timer for testing

RLS Policies (same as Hot Sell):
- Configs: Public read ✅
- Sessions: Public read ✅
- Participants: Own data + Public read ✅

Result:
- WTA sessions now exist and are findable
- Signed-out users can view sessions (RLS allows it)
- Signed-in users can join and play
- Fair skill-based gaming with RNG seeding
- Ready to test!

Next steps:
- Refresh Winner Takes All page
- Sessions should now appear for everyone
- Test joining and playing
' as summary;

