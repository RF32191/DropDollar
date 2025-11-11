-- ============================================================================
-- FIX GAME LOADING AND RESET ALL LISTINGS
-- ============================================================================
-- This script:
-- 1. Creates/fixes game_sessions table
-- 2. Ensures all sessions have RNG seeds
-- 3. Resets all listings for testing
-- 4. Fixes get_all_hot_sell_sessions to include usernames
-- ============================================================================

BEGIN;

SELECT '🎮 ================================' as message;
SELECT '🎮 FIX GAME LOADING + RESET' as message;
SELECT '🎮 ================================' as message;

-- ============================================================================
-- PART 1: Create/Fix game_sessions Table
-- ============================================================================

SELECT '🔧 PART 1: Creating/fixing game_sessions table...' as step;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_listing_id ON public.game_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can insert their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update their own game sessions" ON public.game_sessions;

CREATE POLICY "Users can view their own game sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

SELECT '✅ game_sessions table ready' as result;

-- ============================================================================
-- PART 2: Ensure All Sessions Have RNG Seeds
-- ============================================================================

SELECT '🔧 PART 2: Ensuring all sessions have RNG seeds...' as step;

UPDATE public.hot_sell_sessions
SET rng_seed = FLOOR(RANDOM() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

UPDATE public.hot_sell_configs
SET rng_seed = FLOOR(RANDOM() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

SELECT '✅ RNG seeds updated' as result;

-- ============================================================================
-- PART 3: Reset All Hot Sell Listings for Testing
-- ============================================================================

SELECT '🔧 PART 3: Resetting all listings...' as step;

DELETE FROM public.hot_sell_participants;

UPDATE public.hot_sell_sessions
SET 
  prize_pool = 0,
  participants_count = 0,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = NULL,
  second_place_prize = NULL,
  third_place_prize = NULL,
  platform_fee = NULL,
  completed_at = NULL,
  status = 'active',
  updated_at = NOW()
WHERE TRUE;

SELECT '✅ All listings reset' as result;

-- ============================================================================
-- PART 4: Update get_all_hot_sell_sessions (with usernames)
-- ============================================================================

SELECT '🔧 PART 4: Updating get_all_hot_sell_sessions...' as step;

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

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

SELECT '✅ get_all_hot_sell_sessions updated' as result;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 ALL FIXES COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ game_sessions table created' as status;
SELECT '✅ All sessions have RNG seeds' as status;
SELECT '✅ All listings reset ($0 pools)' as status;
SELECT '✅ Scoreboard shows usernames' as status;
SELECT '✅ Games should load properly now!' as status;
SELECT '🎉 ================================' as message;

-- Verification
SELECT 
  '📊 Active Sessions' as check_name,
  COUNT(*) as count,
  COUNT(CASE WHEN rng_seed IS NOT NULL AND rng_seed > 0 THEN 1 END) as with_rng_seed
FROM hot_sell_sessions
WHERE status = 'active';

SELECT 
  '📊 Participants' as check_name,
  COUNT(*) as total_participants,
  COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as with_scores
FROM hot_sell_participants;

SELECT 
  '📊 game_sessions Table' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_sessions')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

