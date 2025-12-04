-- CREATE_AD_CAMPAIGN_SYSTEM.sql
-- Complete advertising campaign system for DropDollar
-- Sellers can purchase ad campaigns with tokens (Etsy-style)

-- =====================================================
-- 1. AD CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_username TEXT NOT NULL,
    
    -- Campaign Details
    campaign_name TEXT NOT NULL,
    campaign_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, completed, expired
    
    -- Ad Content
    headline TEXT NOT NULL, -- Main ad headline (60 char limit)
    description TEXT NOT NULL, -- Ad description (150 char limit)
    call_to_action TEXT NOT NULL DEFAULT 'Shop Now', -- CTA button text
    destination_url TEXT NOT NULL, -- Where the ad clicks go
    
    -- Targeting
    target_pages TEXT[] DEFAULT ARRAY['games', 'dashboard', 'tournaments']::TEXT[], -- Which pages to show on
    target_categories TEXT[], -- Optional: specific game categories
    
    -- Budget & Pricing (Token-based, Etsy-style)
    token_budget INTEGER NOT NULL, -- Total tokens allocated
    tokens_spent INTEGER DEFAULT 0, -- Tokens spent so far
    cost_per_impression INTEGER DEFAULT 1, -- Tokens per 1000 impressions
    cost_per_click INTEGER DEFAULT 5, -- Tokens per click
    daily_token_limit INTEGER, -- Optional daily spending cap
    
    -- Performance Metrics
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0, -- If user completes desired action
    click_through_rate NUMERIC(5,2) DEFAULT 0.00, -- CTR percentage
    
    -- Scheduling
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_impression_at TIMESTAMPTZ,
    
    -- Approval (admin can approve/reject)
    admin_approved BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    
    CONSTRAINT valid_budget CHECK (token_budget > 0),
    CONSTRAINT valid_spent CHECK (tokens_spent >= 0 AND tokens_spent <= token_budget),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- =====================================================
-- 2. AD IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ad_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    
    -- Image Details
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'banner', -- banner, square, vertical
    dimensions TEXT, -- e.g., "728x90", "300x250"
    file_size INTEGER, -- bytes
    is_primary BOOLEAN DEFAULT FALSE, -- Main image for the campaign
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_image_type CHECK (image_type IN ('banner', 'square', 'vertical', 'mobile'))
);

-- =====================================================
-- 3. AD IMPRESSIONS LOG (For Analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    
    -- Impression Details
    page_location TEXT NOT NULL, -- Which page showed the ad
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL if anonymous
    session_id TEXT, -- Browser session ID
    
    -- Click Tracking
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ,
    
    -- Conversion Tracking
    converted BOOLEAN DEFAULT FALSE,
    conversion_value NUMERIC(10,2), -- If user bought something
    
    -- Timestamps
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User Agent / Device Info
    user_agent TEXT,
    device_type TEXT, -- mobile, tablet, desktop
    
    -- Token Cost
    tokens_charged INTEGER DEFAULT 0
);

