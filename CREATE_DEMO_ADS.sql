-- CREATE_DEMO_ADS.sql
-- Creates demo seller ad campaigns for testing the ad banner system

DO $$
DECLARE
    v_user_id UUID;
    v_campaign_id1 UUID;
    v_campaign_id2 UUID;
    v_campaign_id3 UUID;
BEGIN
    -- Get the current user (or use first available user)
    SELECT id INTO v_user_id FROM public.users LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Creating demo ads for user: %', v_user_id;
    
    -- Create Campaign 1: Gaming Gear
    INSERT INTO public.ad_campaigns (
        seller_id,
        seller_username,
        campaign_name,
        headline,
        description,
        call_to_action,
        destination_url,
        target_pages,
        token_budget,
        tokens_spent,
        cost_per_impression,
        cost_per_click,
        campaign_status,
        admin_approved,
        start_date,
        end_date
    ) VALUES (
        v_user_id,
        'Demo Seller 1',
        'Pro Gaming Gear Sale',
        '🎮 50% OFF Gaming Headsets & Controllers!',
        'Limited time offer on premium gaming equipment. Free shipping on orders over $50. Level up your game today!',
        'Shop Now',
        'https://drop-dollar.com/marketplace',
        ARRAY['games', 'dashboard', 'tournaments'],
        1000,
        0,
        1,
        5,
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_campaign_id1;
    
    -- Create Campaign 2: Gift Cards
    INSERT INTO public.ad_campaigns (
        seller_id,
        seller_username,
        campaign_name,
        headline,
        description,
        call_to_action,
        destination_url,
        target_pages,
        token_budget,
        tokens_spent,
        cost_per_impression,
        cost_per_click,
        campaign_status,
        admin_approved,
        start_date,
        end_date
    ) VALUES (
        v_user_id,
        'Demo Seller 2',
        'Amazon Gift Cards',
        '💰 Win $100 Amazon Gift Cards in Competitions!',
        'Enter our skill-based competitions for a chance to win big. Real prizes, fair play, instant payouts.',
        'Enter Now',
        'https://drop-dollar.com/tournaments',
        ARRAY['games', 'tournaments', '1v1', 'hot-sell'],
        500,
        0,
        1,
        5,
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_campaign_id2;
    
    -- Create Campaign 3: Electronics
    INSERT INTO public.ad_campaigns (
        seller_id,
        seller_username,
        campaign_name,
        headline,
        description,
        call_to_action,
        destination_url,
        target_pages,
        token_budget,
        tokens_spent,
        cost_per_impression,
        cost_per_click,
        campaign_status,
        admin_approved,
        start_date,
        end_date
    ) VALUES (
        v_user_id,
        'Demo Seller 3',
        'Latest Tech Deals',
        '📱 iPhone 15 Pro & MacBook Air - Unbeatable Prices!',
        'Shop the latest Apple products at amazing prices. Verified sellers, secure checkout, fast shipping.',
        'Browse Products',
        'https://drop-dollar.com/winner-takes-all',
        ARRAY['dashboard', 'games', 'winner-takes-all'],
        750,
        0,
        1,
        5,
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_campaign_id3;
    
    RAISE NOTICE '✅ Created 3 demo ad campaigns';
    RAISE NOTICE '   Campaign 1 ID: %', v_campaign_id1;
    RAISE NOTICE '   Campaign 2 ID: %', v_campaign_id2;
    RAISE NOTICE '   Campaign 3 ID: %', v_campaign_id3;
    
END $$;

-- Verify the ads were created
SELECT 
    campaign_name,
    headline,
    campaign_status,
    admin_approved,
    token_budget,
    tokens_spent,
    target_pages
FROM public.ad_campaigns
WHERE admin_approved = TRUE AND campaign_status = 'active'
ORDER BY created_at DESC;

-- Test the get_active_ads_for_page function
SELECT 
    '=== Ads for GAMES page ===' as test,
    * 
FROM get_active_ads_for_page('games');

SELECT 
    '=== Ads for DASHBOARD page ===' as test,
    * 
FROM get_active_ads_for_page('dashboard');

SELECT 
    '=== Ads for TOURNAMENTS page ===' as test,
    * 
FROM get_active_ads_for_page('tournaments');

