-- Additional Schema Updates for New Features
-- Add these to your existing complete-schema.sql

-- ============================================================================
-- CATEGORY MANAGEMENT SYSTEM
-- ============================================================================

-- Categories table for dynamic category management
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_emoji VARCHAR(10),
    color_theme VARCHAR(50) DEFAULT 'blue',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    total_listings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category subcategories
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    total_listings INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

-- ============================================================================
-- GOFUNDME-STYLE LISTINGS
-- ============================================================================

-- GoFundMe style listings with top 10 winners
CREATE TABLE IF NOT EXISTS gofundme_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    story TEXT, -- Extended story for GoFundMe style
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    funding_goal DECIMAL(10,2) NOT NULL,
    current_funding DECIMAL(10,2) DEFAULT 0.00,
    entry_cost DECIMAL(10,2) DEFAULT 1.00,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'falling-objects', 'color-sequence')),
    max_winners INTEGER DEFAULT 10, -- Top 10 winners
    winner_rewards JSONB, -- Rewards for each position
    image_urls TEXT[],
    video_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'funded', 'completed', 'cancelled')),
    deadline TIMESTAMPTZ,
    total_participants INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GoFundMe participants and rankings
CREATE TABLE IF NOT EXISTS gofundme_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES gofundme_listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    best_score DECIMAL(10,2) DEFAULT 0.00,
    total_attempts INTEGER DEFAULT 0,
    total_contributed DECIMAL(10,2) DEFAULT 0.00,
    final_rank INTEGER,
    reward_earned DECIMAL(10,2) DEFAULT 0.00,
    reward_description TEXT,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id, user_id)
);

-- GoFundMe game sessions
CREATE TABLE IF NOT EXISTS gofundme_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES gofundme_listings(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES gofundme_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score DECIMAL(10,2) NOT NULL,
    contribution_amount DECIMAL(10,2) NOT NULL,
    game_data JSONB,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AD SYSTEM AND TOKEN REWARDS
-- ============================================================================

-- Ad campaigns and banners
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    advertiser_name VARCHAR(255) NOT NULL,
    banner_image_url TEXT,
    banner_html TEXT,
    click_url TEXT,
    target_audience JSONB,
    budget DECIMAL(10,2),
    cost_per_view DECIMAL(6,4),
    cost_per_click DECIMAL(6,4),
    max_daily_views INTEGER,
    current_daily_views INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad campaign submissions (for advertiser registration)
CREATE TABLE IF NOT EXISTS ad_campaign_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    advertiser_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    website TEXT,
    
    -- Campaign Details
    ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('practice_game', 'banner', 'both')),
    campaign_objective VARCHAR(100),
    target_audience JSONB DEFAULT '[]'::jsonb,
    game_types JSONB DEFAULT '[]'::jsonb,
    user_demographics JSONB DEFAULT '[]'::jsonb,
    time_slots JSONB DEFAULT '[]'::jsonb,
    
    -- Creative Assets
    banner_image_url TEXT,
    banner_html TEXT,
    click_url TEXT NOT NULL,
    ad_title VARCHAR(255) NOT NULL,
    ad_description TEXT NOT NULL,
    call_to_action VARCHAR(100) DEFAULT 'Learn More',
    
    -- Budget & Timing
    budget DECIMAL(10,2) NOT NULL,
    cost_per_view DECIMAL(6,4) NOT NULL,
    cost_per_click DECIMAL(6,4) NOT NULL,
    max_daily_views INTEGER NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    -- Additional
    special_requests TEXT,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'active', 'paused', 'completed')),
    is_active BOOLEAN DEFAULT false,
    current_daily_views INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad invoices for billing
CREATE TABLE IF NOT EXISTS ad_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES ad_campaign_submissions(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date TIMESTAMPTZ NOT NULL,
    paid_date TIMESTAMPTZ,
    payment_method_id VARCHAR(255),
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    line_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment intents for processing
CREATE TABLE IF NOT EXISTS ad_payment_intents (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id UUID REFERENCES ad_campaign_submissions(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    payment_method_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions log
CREATE TABLE IF NOT EXISTS ad_payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES ad_invoices(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method_id VARCHAR(255),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway VARCHAR(50), -- 'stripe', 'paypal', etc.
    gateway_transaction_id VARCHAR(255),
    failure_reason TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User payment methods
CREATE TABLE IF NOT EXISTS ad_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    gateway_payment_method_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'bank_account', 'paypal')),
    brand VARCHAR(50),
    last_four VARCHAR(4),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing accounts for advertisers
CREATE TABLE IF NOT EXISTS ad_billing_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) UNIQUE NOT NULL,
    account_balance DECIMAL(10,2) DEFAULT 0.00,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    billing_threshold DECIMAL(10,2) DEFAULT 100.00,
    auto_recharge_enabled BOOLEAN DEFAULT false,
    auto_recharge_amount DECIMAL(10,2) DEFAULT 100.00,
    billing_address JSONB,
    tax_id VARCHAR(50),
    billing_contact_name VARCHAR(255),
    billing_contact_email VARCHAR(255),
    billing_contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User ad interactions and token earning
CREATE TABLE IF NOT EXISTS user_ad_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'click', 'complete')),
    tokens_earned DECIMAL(10,3) DEFAULT 0.00, -- 0.1 tokens per ad view
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad impressions table for practice game ads
CREATE TABLE IF NOT EXISTS ad_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('practice_game', 'banner', 'interstitial')),
    game_type VARCHAR(50),
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_watched INTEGER NOT NULL, -- in seconds
    completed BOOLEAN DEFAULT false,
    skipped BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User token balance from ads
