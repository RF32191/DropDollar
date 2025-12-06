-- ============================================================================
-- FIX USER AD CAMPAIGNS TO SHOW PROPERLY (V2)
-- ============================================================================
-- More lenient budget checks and better fallback logic
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎯 FIXING USER AD DISPLAY (V2)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Auto-approve all pending user campaigns
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Auto-approving pending user campaigns...';
END $$;

UPDATE public.ad_campaigns
SET admin_approved = TRUE
WHERE campaign_status = 'active'
  AND seller_username != 'DropDollar'
  AND token_budget < 999999999
  AND admin_approved = FALSE;

DO $$
DECLARE
    v_approved_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_approved_count
    FROM public.ad_campaigns
    WHERE campaign_status = 'active'
      AND seller_username != 'DropDollar'
      AND admin_approved = TRUE;
    
    RAISE NOTICE '✅ Total approved user campaigns: %', v_approved_count;
END $$;

-- ============================================================================
-- STEP 2: Update get_active_ads_for_page with more lenient logic
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Updating get_active_ads_for_page function (V2)...';
END $$;

DROP FUNCTION IF EXISTS get_active_ads_for_page(TEXT);

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
    v_user_ad_count INTEGER;
    v_total_ads INTEGER;
BEGIN
    RAISE NOTICE '🔍 [Ads V2] Loading ads for page: %', p_page_location;
    
    -- Count PAID USER ads (non-platform) for this page
    -- MORE LENIENT: Allow ads even if they're at budget (tokens_spent <= token_budget)
    SELECT COUNT(*) INTO v_user_ad_count
    FROM public.ad_campaigns c
    WHERE c.campaign_status = 'active'
    AND c.admin_approved = TRUE
    AND c.tokens_spent <= c.token_budget -- Changed from < to <=
    AND p_page_location = ANY(c.target_pages)
    AND (c.start_date IS NULL OR c.start_date <= NOW())
    AND (c.end_date IS NULL OR c.end_date >= NOW())
    AND c.seller_username != 'DropDollar'
    AND c.token_budget < 999999999;
    
    RAISE NOTICE '💰 [Ads V2] Found % PAID USER campaigns for page ''%''', v_user_ad_count, p_page_location;
    
    -- PRIORITY 1: Show PAID USER ads if they exist
    IF v_user_ad_count > 0 THEN
        RAISE NOTICE '✅ [Ads V2] Returning PAID USER ads';
        
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
            FALSE as is_platform_ad
        FROM public.ad_campaigns c
        WHERE c.campaign_status = 'active'
        AND c.admin_approved = TRUE
        AND c.tokens_spent <= c.token_budget -- Changed from < to <=
        AND p_page_location = ANY(c.target_pages)
        AND (c.start_date IS NULL OR c.start_date <= NOW())
        AND (c.end_date IS NULL OR c.end_date >= NOW())
        AND c.seller_username != 'DropDollar'
        AND c.token_budget < 999999999
        ORDER BY 
            c.total_impressions ASC, -- Rotate fairly
            RANDOM()
        LIMIT 3;
        
        GET DIAGNOSTICS v_total_ads = ROW_COUNT;
        RAISE NOTICE '📤 [Ads V2] Returning % user ads', v_total_ads;
        RETURN;
    END IF;
    
    -- PRIORITY 2: No user ads, show PLATFORM ads as fallback
    RAISE NOTICE '⚠️ [Ads V2] No paid user ads found, showing PLATFORM ads';
    
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
        TRUE as is_platform_ad
    FROM public.ad_campaigns c
    WHERE c.campaign_status = 'active'
    AND c.admin_approved = TRUE
    AND p_page_location = ANY(c.target_pages)
    AND (c.start_date IS NULL OR c.start_date <= NOW())
    AND (c.end_date IS NULL OR c.end_date >= NOW())
    AND (c.seller_username = 'DropDollar' OR c.token_budget >= 999999999)
    ORDER BY RANDOM()
    LIMIT 3;
    
    GET DIAGNOSTICS v_total_ads = ROW_COUNT;
    RAISE NOTICE '📤 [Ads V2] Returning % platform ads', v_total_ads;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Function updated successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing for Winner Takes All...';
END $$;

-- Test the function
SELECT 
    campaign_name,
    seller_username,
    CASE WHEN is_platform_ad THEN '🟦 Platform' ELSE '💰 User Paid' END as type
FROM get_active_ads_for_page('winner-takes-all');

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing for Coin Play...';
END $$;

SELECT 
    campaign_name,
    seller_username,
    CASE WHEN is_platform_ad THEN '🟦 Platform' ELSE '💰 User Paid' END as type
FROM get_active_ads_for_page('coin-play');

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ USER AD PRIORITY FIX COMPLETE (V2)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Changes made:';
    RAISE NOTICE '   - Auto-approved pending user campaigns';
    RAISE NOTICE '   - More lenient budget check (<=instead of <)';
    RAISE NOTICE '   - Better logging for debugging';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 User ads will now show first on all pages!';
    RAISE NOTICE '';
END $$;

