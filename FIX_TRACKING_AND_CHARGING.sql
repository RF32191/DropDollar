-- FIX_TRACKING_AND_CHARGING.sql
-- Ensures clicks and views are properly tracked and charged

-- ========================================
-- STEP 1: Verify columns exist
-- ========================================
DO $$
BEGIN
    -- Add total_impressions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_campaigns' 
        AND column_name = 'total_impressions'
    ) THEN
        ALTER TABLE public.ad_campaigns ADD COLUMN total_impressions BIGINT DEFAULT 0;
        RAISE NOTICE '✅ Added total_impressions column';
    END IF;

    -- Add total_clicks if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_campaigns' 
        AND column_name = 'total_clicks'
    ) THEN
        ALTER TABLE public.ad_campaigns ADD COLUMN total_clicks BIGINT DEFAULT 0;
        RAISE NOTICE '✅ Added total_clicks column';
    END IF;

    -- Add tokens_spent if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_campaigns' 
        AND column_name = 'tokens_spent'
    ) THEN
        ALTER TABLE public.ad_campaigns ADD COLUMN tokens_spent NUMERIC(10, 2) DEFAULT 0.00;
        RAISE NOTICE '✅ Added tokens_spent column';
    END IF;
    
    RAISE NOTICE '✅ All required columns exist';
END $$;

-- ========================================
-- STEP 2: Drop old functions (all versions)
-- ========================================
DROP FUNCTION IF EXISTS log_ad_impression CASCADE;
DROP FUNCTION IF EXISTS log_ad_click CASCADE;

-- ========================================
-- STEP 3: Create impression logging function
-- ========================================
CREATE OR REPLACE FUNCTION log_ad_impression(
    p_campaign_id UUID,
    p_page_location TEXT,
    p_session_id TEXT,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_impression_id UUID;
    v_user_id UUID;
    v_is_platform_ad BOOLEAN;
    v_seller_username TEXT;
    v_base_cost_per_impression NUMERIC(10, 4);
    v_actual_cost NUMERIC(10, 4);
    v_active_ads_count INTEGER;
    v_discount_multiplier NUMERIC(4, 2);
BEGIN
    v_user_id := auth.uid();
    
    -- Check if this is a platform ad
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_impression, 0.001)
    INTO v_is_platform_ad, v_seller_username, v_base_cost_per_impression
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Only calculate pricing for paid ads
    IF NOT v_is_platform_ad THEN
        -- Count active paid ads for dynamic pricing
        SELECT COUNT(*) INTO v_active_ads_count
        FROM public.ad_campaigns
        WHERE campaign_status = 'active'
        AND admin_approved = TRUE
        AND tokens_spent < token_budget
        AND p_page_location = ANY(target_pages)
        AND seller_username != 'DropDollar'
        AND token_budget < 999999999;
        
        -- Calculate discount
        v_discount_multiplier := CASE
            WHEN v_active_ads_count >= 3 THEN 0.34
            WHEN v_active_ads_count = 2 THEN 0.50
            ELSE 1.00
        END;
        
        v_actual_cost := v_base_cost_per_impression * v_discount_multiplier;
        
        RAISE NOTICE '💰 Impression: % ads sharing, charge: % tokens', v_active_ads_count, v_actual_cost;
    ELSE
        v_actual_cost := 0;
    END IF;
    
    -- Log impression
    INSERT INTO public.ad_impressions (
        campaign_id,
        user_id,
        page_location,
        session_id,
        device_type,
        user_agent,
        is_click,
        tokens_charged,
        created_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        p_page_location,
        p_session_id,
        p_device_type,
        p_user_agent,
        FALSE,
        v_actual_cost,
        NOW()
    )
    RETURNING id INTO v_impression_id;
    
    -- Update campaign stats
    IF NOT v_is_platform_ad THEN
        UPDATE public.ad_campaigns
        SET total_impressions = COALESCE(total_impressions, 0) + 1,
            tokens_spent = COALESCE(tokens_spent, 0) + v_actual_cost,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        RAISE NOTICE '✅ Updated campaign: impressions=%, tokens_spent=%', 
                     (SELECT total_impressions FROM public.ad_campaigns WHERE id = p_campaign_id),
                     (SELECT tokens_spent FROM public.ad_campaigns WHERE id = p_campaign_id);
    ELSE
        UPDATE public.ad_campaigns
        SET total_impressions = COALESCE(total_impressions, 0) + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN v_impression_id;
