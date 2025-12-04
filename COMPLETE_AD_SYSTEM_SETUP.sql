-- COMPLETE_AD_SYSTEM_SETUP.sql
-- Single file to set up the entire ad campaign system
-- Run this ONE file only

-- =====================================================
-- PART 1: DROP EXISTING TABLES (Clean slate)
-- =====================================================
DROP TABLE IF EXISTS public.ad_impressions CASCADE;
DROP TABLE IF EXISTS public.ad_images CASCADE;
DROP TABLE IF EXISTS public.ad_campaign_transactions CASCADE;
DROP TABLE IF EXISTS public.ad_campaigns CASCADE;

-- =====================================================
-- PART 2: CREATE TABLES
-- =====================================================

-- Create ad_campaigns table
CREATE TABLE public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    seller_username TEXT NOT NULL,
    
    -- Campaign Details
    campaign_name TEXT NOT NULL,
    campaign_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Ad Content
    headline TEXT NOT NULL,
    description TEXT NOT NULL,
    call_to_action TEXT NOT NULL DEFAULT 'Shop Now',
    destination_url TEXT NOT NULL,
    
    -- Targeting
    target_pages TEXT[] DEFAULT ARRAY['games', 'dashboard', 'tournaments']::TEXT[],
    target_categories TEXT[],
    
    -- Budget & Pricing
    token_budget INTEGER NOT NULL,
    tokens_spent INTEGER DEFAULT 0,
    cost_per_impression INTEGER DEFAULT 1,
    cost_per_click INTEGER DEFAULT 5,
    daily_token_limit INTEGER,
    
    -- Performance Metrics
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    click_through_rate NUMERIC(5,2) DEFAULT 0.00,
    
    -- Scheduling
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_impression_at TIMESTAMPTZ,
    
    -- Approval
    admin_approved BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    
    CONSTRAINT valid_budget CHECK (token_budget > 0),
    CONSTRAINT valid_spent CHECK (tokens_spent >= 0 AND tokens_spent <= token_budget),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Try to add foreign key if users table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'id'
    ) THEN
        ALTER TABLE public.ad_campaigns
        ADD CONSTRAINT ad_campaigns_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key constraint to users(id)';
    ELSE
        RAISE NOTICE '⚠️ Skipping foreign key - users.id not found';
    END IF;
END $$;

-- Create ad_images table
CREATE TABLE public.ad_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'banner',
    dimensions TEXT,
    file_size INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_image_type CHECK (image_type IN ('banner', 'square', 'vertical', 'mobile'))
);

-- Create ad_impressions table
CREATE TABLE public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    
    page_location TEXT NOT NULL,
    user_id UUID,
    session_id TEXT,
    
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ,
    
    converted BOOLEAN DEFAULT FALSE,
    conversion_value NUMERIC(10,2),
    
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    user_agent TEXT,
    device_type TEXT,
    
    tokens_charged INTEGER DEFAULT 0
);

-- Create ad_campaign_transactions table
CREATE TABLE public.ad_campaign_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    
    transaction_type TEXT NOT NULL,
    token_amount INTEGER NOT NULL,
    description TEXT,
    
    tokens_before INTEGER,
    tokens_after INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('purchase', 'refund', 'charge_impression', 'charge_click', 'bonus'))
);

-- =====================================================
-- PART 3: CREATE INDEXES
-- =====================================================
CREATE INDEX idx_ad_campaigns_seller ON public.ad_campaigns(seller_id);
CREATE INDEX idx_ad_campaigns_status ON public.ad_campaigns(campaign_status) WHERE campaign_status = 'active';
CREATE INDEX idx_ad_campaigns_pages ON public.ad_campaigns USING GIN(target_pages);
CREATE INDEX idx_ad_images_campaign ON public.ad_images(campaign_id);
CREATE INDEX idx_ad_impressions_campaign ON public.ad_impressions(campaign_id);
CREATE INDEX idx_ad_impressions_viewed_at ON public.ad_impressions(viewed_at DESC);
CREATE INDEX idx_ad_transactions_campaign ON public.ad_campaign_transactions(campaign_id);
CREATE INDEX idx_ad_transactions_seller ON public.ad_campaign_transactions(seller_id);

-- =====================================================
-- PART 4: ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaign_transactions ENABLE ROW LEVEL SECURITY;

-- Ad Campaigns Policies
DROP POLICY IF EXISTS "Sellers can manage their own campaigns" ON public.ad_campaigns;
CREATE POLICY "Sellers can manage their own campaigns" ON public.ad_campaigns
    FOR ALL USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view approved active campaigns" ON public.ad_campaigns;