-- =====================================================
-- 4. AD CAMPAIGN TRANSACTIONS (Token Payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ad_campaign_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type TEXT NOT NULL, -- 'purchase', 'refund', 'charge_impression', 'charge_click'
    token_amount INTEGER NOT NULL,
    description TEXT,
    
    -- Balances
    tokens_before INTEGER,
    tokens_after INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('purchase', 'refund', 'charge_impression', 'charge_click', 'bonus'))
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_seller ON public.ad_campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(campaign_status) WHERE campaign_status = 'active';
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_pages ON public.ad_campaigns USING GIN(target_pages);
CREATE INDEX IF NOT EXISTS idx_ad_images_campaign ON public.ad_images(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON public.ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_viewed_at ON public.ad_impressions(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_transactions_campaign ON public.ad_campaign_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_transactions_seller ON public.ad_campaign_transactions(seller_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaign_transactions ENABLE ROW LEVEL SECURITY;

-- Ad Campaigns: Sellers can manage their own, everyone can view approved
DROP POLICY IF EXISTS "Sellers can manage their own campaigns" ON public.ad_campaigns;
CREATE POLICY "Sellers can manage their own campaigns" ON public.ad_campaigns
    FOR ALL USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view approved active campaigns" ON public.ad_campaigns;
CREATE POLICY "Anyone can view approved active campaigns" ON public.ad_campaigns
    FOR SELECT USING (admin_approved = TRUE AND campaign_status = 'active');

-- Ad Images: Sellers can manage their own
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

-- Ad Impressions: System can insert, sellers can view their own stats
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

-- Transactions: Sellers can view their own
DROP POLICY IF EXISTS "Sellers can view their own ad transactions" ON public.ad_campaign_transactions;
CREATE POLICY "Sellers can view their own ad transactions" ON public.ad_campaign_transactions
    FOR SELECT USING (seller_id = auth.uid());

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to create a new ad campaign (with token payment)
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
    -- Get authenticated user
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Not authenticated');
    END IF;
    
    -- Get username
    SELECT username INTO v_username FROM public.users WHERE id = v_seller_id;
    
    -- Check user's token balance
    SELECT COALESCE(tokens, 0) INTO v_current_tokens 
    FROM public.user_balances 
    WHERE user_id = v_seller_id;
    
    IF v_current_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient tokens. You have ' || v_current_tokens || ' tokens, but need ' || p_token_budget
        );
    END IF;
    
    -- Deduct tokens from user balance
    UPDATE public.user_balances
    SET tokens = tokens - p_token_budget,
        updated_at = NOW()
    WHERE user_id = v_seller_id;
    
    -- Create campaign
    INSERT INTO public.ad_campaigns (
        seller_id,
        seller_username,
        campaign_name,
        headline,
        description,
        call_to_action,
        destination_url,
        target_pages,
        token_budget,
        cost_per_impression,
        cost_per_click,
        end_date,
        campaign_status
    ) VALUES (
        v_seller_id,
        v_username,
        p_campaign_name,
        p_headline,
        p_description,
        p_call_to_action,
        p_destination_url,
        p_target_pages,
        p_token_budget,
        p_cost_per_impression,
        p_cost_per_click,
        p_end_date,
        'pending' -- Requires admin approval
    )
    RETURNING id INTO v_campaign_id;
    
    -- Log transaction
    INSERT INTO public.ad_campaign_transactions (
        campaign_id,
        seller_id,
        transaction_type,
        token_amount,
        description,
        tokens_before,
        tokens_after
    ) VALUES (
        v_campaign_id,
        v_seller_id,
        'purchase',
        p_token_budget,
        'Campaign purchase: ' || p_campaign_name,
        v_current_tokens,
        v_current_tokens - p_token_budget
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'campaign_id', v_campaign_id,
        'message', 'Campaign created! Pending admin approval.',
        'tokens_remaining', v_current_tokens - p_token_budget
    );
END;
$$;

-- Function to get active ads for a specific page
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
    ORDER BY RANDOM() -- Randomize ad selection
    LIMIT 3; -- Show up to 3 ads per page
END;
$$;

-- Function to log an ad impression
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
    v_user_id := auth.uid(); -- NULL if not logged in
    
    -- Get campaign pricing
    SELECT cost_per_impression INTO v_cost_per_1000
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Insert impression log
    INSERT INTO public.ad_impressions (
        campaign_id,
        page_location,
        user_id,
        session_id,
        user_agent,
        device_type
    ) VALUES (
        p_campaign_id,
        p_page_location,
        v_user_id,
        p_session_id,
        p_user_agent,
        p_device_type
    );
    
    -- Update campaign stats
    UPDATE public.ad_campaigns
    SET total_impressions = total_impressions + 1,
        last_impression_at = NOW(),
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    -- Charge tokens every 1000 impressions
    SELECT total_impressions INTO v_impressions_count
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    IF v_impressions_count % 1000 = 0 THEN
        v_tokens_to_charge := v_cost_per_1000;
        
        UPDATE public.ad_campaigns
        SET tokens_spent = tokens_spent + v_tokens_to_charge
        WHERE id = p_campaign_id;
        
        -- Log transaction
        INSERT INTO public.ad_campaign_transactions (
            campaign_id,
            seller_id,
            transaction_type,
            token_amount,
            description
        )
        SELECT 
            p_campaign_id,
            seller_id,
            'charge_impression',
            v_tokens_to_charge,
            '1000 impressions charged'
        FROM public.ad_campaigns
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN jsonb_build_object('success', TRUE, 'tokens_charged', v_tokens_to_charge);
END;
$$;

-- Function to log an ad click
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
    -- Mark impression as clicked
    UPDATE public.ad_impressions
    SET clicked = TRUE,
        clicked_at = NOW()
    WHERE id = p_impression_id;
    
    -- Get campaign pricing and seller
    SELECT cost_per_click, seller_id 
    INTO v_cost_per_click, v_seller_id
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Update campaign stats
    UPDATE public.ad_campaigns
    SET total_clicks = total_clicks + 1,
        tokens_spent = tokens_spent + v_cost_per_click,
        click_through_rate = (total_clicks::NUMERIC + 1) / GREATEST(total_impressions, 1) * 100,
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    -- Log transaction
    INSERT INTO public.ad_campaign_transactions (
        campaign_id,
        seller_id,
        transaction_type,
        token_amount,
        description
    ) VALUES (
        p_campaign_id,
        v_seller_id,
        'charge_click',
        v_cost_per_click,
        'Ad click charged'
    );
    
    -- Mark impression as clicked and charge token
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
SELECT '✅ Ad Campaign System Created Successfully!' as result;
SELECT 'Tables: ad_campaigns, ad_images, ad_impressions, ad_campaign_transactions' as info;
SELECT 'Functions: create_ad_campaign, get_active_ads_for_page, log_ad_impression, log_ad_click' as functions;