CREATE TABLE IF NOT EXISTS user_ad_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_tokens DECIMAL(10,3) DEFAULT 0.00,
    total_ads_watched INTEGER DEFAULT 0,
    daily_ads_watched INTEGER DEFAULT 0,
    daily_tokens_earned DECIMAL(10,3) DEFAULT 0.00,
    last_ad_watched TIMESTAMPTZ,
    last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Practice game sessions for ad tracking
CREATE TABLE IF NOT EXISTS practice_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    session_count INTEGER NOT NULL, -- Track session number for ad popup trigger
    score DECIMAL(10,2),
    duration INTEGER, -- in seconds
    show_ad BOOLEAN DEFAULT false, -- True every 3rd game
    ad_shown BOOLEAN DEFAULT false,
    ad_campaign_id UUID REFERENCES ad_campaigns(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR NEW FEATURES
-- ============================================================================

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON subcategories(slug);

-- GoFundMe indexes
CREATE INDEX IF NOT EXISTS idx_gofundme_listings_seller_id ON gofundme_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_gofundme_listings_status ON gofundme_listings(status);
CREATE INDEX IF NOT EXISTS idx_gofundme_listings_category ON gofundme_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_gofundme_participants_listing_id ON gofundme_participants(listing_id);
CREATE INDEX IF NOT EXISTS idx_gofundme_participants_user_id ON gofundme_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_gofundme_participants_rank ON gofundme_participants(final_rank);

-- Ad system indexes
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active ON ad_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_submissions_status ON ad_campaign_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_submissions_contact_email ON ad_campaign_submissions(contact_email);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_submissions_ad_type ON ad_campaign_submissions(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_submissions_created_at ON ad_campaign_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_ad_interactions_user_id ON user_ad_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ad_interactions_campaign_id ON user_ad_interactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_type ON ad_impressions(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_viewed_at ON ad_impressions(viewed_at);
CREATE INDEX IF NOT EXISTS idx_user_ad_tokens_user_id ON user_ad_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_game_sessions_user_id ON practice_game_sessions(user_id);

-- ============================================================================
-- RLS POLICIES FOR NEW FEATURES
-- ============================================================================

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gofundme_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gofundme_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gofundme_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaign_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ad_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ad_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_game_sessions ENABLE ROW LEVEL SECURITY;

-- Category policies
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active subcategories" ON subcategories FOR SELECT USING (is_active = true);

-- GoFundMe policies
CREATE POLICY "Anyone can view active gofundme listings" ON gofundme_listings FOR SELECT USING (status = 'active');
CREATE POLICY "Sellers can manage their own gofundme listings" ON gofundme_listings FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Users can view their own gofundme participation" ON gofundme_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gofundme participation" ON gofundme_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ad system policies
CREATE POLICY "Anyone can view active ad campaigns" ON ad_campaigns FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can insert ad campaign submissions" ON ad_campaign_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own ad campaign submissions" ON ad_campaign_submissions FOR SELECT USING (contact_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can view their own ad invoices" ON ad_invoices FOR SELECT USING (campaign_id IN (SELECT id FROM ad_campaign_submissions WHERE contact_email = auth.jwt() ->> 'email'));
CREATE POLICY "Users can view their own payment intents" ON ad_payment_intents FOR SELECT USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can insert their own payment intents" ON ad_payment_intents FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can view their own payment transactions" ON ad_payment_transactions FOR SELECT USING (invoice_id IN (SELECT id FROM ad_invoices WHERE campaign_id IN (SELECT id FROM ad_campaign_submissions WHERE contact_email = auth.jwt() ->> 'email')));
CREATE POLICY "Users can view their own payment methods" ON ad_payment_methods FOR SELECT USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can manage their own payment methods" ON ad_payment_methods FOR ALL USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can view their own billing account" ON ad_billing_accounts FOR SELECT USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can manage their own billing account" ON ad_billing_accounts FOR ALL USING (user_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can view their own ad interactions" ON user_ad_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ad interactions" ON user_ad_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own ad impressions" ON ad_impressions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ad impressions" ON ad_impressions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can view their own ad tokens" ON user_ad_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own ad tokens" ON user_ad_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own practice sessions" ON practice_game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own practice sessions" ON practice_game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS FOR NEW FEATURES
-- ============================================================================

-- Function to update GoFundMe funding amount
CREATE OR REPLACE FUNCTION update_gofundme_funding()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current funding when someone contributes
    UPDATE gofundme_listings 
    SET current_funding = (
        SELECT COALESCE(SUM(contribution_amount), 0) 
        FROM gofundme_game_sessions 
        WHERE listing_id = NEW.listing_id
    ),
    total_participants = (
        SELECT COUNT(DISTINCT user_id) 
        FROM gofundme_participants 
        WHERE listing_id = NEW.listing_id
    ),
    updated_at = NOW()
    WHERE id = NEW.listing_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for GoFundMe funding updates
DROP TRIGGER IF EXISTS update_gofundme_funding_trigger ON gofundme_game_sessions;
CREATE TRIGGER update_gofundme_funding_trigger
    AFTER INSERT ON gofundme_game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_gofundme_funding();

-- Function to update user ad tokens
CREATE OR REPLACE FUNCTION update_user_ad_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Add tokens when user completes an ad view
    IF NEW.interaction_type = 'complete' THEN
        INSERT INTO user_ad_tokens (user_id, total_tokens, total_ads_watched, daily_ads_watched, daily_tokens_earned, last_ad_watched)
        VALUES (NEW.user_id, 0.1, 1, 1, 0.1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_tokens = user_ad_tokens.total_tokens + 0.1,
            total_ads_watched = user_ad_tokens.total_ads_watched + 1,
            daily_ads_watched = CASE 
                WHEN DATE(user_ad_tokens.last_daily_reset) < CURRENT_DATE THEN 1
                ELSE user_ad_tokens.daily_ads_watched + 1
            END,
            daily_tokens_earned = CASE 
                WHEN DATE(user_ad_tokens.last_daily_reset) < CURRENT_DATE THEN 0.1
                ELSE user_ad_tokens.daily_tokens_earned + 0.1
            END,
            last_ad_watched = NOW(),
            last_daily_reset = CASE 
                WHEN DATE(user_ad_tokens.last_daily_reset) < CURRENT_DATE THEN NOW()
                ELSE user_ad_tokens.last_daily_reset
            END,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ad token updates
DROP TRIGGER IF EXISTS update_user_ad_tokens_trigger ON user_ad_interactions;
CREATE TRIGGER update_user_ad_tokens_trigger
    AFTER INSERT ON user_ad_interactions
    FOR EACH ROW EXECUTE FUNCTION update_user_ad_tokens();

-- Function to determine if ad should be shown
CREATE OR REPLACE FUNCTION should_show_ad(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Get user's current practice session count for today
    SELECT COUNT(*) INTO session_count
    FROM practice_game_sessions
    WHERE user_id = p_user_id 
    AND DATE(created_at) = CURRENT_DATE;
    
    -- Show ad every 3rd game
    RETURN (session_count % 3 = 0 AND session_count > 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get active ad campaign
CREATE OR REPLACE FUNCTION get_active_ad_campaign()
RETURNS TABLE(
    campaign_id UUID,
    banner_image_url TEXT,
    banner_html TEXT,
    click_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        ad_campaigns.banner_image_url,
        ad_campaigns.banner_html,
        ad_campaigns.click_url
    FROM ad_campaigns
    WHERE is_active = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
    AND (max_daily_views IS NULL OR current_daily_views < max_daily_views)
    ORDER BY RANDOM()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories
INSERT INTO categories (name, slug, description, icon_emoji, color_theme, sort_order) VALUES
('Electronics', 'electronics', 'Smartphones, laptops, gaming gear, and tech accessories', '📱', 'blue', 1),
('Fashion & Accessories', 'fashion', 'Clothing, shoes, jewelry, and style accessories', '👕', 'pink', 2),
('Home & Garden', 'home-garden', 'Furniture, decor, appliances, and outdoor items', '🏠', 'green', 3),
('Sports & Outdoors', 'sports', 'Athletic gear, outdoor equipment, and fitness accessories', '⚽', 'orange', 4),
('Collectibles & Art', 'collectibles', 'Trading cards, vintage items, artwork, and memorabilia', '🎨', 'purple', 5),
('Books & Media', 'books-media', 'Books, movies, music, and digital content', '📚', 'indigo', 6),
('Toys & Games', 'toys-games', 'Board games, video games, toys, and puzzles', '🎮', 'red', 7),
('Health & Beauty', 'health-beauty', 'Skincare, makeup, wellness, and personal care', '💄', 'rose', 8)
ON CONFLICT (slug) DO NOTHING;
