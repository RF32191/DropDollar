-- ========================================
-- CREATE TOURNAMENTS TABLE
-- Run this BEFORE QUICK_SETUP.sql
-- ========================================

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    game_type TEXT NOT NULL,
    entry_fee INTEGER NOT NULL CHECK (entry_fee > 0),
    prize_pool DECIMAL(10, 2) NOT NULL CHECK (prize_pool > 0),
    max_players INTEGER NOT NULL CHECK (max_players > 0),
    current_players INTEGER DEFAULT 0 CHECK (current_players >= 0),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    prize_distribution JSONB,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament_entries table
CREATE TABLE IF NOT EXISTS public.tournament_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    entry_fee INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    attempts_used INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    rng_seed INTEGER,
    final_rank INTEGER,
    prize_won DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_game_type ON tournaments(game_type);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_score ON tournament_entries(score DESC);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tournaments are viewable by everyone" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Tournament entries are viewable by everyone" ON tournament_entries FOR SELECT USING (true);

-- ========================================
-- DONE! 🎉
-- ========================================
-- Tournament tables created!
-- Now you can run QUICK_SETUP.sql
-- ========================================

