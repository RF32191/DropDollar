-- UPDATE_DYNAMIC_AD_PRICING.sql
-- Implement dynamic pricing: Sellers pay LESS when sharing banners with other ads
-- Example: 
-- - 1 ad alone = Full price (0.001 per impression, 5 per click)
-- - 2 ads sharing = 50% off (0.0005 per impression, 2.5 per click)
-- - 3+ ads sharing = 66% off (0.00033 per impression, 1.67 per click)

DROP FUNCTION IF EXISTS log_ad_impression CASCADE;
DROP FUNCTION IF EXISTS log_ad_click CASCADE;

-- ========================================
-- Log Ad Impression with Dynamic Pricing
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
    v_user_id := auth.uid(); -- Can be NULL for anonymous users
    
    -- Check if this is a platform ad (no charge) or paid ad (charge tokens)
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_impression, 0.001) -- Default: 1 token per 1000 impressions
    INTO v_is_platform_ad, v_seller_username, v_base_cost_per_impression
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Only charge for paid seller ads
    IF NOT v_is_platform_ad THEN
        -- Count how many PAID ads are active for this page (for dynamic pricing)
        SELECT COUNT(*) INTO v_active_ads_count
        FROM public.ad_campaigns
        WHERE campaign_status = 'active'
        AND admin_approved = TRUE
        AND tokens_spent < token_budget
        AND p_page_location = ANY(target_pages)
        AND seller_username != 'DropDollar'
        AND token_budget < 999999999;
        
        -- Calculate discount multiplier based on how many ads are sharing
        v_discount_multiplier := CASE
            WHEN v_active_ads_count >= 3 THEN 0.34  -- 66% off
            WHEN v_active_ads_count = 2 THEN 0.50   -- 50% off
            ELSE 1.00                                -- Full price (only ad)
        END;
        
        -- Apply dynamic pricing
        v_actual_cost := v_base_cost_per_impression * v_discount_multiplier;
        
        RAISE NOTICE '💰 DYNAMIC PRICING: % ads sharing -> %.0f%% off -> Charge: % tokens (base: %)', 
                      v_active_ads_count, 
                      (1 - v_discount_multiplier) * 100, 
                      v_actual_cost, 
                      v_base_cost_per_impression;
    ELSE
        v_actual_cost := 0;
    END IF;
    
    -- Log the impression
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
    
    -- Only charge tokens for paid seller ads
    IF NOT v_is_platform_ad THEN
        -- Increment impressions count and tokens spent
        UPDATE public.ad_campaigns
        SET total_impressions = COALESCE(total_impressions, 0) + 1,
            tokens_spent = tokens_spent + v_actual_cost,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        -- Log transaction
        INSERT INTO public.ad_campaign_transactions (
            campaign_id,
            user_id,
            transaction_type,
            amount,
            description,
            created_at
        ) VALUES (
            p_campaign_id,
            (SELECT seller_id FROM public.ad_campaigns WHERE id = p_campaign_id),
            'impression_charge',
            v_actual_cost,
            'Impression on ' || p_page_location || ' (' || v_active_ads_count || ' ads sharing)',
            NOW()
        );
    ELSE
        -- Just increment impressions count (no charge)
        UPDATE public.ad_campaigns
        SET total_impressions = COALESCE(total_impressions, 0) + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN v_impression_id;
END;
$$;

-- ========================================
-- Log Ad Click with Dynamic Pricing
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
        COALESCE(cost_per_click, 5.0) -- Default: 5 tokens per click
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
    
    -- Only charge for paid seller ads
    IF NOT v_is_platform_ad THEN
        -- Count how many PAID ads are active for this page
        SELECT COUNT(*) INTO v_active_ads_count
        FROM public.ad_campaigns
        WHERE campaign_status = 'active'
        AND admin_approved = TRUE
        AND tokens_spent < token_budget
        AND COALESCE(v_page_location, 'unknown') = ANY(target_pages)
        AND seller_username != 'DropDollar'
        AND token_budget < 999999999;
        
        -- Calculate discount multiplier
        v_discount_multiplier := CASE
            WHEN v_active_ads_count >= 3 THEN 0.34  -- 66% off
            WHEN v_active_ads_count = 2 THEN 0.50   -- 50% off
            ELSE 1.00                                -- Full price
        END;
        
        -- Apply dynamic pricing
        v_actual_cost := v_base_cost_per_click * v_discount_multiplier;
        
        RAISE NOTICE '💰 CLICK PRICING: % ads sharing -> %.0f%% off -> Charge: % tokens (base: %)', 
                      v_active_ads_count, 
                      (1 - v_discount_multiplier) * 100, 
                      v_actual_cost, 
                      v_base_cost_per_click;
    ELSE
        v_actual_cost := 0;
    END IF;
    
    -- Log the click
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
    
    -- Only charge tokens for paid seller ads
    IF NOT v_is_platform_ad THEN
        -- Increment clicks count and tokens spent
        UPDATE public.ad_campaigns
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            tokens_spent = tokens_spent + v_actual_cost,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        -- Log transaction
        INSERT INTO public.ad_campaign_transactions (
            campaign_id,
            user_id,
            transaction_type,
            amount,
            description,
            created_at
        ) VALUES (
            p_campaign_id,
            (SELECT seller_id FROM public.ad_campaigns WHERE id = p_campaign_id),
            'click_charge',
            v_actual_cost,
            'Click on ' || COALESCE(v_page_location, 'unknown page') || ' (' || v_active_ads_count || ' ads sharing)',
            NOW()
        );
    ELSE
        -- Just increment clicks count (no charge)
        UPDATE public.ad_campaigns
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN v_click_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_ad_impression TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_ad_click TO anon, authenticated;

SELECT '✅ Dynamic ad pricing enabled: Sellers save money when sharing banners!' as result;
SELECT '💡 Pricing: 1 ad = 100%, 2 ads = 50% off each, 3+ ads = 66% off each' as pricing_info;

