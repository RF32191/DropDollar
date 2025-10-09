-- Skill-Based Matchmaking System Schema
-- This schema handles player skill ratings, matchmaking queues, and match results

-- Player Skill Ratings Table
CREATE TABLE IF NOT EXISTS public.player_skill_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'multi-target', 'falling-objects', 'color-sequence'
  skill_rating INTEGER DEFAULT 1200, -- ELO rating system (starts at 1200)
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  highest_rating INTEGER DEFAULT 1200,
  last_match_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one rating per user per game type
  UNIQUE(user_id, game_type)
);

-- Matchmaking Queue Table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  bet_amount INTEGER NOT NULL,
  skill_rating INTEGER NOT NULL,
  preferred_rating_range INTEGER DEFAULT 100, -- +/- rating range for matching
  queue_joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'waiting', -- 'waiting', 'matched', 'cancelled'
  match_id UUID, -- Reference to created match
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  
  -- Index for efficient matchmaking queries
  INDEX idx_queue_game_rating (game_type, skill_rating, status, queue_joined_at),
  INDEX idx_queue_user_status (user_id, status),
  INDEX idx_queue_expires (expires_at)
);

-- 1v1 Matches Table
CREATE TABLE IF NOT EXISTS public.pvp_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_type TEXT DEFAULT '1v1',
  game_type TEXT NOT NULL,
  bet_amount INTEGER NOT NULL,
  
  -- Player 1 (Match Creator)
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_rating INTEGER NOT NULL,
  player1_score DECIMAL(10,2),
  player1_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Player 2 (Matched Opponent)
  player2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_rating INTEGER,
  player2_score DECIMAL(10,2),
  player2_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Match Results
  winner_id UUID REFERENCES auth.users(id),
  prize_pool INTEGER NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  winner_payout DECIMAL(10,2) NOT NULL,
  
  -- Match Status and Timing
  status TEXT DEFAULT 'waiting_for_opponent', -- 'waiting_for_opponent', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Indexes for performance
  INDEX idx_matches_status (status, created_at),
  INDEX idx_matches_players (player1_id, player2_id),
  INDEX idx_matches_game_type (game_type, status)
);

-- Match History for Analytics
CREATE TABLE IF NOT EXISTS public.match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.pvp_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  bet_amount INTEGER NOT NULL,
  
  -- Player Performance
  player_score DECIMAL(10,2) NOT NULL,
  opponent_score DECIMAL(10,2) NOT NULL,
  is_winner BOOLEAN NOT NULL,
  
  -- Rating Changes
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  
  -- Match Details
  match_duration_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_history_player (player_id, game_type, completed_at),
  INDEX idx_history_rating (rating_after, game_type)
);

-- Enable Row Level Security
ALTER TABLE public.player_skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Player Skill Ratings
CREATE POLICY "Users can view all skill ratings" ON public.player_skill_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own skill ratings" ON public.player_skill_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill ratings" ON public.player_skill_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Matchmaking Queue
CREATE POLICY "Users can view queue entries" ON public.matchmaking_queue
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own queue entries" ON public.matchmaking_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entries" ON public.matchmaking_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue entries" ON public.matchmaking_queue
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for PvP Matches
CREATE POLICY "Users can view matches they're involved in" ON public.pvp_matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create matches" ON public.pvp_matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their match participation" ON public.pvp_matches
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- RLS Policies for Match History
CREATE POLICY "Users can view their own match history" ON public.match_history
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "System can insert match history" ON public.match_history
  FOR INSERT WITH CHECK (true);

-- Functions for automatic skill rating initialization
CREATE OR REPLACE FUNCTION public.initialize_player_skill_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize skill ratings for all three game types
  INSERT INTO public.player_skill_ratings (user_id, game_type, skill_rating)
  VALUES 
    (NEW.id, 'multi-target', 1200),
    (NEW.id, 'falling-objects', 1200),
    (NEW.id, 'color-sequence', 1200)
  ON CONFLICT (user_id, game_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize skill ratings for new users
DROP TRIGGER IF EXISTS on_auth_user_created_skill_ratings ON auth.users;
CREATE TRIGGER on_auth_user_created_skill_ratings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_player_skill_ratings();

-- Function to clean up expired queue entries and matches
CREATE OR REPLACE FUNCTION public.cleanup_expired_entries()
RETURNS void AS $$
BEGIN
  -- Remove expired queue entries
  DELETE FROM public.matchmaking_queue 
  WHERE expires_at < NOW() AND status = 'waiting';
  
  -- Cancel expired matches that haven't found opponents
  UPDATE public.pvp_matches 
  SET status = 'cancelled'
  WHERE expires_at < NOW() 
    AND status = 'waiting_for_opponent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_skill_ratings_user_game ON public.player_skill_ratings(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_game_rating ON public.player_skill_ratings(game_type, skill_rating DESC);
CREATE INDEX IF NOT EXISTS idx_queue_matchmaking ON public.matchmaking_queue(game_type, bet_amount, skill_rating, status) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_matches_active ON public.pvp_matches(status, game_type, created_at) WHERE status IN ('waiting_for_opponent', 'in_progress');
