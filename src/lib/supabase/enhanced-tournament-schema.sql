-- Enhanced Tournament System Schema
-- Supports multi-tier tournaments, 1v1 matches, weekly win tracking, and automatic generation

-- ============================================================================
-- TOURNAMENT CATEGORIES AND TYPES
-- ============================================================================

-- Tournament Categories (Multi-player tournaments)
CREATE TABLE IF NOT EXISTS tournament_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prize_pool DECIMAL(10,2) NOT NULL,
    max_bet DECIMAL(10,2) NOT NULL,
    max_participants INTEGER NOT NULL,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    tournament_type VARCHAR(20) DEFAULT 'multi' CHECK (tournament_type IN ('multi', '1v1')),
    duration_hours INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert tournament categories
INSERT INTO tournament_categories (name, description, prize_pool, max_bet, max_participants, game_type, tournament_type) VALUES
('Elite Championship', 'High-stakes tournament with $500 prize pool', 500.00, 5.00, 100, 'multi-target', 'multi'),
('Pro Tournament', 'Mid-tier tournament with $250 prize pool', 250.00, 5.00, 50, 'falling-objects', 'multi'),
('Challenger Cup', 'Entry-level tournament with $100 prize pool', 100.00, 5.00, 25, 'color-sequence', 'multi');

-- ============================================================================
-- ACTIVE TOURNAMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS active_tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Tournament Configuration
    prize_pool DECIMAL(10,2) NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL,
    max_participants INTEGER NOT NULL,
    current_participants INTEGER DEFAULT 0,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    tournament_type VARCHAR(20) DEFAULT 'multi' CHECK (tournament_type IN ('multi', '1v1')),
    
    -- 1v1 Specific Fields
    player1_id UUID REFERENCES auth.users(id),
    player2_id UUID REFERENCES auth.users(id),
    challenger_id UUID REFERENCES auth.users(id),
    bet_amount DECIMAL(10,2),
    
    -- Status and Timing
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    
    -- Auto-generation tracking
    generation_round INTEGER DEFAULT 1,
    auto_generated BOOLEAN DEFAULT false,
    parent_tournament_id UUID REFERENCES active_tournaments(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TOURNAMENT PARTICIPANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES active_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participation Details
    entry_fee_paid DECIMAL(10,2) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Game Results
    best_score DECIMAL(10,3) DEFAULT 0,
    attempts_used INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 1,
    final_rank INTEGER,
    
    -- Payout Information
    prize_won DECIMAL(10,2) DEFAULT 0,
    payout_status VARCHAR(20) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid', 'failed')),
    payout_date TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(tournament_id, user_id)
);

-- ============================================================================
-- WEEKLY WIN TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_tournament_wins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tournament_category_id UUID NOT NULL REFERENCES tournament_categories(id),
    tournament_id UUID NOT NULL REFERENCES active_tournaments(id),
    
    -- Win Details
    prize_amount DECIMAL(10,2) NOT NULL,
    final_rank INTEGER NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    tournament_type VARCHAR(20) NOT NULL,
    
    -- Week Tracking (Monday to Sunday)
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    won_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: One win per category per week per user
    UNIQUE(user_id, tournament_category_id, week_start_date)
);

-- ============================================================================
-- USER COOLDOWNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tournament_cooldowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tournament_category_id UUID NOT NULL REFERENCES tournament_categories(id),
    
    -- Cooldown Details
    last_win_date TIMESTAMPTZ NOT NULL,
    cooldown_until TIMESTAMPTZ NOT NULL,
    win_count_this_week INTEGER DEFAULT 1,
    
    -- Week Tracking
    week_start_date DATE NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: One cooldown record per user per category per week
    UNIQUE(user_id, tournament_category_id, week_start_date)
);

-- ============================================================================
-- 1V1 MATCH TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS match_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 1v1 match tiers
INSERT INTO match_tiers (name, bet_amount, description, game_type) VALUES
('Bronze Match', 5.00, '$5 1v1 skill match', 'multi-target'),
('Silver Match', 10.00, '$10 1v1 skill match', 'falling-objects'),
('Gold Match', 25.00, '$25 1v1 skill match', 'color-sequence');

-- ============================================================================
-- TOURNAMENT GAME SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tournament_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES active_tournaments(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Game Details
    game_type VARCHAR(50) NOT NULL,
    score DECIMAL(10,3) NOT NULL,
    duration_seconds INTEGER,
    
    -- Session Metadata
    session_data JSONB, -- Store game-specific data
    is_best_score BOOLEAN DEFAULT false,
    
    played_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for performance
    INDEX idx_tournament_sessions_tournament (tournament_id),
    INDEX idx_tournament_sessions_user (user_id),
    INDEX idx_tournament_sessions_score (score DESC)
);

-- ============================================================================
-- FUNCTIONS FOR TOURNAMENT MANAGEMENT
-- ============================================================================