CREATE POLICY "Anyone can view approved active campaigns" ON public.ad_campaigns
    FOR SELECT USING (admin_approved = TRUE AND campaign_status = 'active');

-- Ad Images Policies
DROP POLICY IF EXISTS "Sellers can manage campaign images" ON public.ad_images;
CREATE POLICY "Sellers can manage campaign images" ON public.ad_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ad_campaigns 
            WHERE ad_campaigns.id = ad_images.campaign_id 
            AND ad_campaigns.seller_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can view approved campaign images" ON public.ad_images;
CREATE POLICY "Anyone can view approved campaign images" ON public.ad_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ad_campaigns 
            WHERE ad_campaigns.id = ad_images.campaign_id 
            AND ad_campaigns.admin_approved = TRUE 
            AND ad_campaigns.campaign_status = 'active'
        )
    );

-- Ad Impressions Policies
DROP POLICY IF EXISTS "System can log ad impressions" ON public.ad_impressions;
CREATE POLICY "System can log ad impressions" ON public.ad_impressions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Sellers can view their campaign impressions" ON public.ad_impressions;
CREATE POLICY "Sellers can view their campaign impressions" ON public.ad_impressions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ad_campaigns 
            WHERE ad_campaigns.id = ad_impressions.campaign_id 
            AND ad_campaigns.seller_id = auth.uid()
        )
    );

-- Transactions Policies
DROP POLICY IF EXISTS "Sellers can view their own ad transactions" ON public.ad_campaign_transactions;
CREATE POLICY "Sellers can view their own ad transactions" ON public.ad_campaign_transactions
    FOR SELECT USING (seller_id = auth.uid());

-- =====================================================
-- PART 5: FUNCTIONS
-- =====================================================

-- Function to create a new ad campaign
DROP FUNCTION IF EXISTS create_ad_campaign;
CREATE OR REPLACE FUNCTION create_ad_campaign(
    p_campaign_name TEXT,
    p_headline TEXT,
    p_description TEXT,
    p_call_to_action TEXT,
    p_destination_url TEXT,
    p_target_pages TEXT[],
    p_token_budget INTEGER,
    p_cost_per_impression INTEGER DEFAULT 1,
    p_cost_per_click INTEGER DEFAULT 5,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_username TEXT;
    v_current_tokens INTEGER;
    v_campaign_id UUID;
BEGIN
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Not authenticated');
    END IF;
    
    SELECT username INTO v_username FROM public.users WHERE id = v_seller_id;
    IF v_username IS NULL THEN
        v_username := 'Unknown Seller';
    END IF;
    
    SELECT COALESCE(tokens, 0) INTO v_current_tokens 
    FROM public.user_balances 
    WHERE user_id = v_seller_id;
    
    IF v_current_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient tokens. You have ' || v_current_tokens || ' tokens, but need ' || p_token_budget
        );
    END IF;
    
    UPDATE public.user_balances
    SET tokens = tokens - p_token_budget,
        updated_at = NOW()
    WHERE user_id = v_seller_id;
    
    INSERT INTO public.ad_campaigns (
        seller_id, seller_username, campaign_name, headline, description,
        call_to_action, destination_url, target_pages, token_budget,
        cost_per_impression, cost_per_click, end_date, campaign_status
    ) VALUES (
        v_seller_id, v_username, p_campaign_name, p_headline, p_description,
        p_call_to_action, p_destination_url, p_target_pages, p_token_budget,
        p_cost_per_impression, p_cost_per_click, p_end_date, 'pending'
    )
    RETURNING id INTO v_campaign_id;
    
    INSERT INTO public.ad_campaign_transactions (
        campaign_id, seller_id, transaction_type, token_amount, description,
        tokens_before, tokens_after
    ) VALUES (
        v_campaign_id, v_seller_id, 'purchase', p_token_budget,
        'Campaign purchase: ' || p_campaign_name,
        v_current_tokens, v_current_tokens - p_token_budget
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'campaign_id', v_campaign_id,
        'message', 'Campaign created! Pending admin approval.',
        'tokens_remaining', v_current_tokens - p_token_budget
    );
END;
$$;

