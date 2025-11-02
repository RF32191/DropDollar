-- ============================================================================
-- ANTI-CHEAT & GAME VALIDATION SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- This migration adds tables and functions for server-side game validation
-- and anti-cheat detection to prevent score manipulation and bot usage.
--
-- IMPORTANT: Run this in your Supabase SQL Editor before deploying the 
--            anti-cheat system to production.
-- ============================================================================

-- ============================================================================
-- 1. Create game_sessions table
-- ============================================================================
-- Stores cryptographically signed game sessions for validation

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS public.game_sessions CASCADE;

CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session identification
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  
  -- Competition context (optional)
  listing_id TEXT,
  entry_number INTEGER,
  
  -- Cryptographic security
  rng_seed INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  
  -- Session status
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'expired', 'invalid')),
  
  -- Scores and metrics
  server_score DECIMAL(10,2),
  client_score DECIMAL(10,2),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  
  -- Input analysis
  input_count INTEGER,
  duration_ms INTEGER,
  
  -- Anti-cheat
  suspicion_score INTEGER DEFAULT 0,
  invalid_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_user 
  ON public.game_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_status 
  ON public.game_sessions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_listing 
  ON public.game_sessions(listing_id, entry_number) 
  WHERE listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_sessions_suspicion 
  ON public.game_sessions(suspicion_score DESC) 
  WHERE suspicion_score > 60;

-- ============================================================================
-- 2. Create anti_cheat_logs table
-- ============================================================================
-- Logs suspicious activity for monitoring and analysis

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS public.anti_cheat_logs CASCADE;

CREATE TABLE public.anti_cheat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who and what
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES public.game_sessions(session_id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  
  -- Suspicion details
  suspicion_score INTEGER NOT NULL,
  reasons TEXT[] NOT NULL,
  
  -- Evidence
  client_score DECIMAL(10,2),
  input_rate DECIMAL(10,2),
  avg_reaction_time INTEGER,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Admin actions
  action_taken TEXT CHECK (action_taken IN ('none', 'warning', 'banned', 'cleared')),
  admin_notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_anti_cheat_user 
  ON public.anti_cheat_logs(user_id, flagged_at DESC);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_score 
  ON public.anti_cheat_logs(suspicion_score DESC);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_pending 
  ON public.anti_cheat_logs(flagged_at DESC) 
  WHERE reviewed_at IS NULL;

-- ============================================================================
-- 3. Update game_history table (if it exists)
-- ============================================================================
-- Add validation fields to existing game_history table

DO $$ 
BEGIN
  -- Add is_validated column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_history' 
    AND column_name = 'is_validated'
  ) THEN
    ALTER TABLE public.game_history 
    ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add session_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_history' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.game_history 
    ADD COLUMN session_id TEXT REFERENCES public.game_sessions(session_id) ON DELETE SET NULL;
  END IF;
  
  -- Add listing_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_history' 
    AND column_name = 'listing_id'
  ) THEN
    ALTER TABLE public.game_history 
    ADD COLUMN listing_id TEXT;
  END IF;
  
  -- Add entry_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_history' 
    AND column_name = 'entry_number'
  ) THEN
    ALTER TABLE public.game_history 
    ADD COLUMN entry_number INTEGER;
  END IF;
END $$;

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anti_cheat_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- Game Sessions: Users can view their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.game_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.game_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Game Sessions: Users can insert their own sessions (via API)
DROP POLICY IF EXISTS "Users can create own sessions" ON public.game_sessions;
CREATE POLICY "Users can create own sessions"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Game Sessions: Users can update their own sessions (via API)
DROP POLICY IF EXISTS "Users can update own sessions" ON public.game_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.game_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anti-Cheat Logs: Users cannot view (admin only)
-- Anti-Cheat Logs: System can insert (via API)
DROP POLICY IF EXISTS "System can log anti-cheat events" ON public.anti_cheat_logs;
CREATE POLICY "System can log anti-cheat events"
  ON public.anti_cheat_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 6. Create Helper Functions
-- ============================================================================

-- Function to automatically expire old sessions
CREATE OR REPLACE FUNCTION expire_old_game_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update sessions that have expired
  WITH updated AS (
    UPDATE public.game_sessions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO expired_count FROM updated;
  
  RETURN expired_count;
END;
$$;

-- Function to get user's recent suspicious activity
CREATE OR REPLACE FUNCTION get_user_suspicious_sessions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  session_id TEXT,
  game_type TEXT,
  suspicion_score INTEGER,
  client_score DECIMAL,
  server_score DECIMAL,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.session_id,
    gs.game_type,
    gs.suspicion_score,
    gs.client_score,
    gs.server_score,
    gs.status,
    gs.created_at
  FROM public.game_sessions gs
  WHERE gs.user_id = p_user_id
    AND gs.suspicion_score > 60
  ORDER BY gs.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get anti-cheat statistics
CREATE OR REPLACE FUNCTION get_anti_cheat_stats()
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  invalid_sessions BIGINT,
  suspicious_sessions BIGINT,
  avg_suspicion_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'invalid') as invalid_sessions,
    COUNT(*) FILTER (WHERE suspicion_score > 60) as suspicious_sessions,
    AVG(suspicion_score)::NUMERIC(5,2) as avg_suspicion_score
  FROM public.game_sessions
  WHERE created_at > NOW() - INTERVAL '7 days';
END;
$$;

-- ============================================================================
-- 7. Create Cleanup Job (Optional - for pg_cron if available)
-- ============================================================================

-- This requires the pg_cron extension
-- Uncomment if you have pg_cron enabled in your Supabase project

/*
-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run daily at 3 AM
SELECT cron.schedule(
  'expire-game-sessions',
  '0 3 * * *',
  'SELECT expire_old_game_sessions();'
);

-- Delete old expired sessions after 30 days
SELECT cron.schedule(
  'cleanup-old-sessions',
  '0 4 * * *',
  'DELETE FROM public.game_sessions WHERE status = ''expired'' AND expires_at < NOW() - INTERVAL ''30 days'';'
);
*/

-- ============================================================================
-- 8. Grant Permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.game_sessions TO authenticated;
GRANT SELECT ON public.anti_cheat_logs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION expire_old_game_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_suspicious_sessions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_anti_cheat_stats() TO authenticated;

-- ============================================================================
-- 9. Add Comments
-- ============================================================================

COMMENT ON TABLE public.game_sessions IS 'Stores cryptographically signed game sessions for server-side validation';
COMMENT ON TABLE public.anti_cheat_logs IS 'Logs suspicious gaming activity for monitoring and analysis';

COMMENT ON COLUMN public.game_sessions.rng_seed IS 'Deterministic RNG seed for fair competition';
COMMENT ON COLUMN public.game_sessions.token_hash IS 'Hash of cryptographic token for verification';
COMMENT ON COLUMN public.game_sessions.suspicion_score IS 'Anti-cheat score (0-100), higher = more suspicious';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_sessions') THEN
    RAISE NOTICE '✅ game_sessions table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create game_sessions table';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anti_cheat_logs') THEN
    RAISE NOTICE '✅ anti_cheat_logs table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create anti_cheat_logs table';
  END IF;
  
  RAISE NOTICE '✅ Anti-cheat database migration completed successfully!';
  RAISE NOTICE 'ℹ️  Next steps:';
  RAISE NOTICE '   1. Set GAME_TOKEN_SECRET in your .env.local file';
  RAISE NOTICE '   2. Deploy API routes to production';
  RAISE NOTICE '   3. Update game components to use session validation';
  RAISE NOTICE '   4. Test thoroughly before enabling real money games';
END $$;

