-- Complete DropDollar Schema for Supabase
-- Run this in your Supabase SQL Editor to set up all tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    is_seller BOOLEAN DEFAULT false,
    seller_status VARCHAR(20) DEFAULT 'none' CHECK (seller_status IN ('none', 'pending', 'approved', 'rejected', 'suspended')),
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User wallets for platform balance
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    pending_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_deposited DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- LISTINGS AND MARKETPLACE
-- ============================================================================

-- Product listings
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    base_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    target_price DECIMAL(10,2) NOT NULL,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    max_attempts INTEGER DEFAULT 3,
    time_limit INTEGER DEFAULT 60, -- seconds
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    image_urls TEXT[],
    condition VARCHAR(20) CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    brand VARCHAR(100),
    model VARCHAR(100),
    specifications JSONB,
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    shipping_time_days INTEGER DEFAULT 7,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'sold', 'expired', 'removed')),
    total_entries INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    expires_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing entries (when users play games)
CREATE TABLE IF NOT EXISTS listing_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_number INTEGER NOT NULL,
    game_score DECIMAL(10,2) NOT NULL,
    game_data JSONB,
    entry_cost DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TOURNAMENTS SYSTEM
-- ============================================================================

-- Daily Tournaments
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

-- Tournament Participants
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

-- Tournament Game Sessions
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

-- Tournament Results
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

-- ============================================================================
-- HOT SELL COMPETITIONS
-- ============================================================================

-- Hot Sell tournaments (different from daily tournaments)
CREATE TABLE IF NOT EXISTS hot_sell_tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    prize_amount DECIMAL(10,2) NOT NULL,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    timer_duration INTEGER NOT NULL, -- in minutes
    max_plays_per_day INTEGER,
    cooldown_period_days INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    current_participants INTEGER DEFAULT 0,
    winner_id UUID REFERENCES auth.users(id),
    winning_score DECIMAL(10,2),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hot Sell participants and sessions
CREATE TABLE IF NOT EXISTS hot_sell_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES hot_sell_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score DECIMAL(10,2) NOT NULL,
    game_data JSONB,
    session_duration INTEGER, -- in seconds
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GAME SCORES AND STATISTICS
-- ============================================================================

-- User game scores (practice mode)
CREATE TABLE IF NOT EXISTS user_game_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    reaction_time DECIMAL(10,3),
    game_duration INTEGER,
    is_best_score BOOLEAN DEFAULT false,
    game_data JSONB,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENTS AND TRANSACTIONS
-- ============================================================================

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'purchase', 'refund', 'tournament_entry', 'tournament_prize', 'listing_entry', 'seller_payout')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    provider_transaction_id VARCHAR(255),
    reference_id UUID, -- Can reference listing, tournament, etc.
    reference_type VARCHAR(50),
    metadata JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament payouts
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

-- ============================================================================
-- SELLER SYSTEM
-- ============================================================================

-- Seller applications
CREATE TABLE IF NOT EXISTS seller_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    business_description TEXT,
    business_address JSONB,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(50),
    tax_id_type VARCHAR(10),
    bank_account JSONB,
    product_categories TEXT[],
    estimated_monthly_volume VARCHAR(50),
    has_business_license BOOLEAN DEFAULT false,
    business_license_number VARCHAR(100),
    has_insurance BOOLEAN DEFAULT false,
    insurance_provider VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_seller_status ON users(seller_status);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_game_type ON listings(game_type);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);

-- Tournament indexes
CREATE INDEX IF NOT EXISTS idx_daily_tournaments_status ON daily_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_daily_tournaments_start_time ON daily_tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_daily_tournaments_game_type ON daily_tournaments(game_type);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);

-- Game scores indexes
CREATE INDEX IF NOT EXISTS idx_user_game_scores_user_id ON user_game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_scores_game_type ON user_game_scores(game_type);
CREATE INDEX IF NOT EXISTS idx_user_game_scores_is_best ON user_game_scores(is_best_score);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_sell_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_sell_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can view public user info" ON users FOR SELECT USING (true);

-- Wallets policies
CREATE POLICY "Users can view their own wallet" ON user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallet" ON user_wallets FOR UPDATE USING (auth.uid() = user_id);

-- Listings policies
CREATE POLICY "Anyone can view active listings" ON listings FOR SELECT USING (status = 'active');
CREATE POLICY "Sellers can manage their own listings" ON listings FOR ALL USING (auth.uid() = seller_id);

-- Tournament policies
CREATE POLICY "Anyone can view tournaments" ON daily_tournaments FOR SELECT USING (true);
CREATE POLICY "Users can view their own participation" ON tournament_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own participation" ON tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Game scores policies
CREATE POLICY "Users can view their own scores" ON user_game_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scores" ON user_game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment policies
CREATE POLICY "Users can view their own transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update tournament participants count
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

-- Trigger for tournament participants
DROP TRIGGER IF EXISTS update_tournament_participants_trigger ON tournament_participants;
CREATE TRIGGER update_tournament_participants_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tournament_participants
    FOR EACH ROW EXECUTE FUNCTION update_tournament_participants();

-- Function to update user wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NEW.transaction_type IN ('deposit', 'tournament_prize', 'refund') THEN
            -- Add to balance
            UPDATE user_wallets 
            SET balance = balance + NEW.amount,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF NEW.transaction_type IN ('withdrawal', 'purchase', 'tournament_entry', 'listing_entry') THEN
            -- Subtract from balance
            UPDATE user_wallets 
            SET balance = balance - NEW.amount,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for wallet balance updates
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON payment_transactions;
CREATE TRIGGER update_wallet_balance_trigger
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

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