-- Function to get active ads for a page
DROP FUNCTION IF EXISTS get_active_ads_for_page;
CREATE OR REPLACE FUNCTION get_active_ads_for_page(p_page_location TEXT)
RETURNS TABLE (
    id UUID,
    campaign_name TEXT,
    headline TEXT,
    description TEXT,
    call_to_action TEXT,
    destination_url TEXT,
    image_url TEXT,
    seller_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.campaign_name,
        c.headline,
        c.description,
        c.call_to_action,
        c.destination_url,
        COALESCE(
            (SELECT img.image_url FROM public.ad_images img 
             WHERE img.campaign_id = c.id AND img.is_primary = TRUE 
             LIMIT 1),
            (SELECT img.image_url FROM public.ad_images img 
             WHERE img.campaign_id = c.id 
             ORDER BY img.uploaded_at DESC LIMIT 1)
        ) as image_url,
        c.seller_username
    FROM public.ad_campaigns c
    WHERE c.campaign_status = 'active'
    AND c.admin_approved = TRUE
    AND c.tokens_spent < c.token_budget
    AND p_page_location = ANY(c.target_pages)
    AND (c.start_date IS NULL OR c.start_date <= NOW())
    AND (c.end_date IS NULL OR c.end_date >= NOW())
    ORDER BY RANDOM()
    LIMIT 3;
END;
$$;

-- Function to log impression
DROP FUNCTION IF EXISTS log_ad_impression;
CREATE OR REPLACE FUNCTION log_ad_impression(
    p_campaign_id UUID,
    p_page_location TEXT,
    p_session_id TEXT,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT 'desktop'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_cost_per_1000 INTEGER;
    v_impressions_count INTEGER;
    v_tokens_to_charge INTEGER := 0;
BEGIN
    v_user_id := auth.uid();
    
    SELECT cost_per_impression INTO v_cost_per_1000
    FROM public.ad_campaigns WHERE id = p_campaign_id;
    
    INSERT INTO public.ad_impressions (
        campaign_id, page_location, user_id, session_id, user_agent, device_type
    ) VALUES (
        p_campaign_id, p_page_location, v_user_id, p_session_id, p_user_agent, p_device_type
    );
    
    UPDATE public.ad_campaigns
    SET total_impressions = total_impressions + 1,
        last_impression_at = NOW(),
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    SELECT total_impressions INTO v_impressions_count
    FROM public.ad_campaigns WHERE id = p_campaign_id;
    
    IF v_impressions_count % 1000 = 0 THEN
        v_tokens_to_charge := v_cost_per_1000;
        
        UPDATE public.ad_campaigns
        SET tokens_spent = tokens_spent + v_tokens_to_charge
        WHERE id = p_campaign_id;
        
        INSERT INTO public.ad_campaign_transactions (
            campaign_id, seller_id, transaction_type, token_amount, description
        )
        SELECT 
            p_campaign_id, seller_id, 'charge_impression', v_tokens_to_charge,
            '1000 impressions charged'
        FROM public.ad_campaigns WHERE id = p_campaign_id;
    END IF;
    
    RETURN jsonb_build_object('success', TRUE, 'tokens_charged', v_tokens_to_charge);
END;
$$;

-- Function to log click
DROP FUNCTION IF EXISTS log_ad_click;
CREATE OR REPLACE FUNCTION log_ad_click(
    p_campaign_id UUID,
    p_impression_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_per_click INTEGER;
    v_seller_id UUID;
BEGIN
    UPDATE public.ad_impressions
    SET clicked = TRUE, clicked_at = NOW()
    WHERE id = p_impression_id;
    
    SELECT cost_per_click, seller_id 
    INTO v_cost_per_click, v_seller_id
    FROM public.ad_campaigns WHERE id = p_campaign_id;
    
    UPDATE public.ad_campaigns
    SET total_clicks = total_clicks + 1,
        tokens_spent = tokens_spent + v_cost_per_click,
        click_through_rate = (total_clicks::NUMERIC + 1) / GREATEST(total_impressions, 1) * 100,
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    INSERT INTO public.ad_campaign_transactions (
        campaign_id, seller_id, transaction_type, token_amount, description
    ) VALUES (
        p_campaign_id, v_seller_id, 'charge_click', v_cost_per_click, 'Ad click charged'
    );
    
    UPDATE public.ad_impressions
    SET tokens_charged = v_cost_per_click
    WHERE id = p_impression_id;
    
    RETURN jsonb_build_object('success', TRUE, 'tokens_charged', v_cost_per_click);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_ad_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_ads_for_page TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_ad_impression TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_ad_click TO anon, authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AD CAMPAIGN SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Tables created: 4';
    RAISE NOTICE '🔒 RLS policies: Enabled';
    RAISE NOTICE '⚙️ Functions: 4';
    RAISE NOTICE '📍 Ready to use!';
    RAISE NOTICE '========================================';
END $$;

-- Show table counts
SELECT 'ad_campaigns' as table_name, COUNT(*) as rows FROM public.ad_campaigns
UNION ALL
SELECT 'ad_images', COUNT(*) FROM public.ad_images
UNION ALL
SELECT 'ad_impressions', COUNT(*) FROM public.ad_impressions
UNION ALL
SELECT 'ad_campaign_transactions', COUNT(*) FROM public.ad_campaign_transactions;

