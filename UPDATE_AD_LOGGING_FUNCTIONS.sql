-- UPDATE_AD_LOGGING_FUNCTIONS.sql
-- Update impression and click logging to NOT charge tokens for platform ads
-- Only charge for paid seller ads

DROP FUNCTION IF EXISTS log_ad_impression;
DROP FUNCTION IF EXISTS log_ad_click;

-- ========================================
-- Log Ad Impression (View)
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
    v_cost_per_impression NUMERIC(10, 2);
BEGIN
    v_user_id := auth.uid(); -- Can be NULL for anonymous users
    
    -- Check if this is a platform ad (no charge) or paid ad (charge tokens)
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_impression, 0.001) -- Default: 1 token per 1000 impressions
    INTO v_is_platform_ad, v_seller_username, v_cost_per_impression
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
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
        CASE WHEN v_is_platform_ad THEN 0 ELSE v_cost_per_impression END,
        NOW()
    )
    RETURNING id INTO v_impression_id;
    
    -- Only charge tokens for paid seller ads
    IF NOT v_is_platform_ad THEN
        -- Increment impressions count and tokens spent
        UPDATE public.ad_campaigns
        SET impressions_count = impressions_count + 1,
            tokens_spent = tokens_spent + v_cost_per_impression,
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
            v_cost_per_impression,
            'Impression on ' || p_page_location,
            NOW()
        );
        
        RAISE NOTICE '💰 PAID AD: Charged % tokens for impression (seller: %)', v_cost_per_impression, v_seller_username;
    ELSE
        -- Just increment impressions count (no charge)
        UPDATE public.ad_campaigns
        SET impressions_count = impressions_count + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        RAISE NOTICE '🆓 PLATFORM AD: Free impression (no charge)';
    END IF;
    
    RETURN v_impression_id;
END;
$$;

-- ========================================
-- Log Ad Click
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
    v_cost_per_click NUMERIC(10, 2);
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
    INTO v_is_platform_ad, v_seller_username, v_cost_per_click
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Get details from impression if provided
    IF p_impression_id IS NOT NULL THEN
        SELECT session_id, page_location, user_agent, device_type
        INTO v_session_id, v_page_location, v_user_agent, v_device_type
        FROM public.ad_impressions
        WHERE id = p_impression_id;
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
        CASE WHEN v_is_platform_ad THEN 0 ELSE v_cost_per_click END,
        NOW()
    )
    RETURNING id INTO v_click_id;
    
    -- Only charge tokens for paid seller ads
    IF NOT v_is_platform_ad THEN
        -- Increment clicks count and tokens spent
        UPDATE public.ad_campaigns
        SET clicks_count = clicks_count + 1,
            tokens_spent = tokens_spent + v_cost_per_click,
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
            v_cost_per_click,
            'Click on ' || COALESCE(v_page_location, 'unknown page'),
            NOW()
        );
        
        RAISE NOTICE '💰 PAID AD: Charged % tokens for click (seller: %)', v_cost_per_click, v_seller_username;
    ELSE
        -- Just increment clicks count (no charge)
        UPDATE public.ad_campaigns
        SET clicks_count = clicks_count + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        RAISE NOTICE '🆓 PLATFORM AD: Free click (no charge)';
    END IF;
    
    RETURN v_click_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_ad_impression TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_ad_click TO anon, authenticated;

SELECT '✅ Updated ad logging: Platform ads are FREE, paid ads charge tokens' as result;

