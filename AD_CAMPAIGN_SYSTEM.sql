-- ============================================================================
-- AD CAMPAIGN SYSTEM
-- ============================================================================
-- Complete advertising platform where users can spend tokens to run ads
-- on the site. Ads appear in banners and before practice games.
-- ============================================================================

-- ============================================================================
-- 1. AD CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Campaign Details
    campaign_name TEXT NOT NULL,
    advertiser_name TEXT NOT NULL,
    advertiser_website TEXT,
    
    -- Ad Content
    ad_title TEXT NOT NULL,
    ad_description TEXT NOT NULL,
    ad_image_url TEXT, -- URL to uploaded image
    ad_link_url TEXT NOT NULL, -- Where clicking the ad goes
    call_to_action TEXT DEFAULT 'Learn More', -- Button text
    
    -- Targeting & Placement
    placement_type TEXT[] DEFAULT ARRAY['banner', 'pre-game'], -- Where ads appear
    target_pages TEXT[] DEFAULT ARRAY['all'], -- Which pages (all, games, marketplace, etc)
    
    -- Budget & Pricing
    total_tokens_spent NUMERIC DEFAULT 0 NOT NULL,
    daily_budget_tokens NUMERIC, -- Optional daily cap
    cost_per_impression NUMERIC DEFAULT 0.1 NOT NULL, -- Tokens per view
    cost_per_click NUMERIC DEFAULT 1.0 NOT NULL, -- Tokens per click
    
    -- Performance Metrics
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    remaining_budget NUMERIC DEFAULT 0 NOT NULL,
    
    -- Status & Scheduling
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    -- Admin Review
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_budget CHECK (total_tokens_spent >= 0),
    CONSTRAINT positive_remaining CHECK (remaining_budget >= 0),
    CONSTRAINT valid_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user_id ON public.ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active ON public.ad_campaigns(status, start_date, end_date) 
    WHERE status = 'active';

-- ============================================================================
-- 2. AD IMPRESSIONS & CLICKS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
    
    -- Event Details
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous users
    
    -- Context
    page_url TEXT,
    placement_location TEXT, -- 'banner-top', 'pre-game', etc
    device_type TEXT,
    ip_address TEXT, -- For fraud detection
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_events_campaign_id ON public.ad_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_created_at ON public.ad_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON public.ad_events(event_type);

-- ============================================================================
-- 3. AD PRICING TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    tier_description TEXT,
    
    -- Pricing
    min_tokens NUMERIC NOT NULL, -- Minimum spend
    cost_per_impression NUMERIC NOT NULL,
    cost_per_click NUMERIC NOT NULL,
    
    -- Benefits
    priority_level INTEGER DEFAULT 1, -- Higher = shown more often
    max_daily_impressions INTEGER,
    featured_placement BOOLEAN DEFAULT FALSE,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing tiers
INSERT INTO public.ad_pricing_tiers (tier_name, tier_description, min_tokens, cost_per_impression, cost_per_click, priority_level, display_order)
VALUES
    ('Basic', 'Great for getting started. Your ads shown across the site.', 100, 0.1, 1.0, 1, 1),
    ('Standard', 'More visibility with priority placement.', 500, 0.08, 0.8, 2, 2),
    ('Premium', 'Maximum exposure with featured placement.', 1000, 0.05, 0.5, 3, 3),
    ('Enterprise', 'Custom campaigns with dedicated support.', 5000, 0.03, 0.3, 4, 4)
ON CONFLICT (tier_name) DO NOTHING;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Users can view their own campaigns
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can view own campaigns" ON public.ad_campaigns
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create campaigns
DROP POLICY IF EXISTS "Users can create campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can create campaigns" ON public.ad_campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending campaigns
DROP POLICY IF EXISTS "Users can update own pending campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can update own pending campaigns" ON public.ad_campaigns
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Everyone can view active campaigns (for displaying ads)
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.ad_campaigns;
CREATE POLICY "Anyone can view active campaigns" ON public.ad_campaigns
    FOR SELECT USING (status = 'active');

-- Anyone can view pricing tiers
DROP POLICY IF EXISTS "Anyone can view pricing tiers" ON public.ad_pricing_tiers;
CREATE POLICY "Anyone can view pricing tiers" ON public.ad_pricing_tiers
    FOR SELECT USING (is_active = TRUE);

-- Ad events - insert only for tracking
DROP POLICY IF EXISTS "Anyone can record ad events" ON public.ad_events;
CREATE POLICY "Anyone can record ad events" ON public.ad_events
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================

