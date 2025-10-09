-- Tournament System Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Daily Tournaments Table
CREATE TABLE IF NOT EXISTS daily_tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    game_name VARCHAR(255) NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    max_participants INTEGER NOT NULL,
    current_participants INTEGER NOT NULL DEFAULT 0,
    prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    final_prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    day_of_week VARCHAR(10) NOT NULL,
    reset_daily BOOLEAN NOT NULL DEFAULT true,
    is_filled BOOLEAN NOT NULL DEFAULT false,
    winner_id UUID REFERENCES auth.users(id),
    winning_score DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Participants Table
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES daily_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    entry_time TIMESTAMPTZ DEFAULT NOW(),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_amount DECIMAL(10,2) NOT NULL,
    best_score DECIMAL(10,2) DEFAULT 0.00,
    total_attempts INTEGER DEFAULT 0,
    last_attempt_time TIMESTAMPTZ,
    is_winner BOOLEAN DEFAULT false,
    prize_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Tournament Game Sessions Table
CREATE TABLE IF NOT EXISTS tournament_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES daily_tournaments(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    reaction_time DECIMAL(10,3),
    game_duration INTEGER, -- in seconds
    session_data JSONB, -- Store game-specific data
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Results Table
CREATE TABLE IF NOT EXISTS tournament_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES daily_tournaments(id) ON DELETE CASCADE,
    winner_id UUID NOT NULL REFERENCES auth.users(id),
    winner_username VARCHAR(255) NOT NULL,
    winning_score DECIMAL(10,2) NOT NULL,
    total_participants INTEGER NOT NULL,
    total_prize_pool DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    winner_prize DECIMAL(10,2) NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Payouts Table
CREATE TABLE IF NOT EXISTS tournament_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES daily_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payout_method VARCHAR(50) NOT NULL DEFAULT 'platform_balance',
    payout_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
    payout_reference VARCHAR(255),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_tournaments_status ON daily_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_daily_tournaments_start_time ON daily_tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_daily_tournaments_game_type ON daily_tournaments(game_type);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_game_sessions_tournament_id ON tournament_game_sessions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_game_sessions_user_id ON tournament_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);

-- Row Level Security (RLS) Policies
ALTER TABLE daily_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_payouts ENABLE ROW LEVEL SECURITY;

-- Policies for daily_tournaments (public read, admin write)
CREATE POLICY "Anyone can view tournaments" ON daily_tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tournaments" ON daily_tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tournaments" ON daily_tournaments FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for tournament_participants (users can see their own data)
CREATE POLICY "Users can view their own participation" ON tournament_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own participation" ON tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON tournament_participants FOR UPDATE USING (auth.uid() = user_id);

-- Policies for tournament_game_sessions (users can see their own sessions)
CREATE POLICY "Users can view their own game sessions" ON tournament_game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own game sessions" ON tournament_game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for tournament_results (public read)
CREATE POLICY "Anyone can view tournament results" ON tournament_results FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert results" ON tournament_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for tournament_payouts (users can see their own payouts)
CREATE POLICY "Users can view their own payouts" ON tournament_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert payouts" ON tournament_payouts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Functions for tournament management
CREATE OR REPLACE FUNCTION update_tournament_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_participants count when someone joins/leaves
    UPDATE daily_tournaments 
    SET current_participants = (
        SELECT COUNT(*) 
        FROM tournament_participants 
        WHERE tournament_id = COALESCE(NEW.tournament_id, OLD.tournament_id)
        AND payment_status = 'paid'
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
    
    -- Update prize pool
    UPDATE daily_tournaments 
    SET prize_pool = current_participants * entry_fee,
        platform_fee = (current_participants * entry_fee) * 0.15,
        final_prize_pool = (current_participants * entry_fee) * 0.85,
        is_filled = (current_participants >= max_participants)
    WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update tournament stats when participants change
CREATE TRIGGER update_tournament_participants_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tournament_participants
    FOR EACH ROW EXECUTE FUNCTION update_tournament_participants();

-- Function to update tournament status based on time
CREATE OR REPLACE FUNCTION update_tournament_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status based on current time
    IF NEW.start_time <= NOW() AND NEW.end_time > NOW() AND NEW.status = 'upcoming' THEN
        NEW.status = 'active';
    ELSIF NEW.end_time <= NOW() AND NEW.status = 'active' THEN
        NEW.status = 'completed';
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tournament status
CREATE TRIGGER update_tournament_status_trigger
    BEFORE UPDATE ON daily_tournaments
    FOR EACH ROW EXECUTE FUNCTION update_tournament_status();

-- Function to generate daily tournaments
CREATE OR REPLACE FUNCTION generate_daily_tournaments(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    game_rotation TEXT[] := ARRAY['multi-target', 'falling-objects', 'color-sequence'];
    game_names TEXT[] := ARRAY['Multi-Target Reaction', 'Falling Object Catch', 'Color Sequence Memory'];
    game_emojis TEXT[] := ARRAY['🎯', '💰', '🌈'];
    day_index INTEGER;
    selected_game TEXT;
    selected_name TEXT;
    selected_emoji TEXT;
BEGIN
    -- Calculate which game to use based on day of week
    day_index := (EXTRACT(DOW FROM target_date)::INTEGER % 3) + 1;
    selected_game := game_rotation[day_index];
    selected_name := game_names[day_index];
    selected_emoji := game_emojis[day_index];
    
    -- Insert 4 daily tournaments with different sizes
    INSERT INTO daily_tournaments (
        name, description, game_type, game_name, entry_fee, max_participants,
        start_time, end_time, day_of_week
    ) VALUES
    (
        '🏆 Small Daily Championship',
        'Compete in ' || selected_name || ' with fewer players for better odds!',
        selected_game, selected_name, 5.00, 10,
        target_date + INTERVAL '10 hours',
        target_date + INTERVAL '12 hours',
        TO_CHAR(target_date, 'Day')
    ),
    (
        '🎮 Medium Daily Tournament',
        selected_emoji || ' ' || selected_name || ' competition with moderate competition',
        selected_game, selected_name, 5.00, 25,
        target_date + INTERVAL '14 hours',
        target_date + INTERVAL '16 hours',
        TO_CHAR(target_date, 'Day')
    ),
    (
        '💎 Large Daily Championship',
        'Premium ' || selected_name || ' tournament with bigger prizes',
        selected_game, selected_name, 5.00, 50,
        target_date + INTERVAL '18 hours',
        target_date + INTERVAL '20 hours',
        TO_CHAR(target_date, 'Day')
    ),
    (
        '👑 Elite Daily Tournament',
        'Ultimate ' || selected_name || ' championship for the best players',
        selected_game, selected_name, 5.00, 100,
        target_date + INTERVAL '20 hours',
        target_date + INTERVAL '22 hours',
        TO_CHAR(target_date, 'Day')
    );
END;
$$ LANGUAGE plpgsql;

-- Generate tournaments for today if none exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM daily_tournaments WHERE DATE(start_time) = CURRENT_DATE) THEN
        PERFORM generate_daily_tournaments();
    END IF;
END $$;
