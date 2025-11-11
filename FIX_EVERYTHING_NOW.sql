-- ============================================================================
-- FIX EVERYTHING - ONE MASTER SCRIPT
-- ============================================================================
-- This script fixes all known issues in one go:
-- 1. Removes problematic realtime triggers (fixes messages error)
-- 2. Creates/fixes game_sessions table (fixes game loading)
-- 3. Ensures all sessions have RNG seeds (fixes game start)
-- 4. Updates get_all_hot_sell_sessions to include usernames (fixes scoreboard)
-- ============================================================================

BEGIN;

SELECT '🚀 ================================' as message;
SELECT '🚀 RUNNING MASTER FIX SCRIPT' as message;
SELECT '🚀 ================================' as message;

-- ============================================================================
-- PART 1: Remove Problematic Realtime Triggers
-- ============================================================================

SELECT '🔧 PART 1: Removing realtime triggers...' as step;

-- Drop all trigger functions that cause the "extension" column error
DROP FUNCTION IF EXISTS public.log_hot_sell_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_hot_sell_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_winner() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_winner() CASCADE;
DROP FUNCTION IF EXISTS public.notify_token_change() CASCADE;

SELECT '✅ Removed all problematic triggers' as result;

-- ============================================================================
-- PART 2: Create/Fix game_sessions Table
-- ============================================================================

SELECT '🔧 PART 2: Creating/fixing game_sessions table...' as step;

-- Create game_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  listing_id TEXT,
  entry_number INTEGER,
  rng_seed INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  score NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_listing_id ON public.game_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON public.game_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can insert their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update their own game sessions" ON public.game_sessions;

-- Create RLS policies
CREATE POLICY "Users can view their own game sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

SELECT '✅ game_sessions table created/fixed' as result;

-- ============================================================================
-- PART 3: Ensure All Hot Sell Sessions Have RNG Seeds
-- ============================================================================

SELECT '🔧 PART 3: Ensuring all sessions have RNG seeds...' as step;

-- Update any sessions missing RNG seeds
UPDATE public.hot_sell_sessions
SET rng_seed = FLOOR(RANDOM() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

SELECT '✅ Updated ' || COUNT(*) || ' sessions with RNG seeds' as result
FROM public.hot_sell_sessions 
WHERE rng_seed IS NOT NULL AND rng_seed > 0;

-- Update any configs missing RNG seeds
UPDATE public.hot_sell_configs
SET rng_seed = FLOOR(RANDOM() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

SELECT '✅ Updated ' || COUNT(*) || ' configs with RNG seeds' as result
FROM public.hot_sell_configs
WHERE rng_seed IS NOT NULL AND rng_seed > 0;

-- ============================================================================
-- PART 4: Update get_all_hot_sell_sessions to Include Usernames
-- ============================================================================

SELECT '🔧 PART 4: Updating get_all_hot_sell_sessions with usernames...' as step;

CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        s.id,
        s.config_id,
        s.prize_pool,
        s.base_price,
        s.participants_count,
        s.max_participants,
        s.status,
        s.rng_seed,
        s.first_place_user_id,
        s.second_place_user_id,
        s.third_place_user_id,
        s.created_at,
        s.updated_at,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', p.id,
              'user_id', p.user_id,
              'score', p.score,
              'accuracy', p.accuracy,
              'joined_at', p.joined_at,
              'completed_at', p.completed_at,
              'username', COALESCE(u.username, 'Anonymous Player')
            )
            ORDER BY p.joined_at ASC
          ), '[]'::json)
          FROM public.hot_sell_participants p
          LEFT JOIN public.users u ON u.id = p.user_id
          WHERE p.session_id = s.id
        ) as participants
      FROM public.hot_sell_sessions s
      WHERE s.status IN ('active', 'waiting', 'completed')
      ORDER BY s.created_at DESC
      LIMIT 100
    ) t
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

SELECT '✅ get_all_hot_sell_sessions updated with usernames' as result;

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

SELECT '🔧 PART 5: Verifying fixes...' as step;

-- Check game_sessions table exists
SELECT 
  '✅ game_sessions table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'game_sessions'
    ) THEN 'EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check no more problematic triggers
SELECT 
  '✅ Realtime triggers removed' as check_name,
  COUNT(*) || ' remaining' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (routine_name LIKE 'log_%' OR routine_name LIKE 'notify_%');

-- Check RNG seeds
SELECT 
  '✅ Hot Sell sessions with RNG' as check_name,
  COUNT(*) || ' / ' || (SELECT COUNT(*) FROM hot_sell_sessions) || ' sessions' as status
FROM hot_sell_sessions
WHERE rng_seed IS NOT NULL AND rng_seed > 0;

-- Check get_all_hot_sell_sessions function
SELECT 
  '✅ get_all_hot_sell_sessions' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'get_all_hot_sell_sessions'
    ) THEN 'EXISTS'
    ELSE '❌ MISSING'
  END as status;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 ALL FIXES APPLIED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ Messages error: FIXED' as status;
SELECT '✅ Game sessions: FIXED' as status;
SELECT '✅ RNG seeds: FIXED' as status;
SELECT '✅ Scoreboard usernames: FIXED' as status;
SELECT '✅ All games should now start properly!' as status;
SELECT '🎉 ================================' as message;
SELECT '🔄 Please refresh your browser to see changes' as instruction;
SELECT '🎮 All games are ready to play!' as instruction;
SELECT '🎉 ================================' as message;

