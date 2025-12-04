-- TEST_TRACKING_NOW.sql
-- Comprehensive test and fix for tracking issues

-- ========================================
-- STEP 1: Verify functions exist
-- ========================================
SELECT 
    '1️⃣ CHECK FUNCTIONS' as step,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('log_ad_impression', 'log_ad_click')
AND pronamespace = 'public'::regnamespace;

-- If no results above, functions don't exist! Run FIX_TRACKING_AND_CHARGING.sql first!

-- ========================================
-- STEP 2: Check your campaigns
-- ========================================
SELECT 
    '2️⃣ YOUR CAMPAIGNS' as step,
    id,
    campaign_name,
    campaign_status,
    admin_approved,
    COALESCE(total_impressions, 0) as impressions,
    COALESCE(total_clicks, 0) as clicks,
    COALESCE(tokens_spent, 0) as spent,
    token_budget,
    target_pages
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'
ORDER BY created_at DESC;

-- ========================================
-- STEP 3: Manual test - Log a fake impression
-- ========================================
DO $$
DECLARE
    v_campaign_id UUID;
    v_impression_id UUID;
BEGIN
    -- Get first non-platform campaign
    SELECT id INTO v_campaign_id
    FROM public.ad_campaigns
    WHERE seller_username != 'DropDollar'
    AND campaign_status = 'active'
    AND admin_approved = TRUE
    LIMIT 1;
    
    IF v_campaign_id IS NULL THEN
        RAISE NOTICE '❌ No active campaigns found to test';
        RETURN;
    END IF;
    
    RAISE NOTICE '3️⃣ TESTING with campaign: %', v_campaign_id;
    
    -- Call the impression function
    SELECT log_ad_impression(
        v_campaign_id,
        'games',
        'test-session-' || NOW()::TEXT,
        'Mozilla Test Browser',
        'desktop'
    ) INTO v_impression_id;
    
    RAISE NOTICE '✅ Test impression logged! ID: %', v_impression_id;
    
    -- Show updated stats
    RAISE NOTICE '📊 Updated campaign stats:';
    RAISE NOTICE 'Impressions: %', (SELECT total_impressions FROM public.ad_campaigns WHERE id = v_campaign_id);
    RAISE NOTICE 'Tokens Spent: %', (SELECT tokens_spent FROM public.ad_campaigns WHERE id = v_campaign_id);
    
END $$;

-- ========================================
-- STEP 4: Verify the test worked
-- ========================================
SELECT 
    '4️⃣ AFTER TEST' as step,
    campaign_name,
    COALESCE(total_impressions, 0) as impressions,
    COALESCE(total_clicks, 0) as clicks,
    COALESCE(tokens_spent, 0) as spent
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'
ORDER BY created_at DESC;

-- ========================================
-- STEP 5: Check if impressions are being recorded
-- ========================================
SELECT 
    '5️⃣ IMPRESSION LOG' as step,
    COUNT(*) as total_impressions,
    COUNT(*) FILTER (WHERE is_click = FALSE) as views,
    COUNT(*) FILTER (WHERE is_click = TRUE) as clicks,
    SUM(tokens_charged) as total_tokens_charged
FROM public.ad_impressions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ========================================
-- STEP 6: Check RLS policies
-- ========================================
SELECT 
    '6️⃣ RLS POLICIES' as step,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('ad_campaigns', 'ad_impressions')
ORDER BY tablename, policyname;

-- ========================================
-- RESULTS SUMMARY
-- ========================================
SELECT 
    '✅ If you see impressions > 0 above, tracking works!' as message
UNION ALL
SELECT 
    '❌ If impressions = 0, check browser console for errors' as message
UNION ALL
SELECT 
    '💡 Open browser DevTools (F12) and look for log_ad_impression errors' as message;

