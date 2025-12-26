-- ============================================================================
-- MULTIPLAYER GAME LOBBIES
-- ============================================================================
-- This script creates the tables and functions needed for online multiplayer
-- matchmaking in HexArena and Laser Battle
-- ============================================================================

-- Drop existing objects if they exist
DROP TABLE IF EXISTS game_lobbies CASCADE;
DROP FUNCTION IF EXISTS decrement_lobby_count CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_lobbies CASCADE;

-- Create lobbies table
CREATE TABLE game_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('hex-arena', 'laser-battle')),
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  player_count INTEGER NOT NULL DEFAULT 1 CHECK (player_count >= 0 AND player_count <= 4),
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

-- Everyone can read lobbies
CREATE POLICY "Anyone can view lobbies" ON game_lobbies
  FOR SELECT USING (true);

-- Authenticated users can create lobbies
CREATE POLICY "Users can create lobbies" ON game_lobbies
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Hosts can update their lobbies
CREATE POLICY "Hosts can update lobbies" ON game_lobbies
  FOR UPDATE USING (auth.uid() = host_id OR status = 'waiting');

-- Function to safely decrement player count
CREATE OR REPLACE FUNCTION decrement_lobby_count(lobby_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to clean up old lobbies
CREATE OR REPLACE FUNCTION cleanup_old_lobbies()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete waiting lobbies older than 10 minutes
  DELETE FROM game_lobbies
  WHERE status = 'waiting' AND created_at < NOW() - INTERVAL '10 minutes';
  
  -- Mark playing lobbies older than 30 minutes as finished
  UPDATE game_lobbies
  SET status = 'finished', ended_at = NOW()
  WHERE status = 'playing' AND started_at < NOW() - INTERVAL '30 minutes';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION decrement_lobby_count TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_lobbies TO authenticated;

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================
-- Enable realtime for lobbies table

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_lobbies;

-- ============================================================================
-- SAMPLE DATA / TESTING
-- ============================================================================

-- You can test the lobby system by:
-- 1. Opening the game in two browser windows
-- 2. Both players click "Find Match"
-- 3. Both players ready up
-- 4. Host starts the game

SELECT 'Multiplayer lobbies system created successfully!' as result;

