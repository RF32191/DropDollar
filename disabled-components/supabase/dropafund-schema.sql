-- DropAFund Schema Update - Flexible Winner System
-- Add these updates to your Supabase database

-- ============================================================================
-- DROPAFUND CATEGORY SYSTEM
-- ============================================================================

-- Update gofundme_listings to support flexible winner counts
ALTER TABLE gofundme_listings 
ADD COLUMN IF NOT EXISTS min_winners INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_winners INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS winner_selection_type VARCHAR(20) DEFAULT 'top_scores' CHECK (winner_selection_type IN ('top_scores', 'random_from_top', 'all_participants')),
ADD COLUMN IF NOT EXISTS is_dropafund BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS funding_type VARCHAR(20) DEFAULT 'crowdfund' CHECK (funding_type IN ('crowdfund', 'dropafund', 'competition'));

-- Update winner rewards to support flexible structure
ALTER TABLE gofundme_listings
ADD COLUMN IF NOT EXISTS reward_structure JSONB DEFAULT '{"type": "percentage", "distribution": []}';

-- Create DropAFund specific table for better organization
CREATE TABLE IF NOT EXISTS dropafund_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    story TEXT,
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    
    -- Funding Configuration
    funding_goal DECIMAL(10,2) NOT NULL,
    current_funding DECIMAL(10,2) DEFAULT 0.00,
    entry_cost DECIMAL(10,2) DEFAULT 0.20,
    
    -- Game Configuration
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    game_difficulty VARCHAR(20) DEFAULT 'medium' CHECK (game_difficulty IN ('easy', 'medium', 'hard')),
    
    -- Winner Configuration (Flexible)
    min_winners INTEGER DEFAULT 1,
    max_winners INTEGER DEFAULT 100,
    winner_selection_type VARCHAR(20) DEFAULT 'top_scores' CHECK (winner_selection_type IN ('top_scores', 'percentage_based', 'threshold_based')),
    winner_percentage DECIMAL(5,2), -- For percentage-based selection (e.g., top 10%)
    score_threshold DECIMAL(10,2), -- For threshold-based selection
    
    -- Reward Structure
    reward_structure JSONB DEFAULT '{"type": "equal", "rewards": []}',
    total_reward_pool DECIMAL(10,2) DEFAULT 0.00,
    
    -- Media & Links
    image_urls TEXT[],
    youtube_url TEXT, -- YouTube video URL for business plan/campaign video
    video_url TEXT,
    
    -- Status and Timing
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'funded', 'completed', 'cancelled')),
    deadline TIMESTAMPTZ,
    
    -- Stats
    total_participants INTEGER DEFAULT 0,
    total_games_played INTEGER DEFAULT 0,
    average_score DECIMAL(10,2) DEFAULT 0.00,
    highest_score DECIMAL(10,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DropAFund participants with enhanced tracking
CREATE TABLE IF NOT EXISTS dropafund_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES dropafund_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    
    -- Performance Tracking
    best_score DECIMAL(10,2) DEFAULT 0.00,
    average_score DECIMAL(10,2) DEFAULT 0.00,
    total_attempts INTEGER DEFAULT 0,
    total_contributed DECIMAL(10,2) DEFAULT 0.00,
    
    -- Ranking and Rewards
    current_rank INTEGER,
    final_rank INTEGER,
    is_winner BOOLEAN DEFAULT false,
    reward_earned DECIMAL(10,2) DEFAULT 0.00,
    reward_description TEXT,
    reward_tier VARCHAR(50),
    
    -- Timestamps
    first_played_at TIMESTAMPTZ DEFAULT NOW(),
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, user_id)
);