END;
$$;

-- ========================================
-- STEP 4: Create click logging function
-- ========================================
CREATE OR REPLACE FUNCTION log_ad_click(
    p_campaign_id UUID,
    p_impression_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_click_id UUID;
    v_user_id UUID;
    v_is_platform_ad BOOLEAN;
    v_seller_username TEXT;
    v_base_cost_per_click NUMERIC(10, 2);
    v_actual_cost NUMERIC(10, 2);
    v_active_ads_count INTEGER;
    v_discount_multiplier NUMERIC(4, 2);
    v_session_id TEXT;
    v_page_location TEXT;
    v_user_agent TEXT;
    v_device_type TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if this is a platform ad
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_click, 5.0)
    INTO v_is_platform_ad, v_seller_username, v_base_cost_per_click
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Get details from impression if provided
    IF p_impression_id IS NOT NULL THEN
        SELECT session_id, page_location, user_agent, device_type
        INTO v_session_id, v_page_location, v_user_agent, v_device_type
        FROM public.ad_impressions
        WHERE id = p_impression_id;
    END IF;
    
    -- Only calculate pricing for paid ads
    IF NOT v_is_platform_ad THEN
        -- Count active paid ads
        SELECT COUNT(*) INTO v_active_ads_count
        FROM public.ad_campaigns
        WHERE campaign_status = 'active'
        AND admin_approved = TRUE
        AND tokens_spent < token_budget
        AND COALESCE(v_page_location, 'unknown') = ANY(target_pages)
        AND seller_username != 'DropDollar'
        AND token_budget < 999999999;
        
        -- Calculate discount
        v_discount_multiplier := CASE
            WHEN v_active_ads_count >= 3 THEN 0.34
            WHEN v_active_ads_count = 2 THEN 0.50
            ELSE 1.00
        END;
        
        v_actual_cost := v_base_cost_per_click * v_discount_multiplier;
        
        RAISE NOTICE '💰 Click: % ads sharing, charge: % tokens', v_active_ads_count, v_actual_cost;
    ELSE
        v_actual_cost := 0;
    END IF;
    
    -- Log click
    INSERT INTO public.ad_impressions (
        campaign_id,
        user_id,
        page_location,
        session_id,
        device_type,
        user_agent,
        is_click,
        tokens_charged,
        created_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        COALESCE(v_page_location, 'unknown'),
        COALESCE(v_session_id, 'unknown'),
        v_device_type,
        v_user_agent,
        TRUE,
        v_actual_cost,
        NOW()
    )
    RETURNING id INTO v_click_id;
    
    -- Update campaign stats
    IF NOT v_is_platform_ad THEN
        UPDATE public.ad_campaigns
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            tokens_spent = COALESCE(tokens_spent, 0) + v_actual_cost,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        RAISE NOTICE '✅ Updated campaign: clicks=%, tokens_spent=%', 
                     (SELECT total_clicks FROM public.ad_campaigns WHERE id = p_campaign_id),
                     (SELECT tokens_spent FROM public.ad_campaigns WHERE id = p_campaign_id);
    ELSE
        UPDATE public.ad_campaigns
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN v_click_id;
END;
$$;

-- ========================================
-- STEP 5: Grant permissions
-- ========================================
GRANT EXECUTE ON FUNCTION log_ad_impression TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_ad_click TO anon, authenticated;

-- ========================================
-- STEP 6: Test the functions
-- ========================================
SELECT 
    '✅ VERIFICATION' as status,
    id,
    campaign_name,
    total_impressions as impressions,
    total_clicks as clicks,
    tokens_spent as spent,
    token_budget as budget
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'
ORDER BY created_at DESC
LIMIT 5;

SELECT '✅ Tracking functions recreated! Test by viewing/clicking an ad.' as message;

