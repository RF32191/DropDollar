-- UPDATE_AD_PRIORITY_SYSTEM.sql
-- Prioritize paid seller ads over free platform ads
-- Platform ads only show when no paid ads exist for that page

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
    seller_username TEXT,
    is_platform_ad BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_paid_ad_count INTEGER;
BEGIN
    -- Count how many PAID (non-platform) ads exist for this page
    SELECT COUNT(*) INTO v_paid_ad_count
    FROM public.ad_campaigns c
    WHERE c.campaign_status = 'active'
    AND c.admin_approved = TRUE
    AND c.tokens_spent < c.token_budget
    AND p_page_location = ANY(c.target_pages)
    AND (c.start_date IS NULL OR c.start_date <= NOW())
    AND (c.end_date IS NULL OR c.end_date >= NOW())
    AND c.seller_username != 'DropDollar' -- Exclude platform ads
    AND c.token_budget < 999999999; -- Exclude unlimited budget (platform) ads
    
    RAISE NOTICE 'Found % paid ads for page: %', v_paid_ad_count, p_page_location;
    
    -- If paid ads exist, show ONLY paid ads (prioritize paying customers!)
    IF v_paid_ad_count > 0 THEN
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
            c.seller_username,
            FALSE as is_platform_ad -- These are PAID ads
        FROM public.ad_campaigns c
        WHERE c.campaign_status = 'active'
        AND c.admin_approved = TRUE
        AND c.tokens_spent < c.token_budget
        AND p_page_location = ANY(c.target_pages)
        AND (c.start_date IS NULL OR c.start_date <= NOW())
        AND (c.end_date IS NULL OR c.end_date >= NOW())
        AND c.seller_username != 'DropDollar'
        AND c.token_budget < 999999999
        ORDER BY RANDOM() -- Rotate fairly among paid ads
        LIMIT 3;
    ELSE
        -- No paid ads, show platform default ads
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
            c.seller_username,
            TRUE as is_platform_ad -- These are FREE platform ads
        FROM public.ad_campaigns c
        WHERE c.campaign_status = 'active'
        AND c.admin_approved = TRUE
        AND p_page_location = ANY(c.target_pages)
        AND (c.start_date IS NULL OR c.start_date <= NOW())
        AND (c.end_date IS NULL OR c.end_date >= NOW())
        AND c.seller_username = 'DropDollar' -- Only platform ads
        ORDER BY RANDOM()
        LIMIT 3;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_ads_for_page TO anon, authenticated;

SELECT '✅ Updated ad priority: Paid seller ads shown first, platform ads as fallback' as result;