-- Enhanced game sessions for DropAFund
CREATE TABLE IF NOT EXISTS dropafund_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES dropafund_campaigns(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES dropafund_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Game Data
    game_type VARCHAR(50) NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    reaction_time DECIMAL(10,3),
    game_duration INTEGER, -- in seconds
    session_data JSONB,
    
    -- Contribution
    contribution_amount DECIMAL(10,2) NOT NULL,
    
    -- Performance Metrics
    is_personal_best BOOLEAN DEFAULT false,
    rank_at_time INTEGER,
    percentile DECIMAL(5,2),
    
    -- Timestamps
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprehensive scoreboard for all listings
CREATE TABLE IF NOT EXISTS listing_scoreboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL, -- Can reference any listing type
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('regular', 'dropafund', 'tournament')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    
    -- Score Data
    best_score DECIMAL(10,2) NOT NULL,
    average_score DECIMAL(10,2),
    total_attempts INTEGER DEFAULT 1,
    current_rank INTEGER,
    
    -- Game Info
    game_type VARCHAR(50) NOT NULL,
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance Metrics
    accuracy DECIMAL(5,2),
    avg_reaction_time DECIMAL(10,3),
    consistency_score DECIMAL(5,2), -- How consistent scores are
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(listing_id, listing_type, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dropafund_campaigns_seller_id ON dropafund_campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_dropafund_campaigns_status ON dropafund_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_dropafund_campaigns_category ON dropafund_campaigns(category_id);
CREATE INDEX IF NOT EXISTS idx_dropafund_campaigns_game_type ON dropafund_campaigns(game_type);

CREATE INDEX IF NOT EXISTS idx_dropafund_participants_campaign_id ON dropafund_participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dropafund_participants_user_id ON dropafund_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dropafund_participants_rank ON dropafund_participants(current_rank);
CREATE INDEX IF NOT EXISTS idx_dropafund_participants_score ON dropafund_participants(best_score DESC);

CREATE INDEX IF NOT EXISTS idx_dropafund_sessions_campaign_id ON dropafund_game_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dropafund_sessions_user_id ON dropafund_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dropafund_sessions_score ON dropafund_game_sessions(score DESC);

CREATE INDEX IF NOT EXISTS idx_listing_scoreboards_listing ON listing_scoreboards(listing_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_listing_scoreboards_user ON listing_scoreboards(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_scoreboards_rank ON listing_scoreboards(current_rank);
CREATE INDEX IF NOT EXISTS idx_listing_scoreboards_score ON listing_scoreboards(best_score DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE dropafund_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropafund_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropafund_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_scoreboards ENABLE ROW LEVEL SECURITY;

-- DropAFund campaign policies
CREATE POLICY "Anyone can view active dropafund campaigns" ON dropafund_campaigns FOR SELECT USING (status IN ('active', 'funded'));
CREATE POLICY "Sellers can manage their own dropafund campaigns" ON dropafund_campaigns FOR ALL USING (auth.uid() = seller_id);

-- Participant policies
CREATE POLICY "Anyone can view dropafund participants" ON dropafund_participants FOR SELECT USING (true);
CREATE POLICY "Users can manage their own dropafund participation" ON dropafund_participants FOR ALL USING (auth.uid() = user_id);

-- Game session policies
CREATE POLICY "Anyone can view dropafund game sessions" ON dropafund_game_sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own dropafund game sessions" ON dropafund_game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scoreboard policies
CREATE POLICY "Anyone can view scoreboards" ON listing_scoreboards FOR SELECT USING (true);
CREATE POLICY "Users can manage their own scoreboard entries" ON listing_scoreboards FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR DROPAFUND SYSTEM
-- ============================================================================

-- Function to update DropAFund campaign stats
CREATE OR REPLACE FUNCTION update_dropafund_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign statistics
    UPDATE dropafund_campaigns 
    SET 
        current_funding = (
            SELECT COALESCE(SUM(contribution_amount), 0) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id
        ),
        total_participants = (
            SELECT COUNT(DISTINCT user_id) 
            FROM dropafund_participants 
            WHERE campaign_id = NEW.campaign_id
        ),
        total_games_played = (
            SELECT COUNT(*) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id
        ),
        average_score = (
            SELECT COALESCE(AVG(score), 0) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id
        ),
        highest_score = (
            SELECT COALESCE(MAX(score), 0) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id
        ),
        updated_at = NOW()
    WHERE id = NEW.campaign_id;
    
    -- Update participant stats
    UPDATE dropafund_participants 
    SET 
        best_score = (
            SELECT COALESCE(MAX(score), 0) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id AND user_id = NEW.user_id
        ),
        average_score = (
            SELECT COALESCE(AVG(score), 0) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id AND user_id = NEW.user_id
        ),
        total_attempts = (
            SELECT COUNT(*) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id AND user_id = NEW.user_id
        ),
        total_contributed = (
            SELECT COALESCE(SUM(contribution_amount), 0) 
            FROM dropafund_game_sessions 
            WHERE campaign_id = NEW.campaign_id AND user_id = NEW.user_id
        ),
        last_played_at = NOW(),
        updated_at = NOW()
    WHERE campaign_id = NEW.campaign_id AND user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for DropAFund stats updates
DROP TRIGGER IF EXISTS update_dropafund_stats_trigger ON dropafund_game_sessions;
CREATE TRIGGER update_dropafund_stats_trigger
    AFTER INSERT ON dropafund_game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_dropafund_stats();

-- Function to update rankings
CREATE OR REPLACE FUNCTION update_dropafund_rankings(campaign_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Update current rankings based on best scores
    WITH ranked_participants AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY best_score DESC, total_attempts ASC) as new_rank
        FROM dropafund_participants 
        WHERE campaign_id = campaign_uuid
    )
    UPDATE dropafund_participants 
    SET current_rank = ranked_participants.new_rank,
        updated_at = NOW()
    FROM ranked_participants 
    WHERE dropafund_participants.id = ranked_participants.id;
END;
$$ LANGUAGE plpgsql;

-- Function to update universal scoreboard
CREATE OR REPLACE FUNCTION update_listing_scoreboard()
RETURNS TRIGGER AS $$
DECLARE
    listing_uuid UUID;
    listing_type_val VARCHAR(20);
BEGIN
    -- Determine listing ID and type based on the table
    IF TG_TABLE_NAME = 'dropafund_game_sessions' THEN
        listing_uuid := NEW.campaign_id;
        listing_type_val := 'dropafund';
    ELSIF TG_TABLE_NAME = 'listing_entries' THEN
        listing_uuid := NEW.listing_id;
        listing_type_val := 'regular';
    ELSIF TG_TABLE_NAME = 'tournament_game_sessions' THEN
        listing_uuid := NEW.tournament_id;
        listing_type_val := 'tournament';
    ELSE
        RETURN NEW;
    END IF;
    
    -- Update or insert scoreboard entry
    INSERT INTO listing_scoreboards (
        listing_id, listing_type, user_id, username, best_score, 
        average_score, total_attempts, game_type, last_played_at
    ) VALUES (
        listing_uuid, listing_type_val, NEW.user_id, 
        (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1),
        NEW.score, NEW.score, 1, 
        COALESCE(NEW.game_type, 'multi-target'), NOW()
    )
    ON CONFLICT (listing_id, listing_type, user_id) DO UPDATE SET
        best_score = GREATEST(listing_scoreboards.best_score, NEW.score),
        average_score = (
            (listing_scoreboards.average_score * listing_scoreboards.total_attempts + NEW.score) / 
            (listing_scoreboards.total_attempts + 1)
        ),
        total_attempts = listing_scoreboards.total_attempts + 1,
        last_played_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for scoreboard updates
DROP TRIGGER IF EXISTS update_scoreboard_dropafund ON dropafund_game_sessions;
CREATE TRIGGER update_scoreboard_dropafund
    AFTER INSERT ON dropafund_game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_listing_scoreboard();

-- Insert DropAFund category
INSERT INTO categories (name, slug, description, icon_emoji, color_theme, sort_order) VALUES
('DropAFund', 'dropafund', 'Community-funded competitions with multiple winners and flexible rewards', '💧', 'cyan', 0)
ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    icon_emoji = EXCLUDED.icon_emoji,
    color_theme = EXCLUDED.color_theme;
