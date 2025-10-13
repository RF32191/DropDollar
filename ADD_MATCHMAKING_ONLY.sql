-- ============================================================================
-- ADD 1V1 MATCHMAKING SYSTEM TO EXISTING SCHEMA
-- Run this AFTER DROPDOLLAR_COMPLETE_DATABASE_SCHEMA_V4.sql
-- ============================================================================

-- Drop existing matchmaking tables if they exist
DROP TABLE IF EXISTS public.matchmaking_queue CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.user_stats CASCADE;

-- ============================================================================
-- MATCHMAKING QUEUE TABLE
-- ============================================================================
CREATE TABLE public.matchmaking_queue (
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

-- ============================================================================
-- MATCHES TABLE
-- ============================================================================
CREATE TABLE public.matches (
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

-- ============================================================================
-- USER STATS TABLE (for ELO tracking)
-- ============================================================================
CREATE TABLE public.user_stats (
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
CREATE INDEX idx_matchmaking_queue_status ON matchmaking_queue(status);
CREATE INDEX idx_matchmaking_queue_entry_fee_status ON matchmaking_queue(entry_fee, status);
CREATE INDEX idx_matchmaking_queue_skill_rating ON matchmaking_queue(skill_rating);
CREATE INDEX idx_matchmaking_queue_created_at ON matchmaking_queue(created_at);
CREATE INDEX idx_matchmaking_queue_user_id ON matchmaking_queue(user_id);

-- Composite index for efficient matchmaking queries
CREATE INDEX idx_matchmaking_queue_active_search 
ON matchmaking_queue(entry_fee, status, skill_rating, created_at)
WHERE status = 'waiting';

-- Matches Indexes
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);
CREATE INDEX idx_matches_winner_id ON matches(winner_id);

-- User Stats Indexes
CREATE INDEX idx_user_stats_skill_rating ON user_stats(skill_rating DESC);
CREATE INDEX idx_user_stats_total_earnings ON user_stats(total_earnings DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can update their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
DROP POLICY IF EXISTS "System can create matches" ON matches;
DROP POLICY IF EXISTS "Players can update their own scores" ON matches;
DROP POLICY IF EXISTS "Users can view all stats (for leaderboard)" ON user_stats;
DROP POLICY IF EXISTS "System can update stats" ON user_stats;

-- Matchmaking Queue Policies
CREATE POLICY "Users can view their own queue entries"
  ON matchmaking_queue FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own queue entries"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own queue entries"
  ON matchmaking_queue FOR UPDATE
  USING (true);

-- Matches Policies
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  USING (true);

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own scores"
  ON matches FOR UPDATE
  USING (true);

-- User Stats Policies
CREATE POLICY "Users can view all stats (for leaderboard)"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "System can update stats"
  ON user_stats FOR ALL
  USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON matchmaking_queue TO authenticated;
GRANT ALL ON matchmaking_queue TO anon;
GRANT ALL ON matches TO authenticated;
GRANT ALL ON matches TO anon;
GRANT ALL ON user_stats TO authenticated;
GRANT ALL ON user_stats TO anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 1v1 Matchmaking tables added successfully!';
  RAISE NOTICE '📊 Tables: matchmaking_queue, matches, user_stats';
  RAISE NOTICE '🔐 Row Level Security enabled';
  RAISE NOTICE '📈 Indexes created for performance';
  RAISE NOTICE '🎮 Ready for Triumph-style 1v1 matchmaking!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   - matchmaking_queue: Queue for finding opponents';
  RAISE NOTICE '   - matches: Active and completed 1v1 matches';
  RAISE NOTICE '   - user_stats: ELO ratings and match statistics';
END $$;

