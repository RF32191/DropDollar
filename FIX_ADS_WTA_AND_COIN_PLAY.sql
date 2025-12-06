-- ============================================================================
-- FIX ADS FOR WINNER TAKES ALL AND ADD COIN PLAY SUPPORT
-- ============================================================================
-- Ensure platform ads show on Winner Takes All and Coin Play pages
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎯 FIXING ADS FOR WTA & COIN PLAY';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: UPDATE EXISTING PLATFORM ADS TO INCLUDE NEW PAGES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Updating platform ads to include winner-takes-all and coin-play...';
END $$;

-- Update all DropDollar platform ads to include the new pages
UPDATE public.ad_campaigns
SET 
    target_pages = ARRAY['dashboard', 'games', 'tournaments', 'hot-sell', 'winner-takes-all', 'coin-play', '1v1', 'categories'],
    updated_at = NOW()
WHERE seller_username = 'DropDollar'
  AND campaign_status = 'active';

DO $$
BEGIN
    RAISE NOTICE '✅ Platform ads updated to include all pages!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: CHECK IF ADS EXIST
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 Checking ad campaigns...';
END $$;

-- Show ad counts by page
SELECT 
    unnest(target_pages) as page_name,
    COUNT(*) as ad_count,
    SUM(CASE WHEN campaign_status = 'active' THEN 1 ELSE 0 END) as active_count
FROM public.ad_campaigns
WHERE admin_approved = TRUE
GROUP BY unnest(target_pages)
ORDER BY page_name;

DO $$
DECLARE
    v_total_ads INTEGER;
    v_wta_ads INTEGER;
    v_cp_ads INTEGER;
BEGIN
    -- Count total ads
    SELECT COUNT(*) INTO v_total_ads
    FROM public.ad_campaigns
    WHERE campaign_status = 'active' AND admin_approved = TRUE;
    
    -- Count WTA ads
    SELECT COUNT(*) INTO v_wta_ads
    FROM public.ad_campaigns
    WHERE campaign_status = 'active' 
      AND admin_approved = TRUE
      AND 'winner-takes-all' = ANY(target_pages);
    
    -- Count Coin Play ads
    SELECT COUNT(*) INTO v_cp_ads
    FROM public.ad_campaigns
    WHERE campaign_status = 'active' 
      AND admin_approved = TRUE
      AND 'coin-play' = ANY(target_pages);
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Ad Status:';
    RAISE NOTICE '   Total active ads: %', v_total_ads;
    RAISE NOTICE '   Winner Takes All ads: %', v_wta_ads;
    RAISE NOTICE '   Coin Play ads: %', v_cp_ads;
    RAISE NOTICE '';
    
    IF v_wta_ads = 0 THEN
        RAISE NOTICE '⚠️ No ads configured for Winner Takes All!';
        RAISE NOTICE '   Creating platform ad...';
    END IF;
    
    IF v_cp_ads = 0 THEN
        RAISE NOTICE '⚠️ No ads configured for Coin Play!';
        RAISE NOTICE '   Creating platform ad...';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE PLATFORM ADS IF NONE EXIST
-- ============================================================================

DO $$
DECLARE
    v_campaign_id UUID;
    v_wta_ads_count INTEGER;
    v_cp_ads_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🆕 Creating missing platform ads...';
    
    -- Check if Winner Takes All has ads
    SELECT COUNT(*) INTO v_wta_ads_count
    FROM public.ad_campaigns
    WHERE 'winner-takes-all' = ANY(target_pages)
      AND campaign_status = 'active'
      AND admin_approved = TRUE;
    
    -- Create WTA platform ad if needed
    IF v_wta_ads_count = 0 THEN
        INSERT INTO public.ad_campaigns (
            seller_id, seller_username, campaign_name, headline, description,
            call_to_action, destination_url, target_pages, token_budget,
            tokens_spent, cost_per_impression, cost_per_click,
            campaign_status, admin_approved, start_date, end_date
        ) VALUES (
            (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com' LIMIT 1),
            'DropDollar',
            '[PLATFORM] Winner Takes All',
            '👑 Winner Takes It All Tournament!',
            'Compete for the entire prize pool! Only the highest scorer wins. Entry fees start at $1. Are you ready to take it all?',
            'Join Now',
            '/winner-takes-all',
            ARRAY['dashboard', 'games', 'tournaments', 'hot-sell', 'winner-takes-all', 'coin-play', '1v1'],
            999999999,
            0,
            0,
            0,
            'active',
            TRUE,
            NOW(),
            NOW() + INTERVAL '10 years'
        )
        RETURNING id INTO v_campaign_id;
        
        RAISE NOTICE '✅ Created Winner Takes All platform ad: %', v_campaign_id;
    END IF;
    
    -- Check if Coin Play has ads
    SELECT COUNT(*) INTO v_cp_ads_count
    FROM public.ad_campaigns
    WHERE 'coin-play' = ANY(target_pages)
      AND campaign_status = 'active'
      AND admin_approved = TRUE;
    
    -- Create Coin Play platform ad if needed
    IF v_cp_ads_count = 0 THEN
        INSERT INTO public.ad_campaigns (
            seller_id, seller_username, campaign_name, headline, description,
            call_to_action, destination_url, target_pages, token_budget,
            tokens_spent, cost_per_impression, cost_per_click,
            campaign_status, admin_approved, start_date, end_date
        ) VALUES (
            (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com' LIMIT 1),
            'DropDollar',
            '[PLATFORM] Coin Play',
            '🪙 Play for a Quarter, Win Up to $1,000!',
            'Affordable 25¢ tournaments with huge prizes! All 9 games available. Quick 2-minute rounds. Winner takes 85% of the pot!',
            'Play Now',
            '/coin-play',
            ARRAY['dashboard', 'games', 'tournaments', 'hot-sell', 'winner-takes-all', 'coin-play', '1v1'],
            999999999,
            0,
            0,
            0,
            'active',
            TRUE,
            NOW(),
            NOW() + INTERVAL '10 years'
        )
        RETURNING id INTO v_campaign_id;
        
        RAISE NOTICE '✅ Created Coin Play platform ad: %', v_campaign_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: TEST THE FIX
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TESTING AD DISPLAY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test queries:';
END $$;

-- Test Winner Takes All ads
SELECT 
    campaign_name,
    headline,
    seller_username,
    campaign_status,
    admin_approved
FROM public.ad_campaigns
WHERE 'winner-takes-all' = ANY(target_pages)
  AND campaign_status = 'active'
  AND admin_approved = TRUE
ORDER BY seller_username;

-- Test Coin Play ads
SELECT 
    campaign_name,
    headline,
    seller_username,
    campaign_status,
    admin_approved
FROM public.ad_campaigns
WHERE 'coin-play' = ANY(target_pages)
  AND campaign_status = 'active'
  AND admin_approved = TRUE
ORDER BY seller_username;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ADS FIXED!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   ✅ Updated all platform ads to include all pages';
    RAISE NOTICE '   ✅ Created Winner Takes All platform ad (if needed)';
    RAISE NOTICE '   ✅ Created Coin Play platform ad (if needed)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test the fix:';
    RAISE NOTICE '   1. Visit /winner-takes-all';
    RAISE NOTICE '   2. Visit /coin-play';
    RAISE NOTICE '   3. You should see platform ads on both pages!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

