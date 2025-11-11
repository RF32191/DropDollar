-- ============================================================================
-- FIX GAME SESSIONS RLS - Allow API Route to Create Sessions
-- ============================================================================
-- The /api/game-session/create route needs to write to game_sessions table
-- ============================================================================

SELECT '🔧 Fixing game_sessions RLS policies...' as step;

-- Check if game_sessions table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'game_sessions'
  ) THEN
    -- Create game_sessions table if it doesn't exist
    CREATE TABLE public.game_sessions (
      session_id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      game_type TEXT NOT NULL,
      listing_id TEXT,
      entry_number INTEGER,
      rng_seed INTEGER NOT NULL,
      token_hash TEXT,
      status TEXT DEFAULT 'active',
      score NUMERIC,
      accuracy NUMERIC,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    );
    
    CREATE INDEX idx_game_sessions_user ON public.game_sessions(user_id);
    CREATE INDEX idx_game_sessions_status ON public.game_sessions(status);
    
    RAISE NOTICE '✅ Created game_sessions table';
  ELSE
    RAISE NOTICE '✅ game_sessions table already exists';
  END IF;
END $$;

-- Enable RLS on game_sessions
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "game_sessions_service_role_all" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_user_read_own" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_user_insert_own" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_user_update_own" ON public.game_sessions;

-- Policy 1: Service role can do everything (for API routes)
CREATE POLICY "game_sessions_service_role_all"
ON public.game_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can read their own sessions
CREATE POLICY "game_sessions_user_read_own"
ON public.game_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Authenticated users can insert their own sessions
CREATE POLICY "game_sessions_user_insert_own"
ON public.game_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 4: Authenticated users can update their own sessions
CREATE POLICY "game_sessions_user_update_own"
ON public.game_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

SELECT '✅ game_sessions RLS policies fixed' as result;

-- Verify policies
SELECT 
  '🛡️ game_sessions Policies' as info,
  policyname,
  CASE 
    WHEN 'service_role' = ANY(roles) THEN '✅ Service role access'
    WHEN 'authenticated' = ANY(roles) THEN '✅ Authenticated access'
    ELSE '⚠️ ' || array_to_string(roles, ', ')
  END as access_level,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'game_sessions'
ORDER BY policyname;

SELECT '🎉 API routes can now create game sessions!' as message;

