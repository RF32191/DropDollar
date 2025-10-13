-- ============================================================================
-- 1V1 MATCHMAKING SYSTEM TABLES
-- Triumph-style matchmaking for Drop Dollar
-- ============================================================================

-- Matchmaking Queue Table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  entry_fee INTEGER NOT NULL CHECK (entry_fee IN (1, 5, 10, 25)),
  skill_rating INTEGER NOT NULL DEFAULT 1000,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'matched', 'cancelled')) DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  match_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player1_username TEXT NOT NULL,
  player1_score INTEGER,
  player2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_username TEXT NOT NULL,
  player2_score INTEGER,
  entry_fee INTEGER NOT NULL CHECK (entry_fee IN (1, 5, 10, 25)),
  prize_pool DECIMAL(10,2) NOT NULL,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting_for_game', 'in_progress', 'completed', 'expired')) DEFAULT 'waiting_for_game',
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_payment_intent_p1 TEXT,
  stripe_payment_intent_p2 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- User Stats Table (for ELO tracking)
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skill_rating INTEGER NOT NULL DEFAULT 1000,
  total_matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Matchmaking Queue Indexes
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_status ON matchmaking_queue(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_entry_fee ON matchmaking_queue(entry_fee);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_skill_rating ON matchmaking_queue(skill_rating);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created_at ON matchmaking_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_user_id ON matchmaking_queue(user_id);

-- Composite index for efficient matchmaking queries
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_active_search 
ON matchmaking_queue(entry_fee, status, skill_rating, created_at)
WHERE status = 'waiting';

-- Matches Indexes
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);

-- User Stats Indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_skill_rating ON user_stats(skill_rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_earnings ON user_stats(total_earnings DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Matchmaking Queue Policies
CREATE POLICY "Users can view their own queue entries"
  ON matchmaking_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue entries"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entries"
  ON matchmaking_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Matches Policies
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own scores"
  ON matches FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- User Stats Policies
CREATE POLICY "Users can view all stats (for leaderboard)"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "System can update stats"
  ON user_stats FOR ALL
  USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to clean up old queue entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM matchmaking_queue
  WHERE status = 'waiting' 
  AND created_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to expire incomplete matches
CREATE OR REPLACE FUNCTION expire_old_matches()
RETURNS void AS $$
BEGIN
  UPDATE matches
  SET status = 'expired'
  WHERE status IN ('waiting_for_game', 'in_progress')
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON matchmaking_queue TO authenticated;
GRANT ALL ON matches TO authenticated;
GRANT ALL ON user_stats TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 1v1 Matchmaking tables created successfully!';
  RAISE NOTICE '📊 Tables: matchmaking_queue, matches, user_stats';
  RAISE NOTICE '🔐 Row Level Security enabled';
  RAISE NOTICE '📈 Indexes created for performance';
  RAISE NOTICE '🎮 Ready for Triumph-style 1v1 matchmaking!';
END $$;