-- Function to create an ad campaign
CREATE OR REPLACE FUNCTION public.create_ad_campaign(
    campaign_name_param TEXT,
    advertiser_name_param TEXT,
    ad_title_param TEXT,
    ad_description_param TEXT,
    ad_link_url_param TEXT,
    ad_image_url_param TEXT,
    placement_type_param TEXT[],
    target_pages_param TEXT[],
    token_amount_param NUMERIC,
    tier_id_param UUID,
    start_date_param TIMESTAMPTZ,
    end_date_param TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_campaign_id UUID;
    v_user_tokens NUMERIC;
    v_tier RECORD;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get pricing tier
    SELECT * INTO v_tier FROM public.ad_pricing_tiers WHERE id = tier_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid pricing tier');
    END IF;
    
    -- Validate minimum spend
    IF token_amount_param < v_tier.min_tokens THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('Minimum spend for %s tier is %s tokens', v_tier.tier_name, v_tier.min_tokens)
        );
    END IF;
    
    -- Check user has enough tokens (purchased + won)
    SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)
    INTO v_user_tokens
    FROM public.users
    WHERE id = v_user_id;
    
    IF v_user_tokens < token_amount_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens (use purchased first, then won)
    UPDATE public.users
    SET purchased_tokens = GREATEST(0, purchased_tokens - token_amount_param),
        won_tokens = CASE 
            WHEN purchased_tokens >= token_amount_param THEN won_tokens
            ELSE GREATEST(0, won_tokens - (token_amount_param - purchased_tokens))
        END,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Create campaign
    INSERT INTO public.ad_campaigns (
        user_id,
        campaign_name,
        advertiser_name,
        ad_title,
        ad_description,
        ad_link_url,
        ad_image_url,
        placement_type,
        target_pages,
        total_tokens_spent,
        remaining_budget,
        cost_per_impression,
        cost_per_click,
        status,
        start_date,
        end_date
    ) VALUES (
        v_user_id,
        campaign_name_param,
        advertiser_name_param,
        ad_title_param,
        ad_description_param,
        ad_link_url_param,
        ad_image_url_param,
        placement_type_param,
        target_pages_param,
        token_amount_param,
        token_amount_param, -- Full budget available
        v_tier.cost_per_impression,
        v_tier.cost_per_click,
        'pending', -- Awaiting admin approval
        start_date_param,
        end_date_param
    )
    RETURNING id INTO v_campaign_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'message', 'Campaign created! Awaiting admin approval.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ad_campaign TO authenticated;

-- Function to record ad impression
CREATE OR REPLACE FUNCTION public.record_ad_impression(
    campaign_id_param UUID,
    page_url_param TEXT,
    placement_location_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_cost NUMERIC;
    v_remaining NUMERIC;
BEGIN
    v_user_id := auth.uid(); -- Can be NULL for anonymous users
    
    -- Get campaign cost and remaining budget
    SELECT cost_per_impression, remaining_budget
    INTO v_cost, v_remaining
    FROM public.ad_campaigns
    WHERE id = campaign_id_param AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Campaign not found or inactive');
    END IF;
    
    -- Check if budget available
    IF v_remaining < v_cost THEN
        -- Pause campaign (out of budget)
        UPDATE public.ad_campaigns
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = campaign_id_param;
        
        RETURN jsonb_build_object('success', false, 'message', 'Campaign out of budget');
    END IF;
    
    -- Record impression
    INSERT INTO public.ad_events (campaign_id, event_type, user_id, page_url, placement_location)
    VALUES (campaign_id_param, 'impression', v_user_id, page_url_param, placement_location_param);
    
    -- Update campaign stats and deduct budget
    UPDATE public.ad_campaigns
    SET total_impressions = total_impressions + 1,
        remaining_budget = remaining_budget - v_cost,
        updated_at = NOW()
    WHERE id = campaign_id_param;
    
    RETURN jsonb_build_object('success', true);
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ad_impression TO authenticated, anon;

-- Function to record ad click
CREATE OR REPLACE FUNCTION public.record_ad_click(
    campaign_id_param UUID,
    page_url_param TEXT,
    placement_location_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_cost NUMERIC;
    v_remaining NUMERIC;
BEGIN
    v_user_id := auth.uid();
    
    -- Get campaign cost and remaining budget
    SELECT cost_per_click, remaining_budget
    INTO v_cost, v_remaining
    FROM public.ad_campaigns
    WHERE id = campaign_id_param AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Campaign not found or inactive');
    END IF;
    
    -- Check if budget available
    IF v_remaining < v_cost THEN
        UPDATE public.ad_campaigns
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = campaign_id_param;
        
        RETURN jsonb_build_object('success', false, 'message', 'Campaign out of budget');
    END IF;
    
    -- Record click
    INSERT INTO public.ad_events (campaign_id, event_type, user_id, page_url, placement_location)
    VALUES (campaign_id_param, 'click', v_user_id, page_url_param, placement_location_param);
    
    -- Update campaign stats and deduct budget
    UPDATE public.ad_campaigns
    SET total_clicks = total_clicks + 1,
        remaining_budget = remaining_budget - v_cost,
        updated_at = NOW()
    WHERE id = campaign_id_param;
    
    RETURN jsonb_build_object('success', true);
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ad_click TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Ad Campaign System Created!';
  RAISE NOTICE '- Ad campaigns table with budget tracking';
  RAISE NOTICE '- Ad events tracking (impressions & clicks)';
  RAISE NOTICE '- Pricing tiers (Basic, Standard, Premium, Enterprise)';
  RAISE NOTICE '- RLS policies for security';
  RAISE NOTICE '- Functions for creating campaigns and tracking performance';
END $$;

