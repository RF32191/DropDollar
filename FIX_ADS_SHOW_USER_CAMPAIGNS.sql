-- ============================================================================
-- FIX ADS TO SHOW USER CAMPAIGNS (NOT JUST PLATFORM ADS)
-- ============================================================================
-- Problem: Winner Takes All showing platform ad instead of actual user campaigns
-- Solution: Fix priority system and ensure user campaigns display first
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎯 FIXING AD DISPLAY FOR USER CAMPAIGNS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: CHECK CURRENT AD CAMPAIGNS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Checking current ad campaigns...';
END $$;

-- Show all active campaigns
SELECT 
    campaign_name,
    seller_username,
    campaign_status,
    admin_approved,
    token_budget,
    tokens_spent,
    target_pages,
    CASE 
        WHEN seller_username = 'DropDollar' THEN 'PLATFORM AD (FREE)'
        WHEN token_budget >= 999999999 THEN 'PLATFORM AD (FREE)'
        ELSE 'USER AD (PAID)'
    END as ad_type
FROM public.ad_campaigns
WHERE campaign_status = 'active'
  AND admin_approved = TRUE
ORDER BY 
    CASE WHEN seller_username != 'DropDollar' THEN 0 ELSE 1 END,
    created_at DESC;

-- ============================================================================
-- STEP 2: FIX get_active_ads_for_page FUNCTION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Updating get_active_ads_for_page function...';
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
    RAISE NOTICE '🔍 [get_active_ads_for_page] Loading ads for page: %', p_page_location;
    
    -- Count PAID USER ads (non-platform) for this page
    SELECT COUNT(*) INTO v_user_ad_count
    FROM public.ad_campaigns c
    WHERE c.campaign_status = 'active'
    AND c.admin_approved = TRUE
    AND c.tokens_spent < c.token_budget
    AND p_page_location = ANY(c.target_pages)
    AND (c.start_date IS NULL OR c.start_date <= NOW())
    AND (c.end_date IS NULL OR c.end_date >= NOW())
    AND c.seller_username != 'DropDollar' -- Exclude platform
    AND c.token_budget < 999999999; -- Exclude unlimited budget (platform ads)
    
    RAISE NOTICE '💰 [get_active_ads_for_page] Found % PAID USER ads', v_user_ad_count;
    
    -- PRIORITY 1: Show PAID USER ads if they exist
    IF v_user_ad_count > 0 THEN
        RAISE NOTICE '✅ [get_active_ads_for_page] Returning PAID USER ads';
        
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
            FALSE as is_platform_ad -- These are PAID USER ads
        FROM public.ad_campaigns c
        WHERE c.campaign_status = 'active'
        AND c.admin_approved = TRUE
        AND c.tokens_spent < c.token_budget
        AND p_page_location = ANY(c.target_pages)
        AND (c.start_date IS NULL OR c.start_date <= NOW())
        AND (c.end_date IS NULL OR c.end_date >= NOW())
        AND c.seller_username != 'DropDollar'
        AND c.token_budget < 999999999
        ORDER BY 
            c.total_impressions ASC, -- Rotate fairly - show least-seen first
            RANDOM()
        LIMIT 3;
        
        -- Count what we're returning
        GET DIAGNOSTICS v_total_ads = ROW_COUNT;
        RAISE NOTICE '📤 [get_active_ads_for_page] Returning % ads', v_total_ads;
        RETURN;
    END IF;
    
    -- PRIORITY 2: No user ads, show PLATFORM ads as fallback
    RAISE NOTICE '⚠️ [get_active_ads_for_page] No paid user ads found, showing PLATFORM ads as fallback';
    
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
        TRUE as is_platform_ad -- These are FREE PLATFORM ads
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
    RAISE NOTICE '📤 [get_active_ads_for_page] Returning % platform ads', v_total_ads;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_ads_for_page TO anon, authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Function updated!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: TEST THE FIX
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TESTING AD DISPLAY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing get_active_ads_for_page function:';
END $$;

-- Test for Winner Takes All
SELECT 
    '🧪 WINNER TAKES ALL TEST:' as test,
    campaign_name,
    seller_username,
    is_platform_ad
FROM get_active_ads_for_page('winner-takes-all');

-- Test for Coin Play
SELECT 
    '🧪 COIN PLAY TEST:' as test,
    campaign_name,
    seller_username,
    is_platform_ad
FROM get_active_ads_for_page('coin-play');

-- Test for Games
SELECT 
    '🧪 GAMES TEST:' as test,
    campaign_name,
    seller_username,
    is_platform_ad
FROM get_active_ads_for_page('games');

-- ============================================================================
-- STEP 4: SUMMARY
-- ============================================================================

DO $$
DECLARE
    v_user_campaigns INTEGER;
    v_platform_campaigns INTEGER;
    v_pending_campaigns INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Count user campaigns
    SELECT COUNT(*) INTO v_user_campaigns
    FROM public.ad_campaigns
    WHERE campaign_status = 'active'
      AND admin_approved = TRUE
      AND seller_username != 'DropDollar'
      AND token_budget < 999999999;
    
    -- Count platform campaigns
    SELECT COUNT(*) INTO v_platform_campaigns
    FROM public.ad_campaigns
    WHERE campaign_status = 'active'
      AND admin_approved = TRUE
      AND (seller_username = 'DropDollar' OR token_budget >= 999999999);
    
    -- Count pending campaigns
    SELECT COUNT(*) INTO v_pending_campaigns
    FROM public.ad_campaigns
    WHERE campaign_status = 'pending'
      AND admin_approved = FALSE;
    
    RAISE NOTICE '📊 Campaign Summary:';
    RAISE NOTICE '   💰 User campaigns (ACTIVE): %', v_user_campaigns;
    RAISE NOTICE '   🆓 Platform campaigns (ACTIVE): %', v_platform_campaigns;
    RAISE NOTICE '   ⏳ Pending approval: %', v_pending_campaigns;
    RAISE NOTICE '';
    
    IF v_user_campaigns = 0 THEN
        RAISE NOTICE '⚠️ NO USER CAMPAIGNS ACTIVE!';
        RAISE NOTICE '   To see user ads:';
        RAISE NOTICE '   1. Create a campaign at /advertising/register';
        RAISE NOTICE '   2. Admin approves it at /admin/dashboard → Ad Campaigns';
        RAISE NOTICE '   3. User ads will then show instead of platform ads';
    ELSE
        RAISE NOTICE '✅ USER CAMPAIGNS ACTIVE!';
        RAISE NOTICE '   User ads will show on all pages';
        RAISE NOTICE '   Platform ads only as fallback';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   ✅ Fixed get_active_ads_for_page to prioritize user ads';
    RAISE NOTICE '   ✅ Platform ads only show when NO user ads exist';
    RAISE NOTICE '   ✅ Added debug logging (check Supabase logs)';
    RAISE NOTICE '   ✅ Fair rotation (least-seen first)';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