-- Function to get current week boundaries (Monday to Sunday)
CREATE OR REPLACE FUNCTION get_current_week_boundaries()
RETURNS TABLE(week_start DATE, week_end DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1 AS week_start,
        CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 7 AS week_end;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can participate in tournament category
CREATE OR REPLACE FUNCTION can_user_participate(
    p_user_id UUID,
    p_category_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    week_boundaries RECORD;
    win_count INTEGER;
    cooldown_record RECORD;
BEGIN
    -- Get current week boundaries
    SELECT * INTO week_boundaries FROM get_current_week_boundaries();
    
    -- Check if user already won this category this week
    SELECT COUNT(*) INTO win_count
    FROM weekly_tournament_wins
    WHERE user_id = p_user_id
    AND tournament_category_id = p_category_id
    AND week_start_date = week_boundaries.week_start;
    
    IF win_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check active cooldown
    SELECT * INTO cooldown_record
    FROM user_tournament_cooldowns
    WHERE user_id = p_user_id
    AND tournament_category_id = p_category_id
    AND cooldown_until > NOW();
    
    IF FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to record tournament win and set cooldown
CREATE OR REPLACE FUNCTION record_tournament_win(
    p_user_id UUID,
    p_tournament_id UUID,
    p_category_id UUID,
    p_prize_amount DECIMAL,
    p_final_rank INTEGER
) RETURNS VOID AS $$
DECLARE
    week_boundaries RECORD;
    tournament_info RECORD;
BEGIN
    -- Get current week boundaries
    SELECT * INTO week_boundaries FROM get_current_week_boundaries();
    
    -- Get tournament info
    SELECT game_type, tournament_type INTO tournament_info
    FROM active_tournaments
    WHERE id = p_tournament_id;
    
    -- Record the win
    INSERT INTO weekly_tournament_wins (
        user_id, tournament_category_id, tournament_id,
        prize_amount, final_rank, game_type, tournament_type,
        week_start_date, week_end_date
    ) VALUES (
        p_user_id, p_category_id, p_tournament_id,
        p_prize_amount, p_final_rank, tournament_info.game_type, tournament_info.tournament_type,
        week_boundaries.week_start, week_boundaries.week_end
    );
    
    -- Set cooldown until next week
    INSERT INTO user_tournament_cooldowns (
        user_id, tournament_category_id, last_win_date, cooldown_until, week_start_date
    ) VALUES (
        p_user_id, p_category_id, NOW(), week_boundaries.week_end + INTERVAL '1 day', week_boundaries.week_start
    )
    ON CONFLICT (user_id, tournament_category_id, week_start_date)
    DO UPDATE SET
        last_win_date = NOW(),
        cooldown_until = week_boundaries.week_end + INTERVAL '1 day',
        win_count_this_week = user_tournament_cooldowns.win_count_this_week + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate new tournament when one completes
CREATE OR REPLACE FUNCTION auto_generate_tournament(
    p_completed_tournament_id UUID
) RETURNS UUID AS $$
DECLARE
    completed_tournament RECORD;
    new_tournament_id UUID;
BEGIN
    -- Get completed tournament details
    SELECT * INTO completed_tournament
    FROM active_tournaments
    WHERE id = p_completed_tournament_id;
    
    -- Create new tournament with same configuration
    INSERT INTO active_tournaments (
        category_id, title, description, prize_pool, entry_fee,
        max_participants, game_type, tournament_type,
        deadline, generation_round, auto_generated, parent_tournament_id
    ) VALUES (
        completed_tournament.category_id,
        completed_tournament.title || ' - Round ' || (completed_tournament.generation_round + 1),
        completed_tournament.description,
        completed_tournament.prize_pool,
        completed_tournament.entry_fee,
        completed_tournament.max_participants,
        completed_tournament.game_type,
        completed_tournament.tournament_type,
        NOW() + INTERVAL '24 hours', -- 24 hour deadline
        completed_tournament.generation_round + 1,
        true,
        p_completed_tournament_id
    ) RETURNING id INTO new_tournament_id;
    
    RETURN new_tournament_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to auto-generate tournaments when one completes
CREATE OR REPLACE FUNCTION trigger_auto_generate_tournament()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-generate if tournament completed successfully
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM auto_generate_tournament(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_tournament_trigger
    AFTER UPDATE ON active_tournaments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_generate_tournament();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_tournament_wins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tournament_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_game_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for tournament_categories (public read)
CREATE POLICY "Tournament categories are publicly readable" ON tournament_categories
    FOR SELECT USING (true);

-- Policies for active_tournaments (public read, admin write)
CREATE POLICY "Active tournaments are publicly readable" ON active_tournaments
    FOR SELECT USING (true);

-- Policies for tournament_participants (users can see their own)
CREATE POLICY "Users can view their own tournament participation" ON tournament_participants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tournament participation" ON tournament_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for weekly_tournament_wins (users can see their own)
CREATE POLICY "Users can view their own tournament wins" ON weekly_tournament_wins
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for user_tournament_cooldowns (users can see their own)
CREATE POLICY "Users can view their own cooldowns" ON user_tournament_cooldowns
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for match_tiers (public read)
CREATE POLICY "Match tiers are publicly readable" ON match_tiers
    FOR SELECT USING (true);

-- Policies for tournament_game_sessions (users can see their own)
CREATE POLICY "Users can view their own game sessions" ON tournament_game_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions" ON tournament_game_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Create initial tournaments for each category
INSERT INTO active_tournaments (
    category_id, title, description, prize_pool, entry_fee, max_participants, game_type, deadline
)
SELECT 
    id,
    name || ' - Round 1',
    description || ' - Auto-generated tournament',
    prize_pool,
    max_bet,
    max_participants,
    game_type,
    NOW() + INTERVAL '24 hours'
FROM tournament_categories
WHERE tournament_type = 'multi';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_wins_user_week ON weekly_tournament_wins(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_cooldowns_user_category ON user_tournament_cooldowns(user_id, tournament_category_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON active_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON tournament_participants(tournament_id);
