-- ============================================================================
-- FIX GAME SESSIONS TABLE - Ensure games can play
-- ============================================================================
-- This creates/fixes the game_sessions table needed for competition games
-- ============================================================================

SELECT '🎮 Creating/fixing game_sessions table...' as step;

-- Create game_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.game_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  listing_id TEXT,
  entry_number INTEGER,
  rng_seed INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'invalid', 'expired')),
  
  -- Scores and metrics
  client_score DECIMAL(10,2),
  server_score DECIMAL(10,2),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  input_count INTEGER,
  duration_ms INTEGER,
  
  -- Anti-cheat
  suspicion_score INTEGER DEFAULT 0,
  invalid_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_game_sessions_listing ON public.game_sessions(listing_id) WHERE listing_id IS NOT NULL;

-- Enable RLS (if needed)
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
DROP POLICY IF EXISTS "Users can view own game sessions" ON public.game_sessions;
CREATE POLICY "Users can view own game sessions"
  ON public.game_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
DROP POLICY IF EXISTS "Users can create game sessions" ON public.game_sessions;
CREATE POLICY "Users can create game sessions"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
DROP POLICY IF EXISTS "Users can update own game sessions" ON public.game_sessions;
CREATE POLICY "Users can update own game sessions"
  ON public.game_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

SELECT '✅ game_sessions table ready!' as result;

-- Verify table exists
SELECT 
  '📊 Verification' as check_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions
FROM public.game_sessions;

SELECT '🎉 Games should now be able to play!' as message;

