-- ============================================================================
-- DEBUG: CHECK USER AD CAMPAIGNS
-- ============================================================================
-- This script helps debug why user ads aren't showing on Winner Takes All
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DEBUGGING USER AD CAMPAIGNS';
    RAISE NOTICE '========================================';
END $$;

-- Check all ad campaigns
SELECT 
    id,
    campaign_name,
    seller_username,
    campaign_status,
    admin_approved,
    token_budget,
    tokens_spent,
    (token_budget - tokens_spent) as tokens_remaining,
    target_pages,
    CASE 
        WHEN seller_username = 'DropDollar' THEN '🟦 PLATFORM AD'
        WHEN token_budget >= 999999999 THEN '🟦 PLATFORM AD (Unlimited)'
        ELSE '💰 USER AD (PAID)'
    END as ad_type,
    CASE 
        WHEN campaign_status != 'active' THEN '❌ Not Active'
        WHEN admin_approved != TRUE THEN '❌ Not Approved'
        WHEN tokens_spent >= token_budget THEN '❌ Budget Exhausted'
        WHEN 'winner-takes-all' = ANY(target_pages) THEN '✅ Targeting WTA'
        ELSE '⚠️ Not Targeting WTA'
    END as status_check
FROM public.ad_campaigns
ORDER BY 
    CASE WHEN seller_username != 'DropDollar' THEN 0 ELSE 1 END,
    created_at DESC;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Testing get_active_ads_for_page for Winner Takes All...';
END $$;

-- Test the function for winner-takes-all
SELECT * FROM get_active_ads_for_page('winner-takes-all');

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🪙 Testing get_active_ads_for_page for Coin Play...';
END $$;

-- Test the function for coin-play
SELECT * FROM get_active_ads_for_page('coin-play');

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Debug complete! Check results above.';
    RAISE NOTICE '';
    RAISE NOTICE '💡 If user ads not showing, check:';
    RAISE NOTICE '   1. campaign_status = ''active''';
    RAISE NOTICE '   2. admin_approved = TRUE';
    RAISE NOTICE '   3. tokens_spent < token_budget';
    RAISE NOTICE '   4. ''winner-takes-all'' in target_pages array';
    RAISE NOTICE '';
END $$;

