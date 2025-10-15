-- COMPLETE DATABASE FIX FOR DROPDOLLAR
-- This will fix all database issues preventing score saving and matchmaking

-- ============================================================================
-- 1. CREATE/FIX MATCHMAKING_QUEUE TABLE
-- ============================================================================

-- Drop and recreate matchmaking_queue table with proper structure
DROP TABLE IF EXISTS matchmaking_queue CASCADE;

CREATE TABLE matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    game_type TEXT NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL,
    skill_rating INTEGER DEFAULT 1000,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
    lot_number TEXT,
    player_score DECIMAL(10,2),
    score_submitted_at TIMESTAMP WITH TIME ZONE,
    matched_with_queue_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_matchmaking_user_id ON matchmaking_queue(user_id);
CREATE INDEX idx_matchmaking_game_type ON matchmaking_queue(game_type);
CREATE INDEX idx_matchmaking_status ON matchmaking_queue(status);
CREATE INDEX idx_matchmaking_lot_number ON matchmaking_queue(lot_number);
CREATE INDEX idx_matchmaking_player_score ON matchmaking_queue(player_score);

-- ============================================================================
-- 2. CREATE/FIX MATCHES TABLE
-- ============================================================================

-- Drop and recreate matches table
DROP TABLE IF EXISTS matches CASCADE;

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number TEXT NOT NULL,
    player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player1_name TEXT NOT NULL,
    player1_score DECIMAL(10,2) NOT NULL,
    player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player2_name TEXT NOT NULL,
    player2_score DECIMAL(10,2) NOT NULL,
    winner_id UUID REFERENCES auth.users(id),
    winner_score DECIMAL(10,2),
    loser_score DECIMAL(10,2),
    prize_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    game_type TEXT NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_matches_lot_number ON matches(lot_number);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_winner_id ON matches(winner_id);
CREATE INDEX idx_matches_game_type ON matches(game_type);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================================================
-- 3. CREATE/FIX GAME_HISTORY TABLE
-- ============================================================================

-- Drop and recreate game_history table with V4 schema
DROP TABLE IF EXISTS game_history CASCADE;

CREATE TABLE game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    game_name TEXT,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2) DEFAULT 100.00,
    avg_reaction_time DECIMAL(10,2),
    reaction_time DECIMAL(10,2),
    game_duration INTEGER,
    duration_seconds INTEGER,
    is_practice BOOLEAN DEFAULT false,
    is_competition BOOLEAN DEFAULT false,
    mode TEXT DEFAULT 'practice' CHECK (mode IN ('practice', 'competition')),
    listing_id UUID,
    entry_number INTEGER,
    placement INTEGER,
    prize_won DECIMAL(10,2) DEFAULT 0,
    tokens_wagered DECIMAL(10,2) DEFAULT 0,
    tokens_won DECIMAL(10,2) DEFAULT 0,
    result TEXT DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_game_history_user_id ON game_history(user_id);
CREATE INDEX idx_game_history_game_type ON game_history(game_type);
CREATE INDEX idx_game_history_mode ON game_history(mode);
CREATE INDEX idx_game_history_score ON game_history(score);
CREATE INDEX idx_game_history_created_at ON game_history(created_at);

-- ============================================================================
-- 4. CREATE/FIX USERS TABLE
-- ============================================================================

-- Ensure users table exists with proper structure
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    tokens DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_winnings DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 5. CREATE/FIX TOKEN_TRANSACTIONS TABLE
-- ============================================================================

-- Ensure token_transactions table exists
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'game_entry', 'win', 'loss', 'refund', 'admin_credit', 'admin_debit')),
    description TEXT,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    stripe_payment_intent_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(type);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- Matchmaking Queue Policies
CREATE POLICY "Users can view all queue entries" ON matchmaking_queue
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own queue entries" ON matchmaking_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entries" ON matchmaking_queue
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue entries" ON matchmaking_queue
    FOR DELETE USING (auth.uid() = user_id);

-- Matches Policies
CREATE POLICY "Users can view all matches" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Users can insert matches" ON matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update matches" ON matches
    FOR UPDATE USING (true);

-- Game History Policies
CREATE POLICY "Users can view all game history" ON game_history
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own game history" ON game_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game history" ON game_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Users Policies
CREATE POLICY "Users can view all user profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Token Transactions Policies
CREATE POLICY "Users can view their own transactions" ON token_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON token_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to find or create a lot
CREATE OR REPLACE FUNCTION find_or_create_lot(
    p_game_type TEXT,
    p_entry_fee DECIMAL(10,2),
    p_skill_rating INTEGER
) RETURNS TEXT AS $$
DECLARE
    lot_number TEXT;
BEGIN
    -- Generate a unique lot number
    lot_number := p_game_type || '-' || p_entry_fee || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER || '-' || substr(md5(random()::text), 1, 4);
    
    RETURN lot_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get user high scores
CREATE OR REPLACE FUNCTION get_user_high_scores(p_user_id UUID)
RETURNS TABLE(
    game_type TEXT,
    best_score DECIMAL(10,2),
    last_score DECIMAL(10,2),
    games_played INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gh.game_type,
        MAX(gh.score) as best_score,
        (SELECT score FROM game_history gh2 
         WHERE gh2.user_id = p_user_id 
         AND gh2.game_type = gh.game_type 
         ORDER BY gh2.created_at DESC 
         LIMIT 1) as last_score,
        COUNT(*)::INTEGER as games_played
    FROM game_history gh
    WHERE gh.user_id = p_user_id
    GROUP BY gh.game_type
    ORDER BY gh.game_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. INSERT SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert a test user if they don't exist
INSERT INTO users (id, username, first_name, last_name, email, tokens, balance)
VALUES (
    '9af41f59-7c68-4dc9-ae29-8997f4558efa',
    'ryanfermoselle',
    'ryanfermoselle',
    '',
    'ryanfermoselle@yahoo.com',
    100.00,
    0.00
) ON CONFLICT (id) DO UPDATE SET
    tokens = EXCLUDED.tokens,
    updated_at = NOW();

-- ============================================================================
-- 10. VERIFY SETUP
-- ============================================================================

-- Check that all tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('matchmaking_queue', 'matches', 'game_history', 'users', 'token_transactions');
    
    IF table_count = 5 THEN
        RAISE NOTICE '✅ All tables created successfully!';
    ELSE
        RAISE NOTICE '❌ Missing tables. Count: %', table_count;
    END IF;
END $$;
