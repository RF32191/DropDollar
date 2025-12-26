-- ============================================================================
-- MULTIPLAYER GAME LOBBIES
-- ============================================================================
-- This script creates the tables and functions needed for online multiplayer
-- matchmaking in all multiplayer games
-- ============================================================================

-- Drop existing objects if they exist
DROP TABLE IF EXISTS game_lobbies CASCADE;
DROP FUNCTION IF EXISTS decrement_lobby_count CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_lobbies CASCADE;
DROP FUNCTION IF EXISTS increment_lobby_count CASCADE;
DROP FUNCTION IF EXISTS join_or_create_lobby CASCADE;

-- Create lobbies table
CREATE TABLE game_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  player_count INTEGER NOT NULL DEFAULT 1 CHECK (player_count >= 0 AND player_count <= 4),
  max_players INTEGER NOT NULL DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast lookups
CREATE INDEX idx_lobbies_game_type_status ON game_lobbies(game_type, status);
CREATE INDEX idx_lobbies_created_at ON game_lobbies(created_at DESC);
CREATE INDEX idx_lobbies_host ON game_lobbies(host_id);

-- Enable RLS
ALTER TABLE game_lobbies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Fixed for proper matchmaking
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view lobbies" ON game_lobbies;
DROP POLICY IF EXISTS "Users can create lobbies" ON game_lobbies;
DROP POLICY IF EXISTS "Hosts can update lobbies" ON game_lobbies;
DROP POLICY IF EXISTS "Users can join lobbies" ON game_lobbies;
DROP POLICY IF EXISTS "Anyone can delete finished lobbies" ON game_lobbies;

-- Everyone can read lobbies
CREATE POLICY "Anyone can view lobbies" ON game_lobbies
  FOR SELECT USING (true);

-- Authenticated users can create lobbies (they become the host)
CREATE POLICY "Users can create lobbies" ON game_lobbies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Any authenticated user can update waiting lobbies (to join/leave/ready up)
-- Hosts can update their lobbies in any status
CREATE POLICY "Users can update lobbies" ON game_lobbies
  FOR UPDATE TO authenticated
  USING (
    status = 'waiting' OR auth.uid() = host_id
  )
  WITH CHECK (
    status = 'waiting' OR auth.uid() = host_id
  );

-- Hosts can delete their own lobbies
CREATE POLICY "Hosts can delete lobbies" ON game_lobbies
  FOR DELETE TO authenticated
  USING (auth.uid() = host_id OR status = 'finished');

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER bypasses RLS)
-- ============================================================================

-- Function to safely join or create a lobby
CREATE OR REPLACE FUNCTION join_or_create_lobby(
  p_game_type TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lobby_id UUID;
BEGIN
  -- First, try to find an existing waiting lobby with space
  SELECT id INTO v_lobby_id
  FROM game_lobbies
  WHERE game_type = p_game_type
    AND status = 'waiting'
    AND player_count < max_players
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_lobby_id IS NOT NULL THEN
    -- Join existing lobby
    UPDATE game_lobbies
    SET player_count = player_count + 1
    WHERE id = v_lobby_id;
    
    RETURN v_lobby_id;
  ELSE
    -- Create new lobby
    INSERT INTO game_lobbies (game_type, host_id, player_count, max_players)
    VALUES (p_game_type, p_user_id, 1, 4)
    RETURNING id INTO v_lobby_id;
    
    RETURN v_lobby_id;
  END IF;
END;
$$;

-- Function to safely increment player count
CREATE OR REPLACE FUNCTION increment_lobby_count(lobby_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE game_lobbies
  SET player_count = LEAST(4, player_count + 1)
  WHERE id = lobby_id AND status = 'waiting';
END;
$$;

-- Function to safely decrement player count
CREATE OR REPLACE FUNCTION decrement_lobby_count(lobby_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE game_lobbies
  SET player_count = GREATEST(0, player_count - 1)
  WHERE id = lobby_id;
  
  -- Delete empty lobbies
  DELETE FROM game_lobbies
  WHERE id = lobby_id AND player_count <= 0 AND status = 'waiting';
END;
$$;

-- Function to start a lobby game
CREATE OR REPLACE FUNCTION start_lobby_game(lobby_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
BEGIN
  -- Check if user is the host
  SELECT host_id INTO v_host_id
  FROM game_lobbies
  WHERE id = lobby_id;
  
  IF v_host_id != user_id THEN
    RETURN FALSE;
  END IF;
  
  UPDATE game_lobbies
  SET status = 'playing', started_at = NOW()
  WHERE id = lobby_id AND status = 'waiting';
  
  RETURN TRUE;
END;
$$;

-- Function to end a lobby game
CREATE OR REPLACE FUNCTION end_lobby_game(lobby_id UUID, winner_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE game_lobbies
  SET status = 'finished', ended_at = NOW(), winner_id = winner_user_id
  WHERE id = lobby_id;
END;
$$;

-- Function to clean up old lobbies
CREATE OR REPLACE FUNCTION cleanup_old_lobbies()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete waiting lobbies older than 10 minutes
  DELETE FROM game_lobbies
  WHERE status = 'waiting' AND created_at < NOW() - INTERVAL '10 minutes';
  
  -- Mark playing lobbies older than 30 minutes as finished
  UPDATE game_lobbies
  SET status = 'finished', ended_at = NOW()
  WHERE status = 'playing' AND started_at < NOW() - INTERVAL '30 minutes';
  
  -- Delete finished lobbies older than 1 hour
  DELETE FROM game_lobbies
  WHERE status = 'finished' AND ended_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION join_or_create_lobby TO authenticated;
GRANT EXECUTE ON FUNCTION increment_lobby_count TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_lobby_count TO authenticated;
GRANT EXECUTE ON FUNCTION start_lobby_game TO authenticated;
GRANT EXECUTE ON FUNCTION end_lobby_game TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_lobbies TO authenticated;

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Check if table is already in publication before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_lobbies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_lobbies;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Multiplayer lobbies system created successfully with fixed RLS policies!' as result;
