-- CREATE_PLATFORM_DEFAULT_ADS.sql
-- Creates permanent default ads promoting DropDollar's own features
-- These show when no paid seller campaigns exist

DO $$
DECLARE
    v_platform_user_id UUID;
    v_campaign_id1 UUID;
    v_campaign_id2 UUID;
    v_campaign_id3 UUID;
    v_campaign_id4 UUID;
BEGIN
    -- Use the first admin user as the "platform" account for default ads
    SELECT id INTO v_platform_user_id 
    FROM public.users 
    WHERE email = 'rf32191@gmail.com'
    LIMIT 1;
    
    IF v_platform_user_id IS NULL THEN
        -- If no admin, use first available user
        SELECT id INTO v_platform_user_id FROM public.users LIMIT 1;
    END IF;
    
    IF v_platform_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Creating platform default ads using user ID: %', v_platform_user_id;
    
    -- ========================================
    -- Platform Ad 1: Win Real Cash
    -- ========================================
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
        v_platform_user_id,
        'DropDollar',
        '[PLATFORM] Win Real Cash',
        '💰 Win Real Money Playing Skill-Based Games!',
        'Join tournaments, compete fairly, cash out instantly. No gambling—pure skill. Start with FREE practice games!',
        'Start Playing',
        '/games',
        ARRAY['dashboard', 'tournaments', 'hot-sell', '1v1', 'winner-takes-all'],
        999999999, -- Unlimited budget for platform ads
        0,
        0, -- Free impressions
        0, -- Free clicks
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '10 years' -- Runs forever
    )
    RETURNING id INTO v_campaign_id1;
    
    -- ========================================
    -- Platform Ad 2: Hot Sell Tournaments
    -- ========================================
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
        v_platform_user_id,
        'DropDollar',
        '[PLATFORM] Hot Sell Tournaments',
        '🔥 $50K Prize Pools in Hot Sell Tournaments!',
        'Compete for massive cash prizes in our biggest tournaments. Fair play guaranteed with anti-cheat systems. Join now!',
        'View Tournaments',
        '/hot-sell',
        ARRAY['games', 'dashboard', '1v1', 'winner-takes-all'],
        999999999,
        0,
        0,
        0,
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '10 years'
    )
    RETURNING id INTO v_campaign_id2;
    
    -- ========================================
    -- Platform Ad 3: Marketplace
    -- ========================================
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
        v_platform_user_id,
        'DropDollar',
        '[PLATFORM] Win Real Products',
        '🎁 Win Real Products - iPads, Gaming Gear & More!',
        'Enter skill-based competitions to win actual physical prizes. Fair RNG, verified winners, free shipping on most items!',
        'Browse Items',
        '/listings',
        ARRAY['games', 'dashboard', 'tournaments'],
        999999999,
        0,
        0,
        0,
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '10 years'
    )
    RETURNING id INTO v_campaign_id3;
    
    -- ========================================
    -- Platform Ad 4: Become a Seller
    -- ========================================
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
        v_platform_user_id,
        'DropDollar',
        '[PLATFORM] Become a Seller',
        '🏪 Sell Your Products to Thousands of Active Gamers!',
        'List items, run competitions, reach engaged buyers. Low fees, high visibility. Create your seller account today!',
        'Start Selling',
        '/seller/apply',
        ARRAY['games', 'tournaments', 'hot-sell', '1v1', 'winner-takes-all', 'dashboard'],
        999999999,
        0,
        0,
        0,
        'active',
        TRUE,
        NOW(),
        NOW() + INTERVAL '10 years'
    )
    RETURNING id INTO v_campaign_id4;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Created 4 Platform Default Ads';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Ad 1 (Win Cash): %', v_campaign_id1;
    RAISE NOTICE 'Ad 2 (Hot Sell): %', v_campaign_id2;
    RAISE NOTICE 'Ad 3 (Marketplace): %', v_campaign_id3;
    RAISE NOTICE 'Ad 4 (Become Seller): %', v_campaign_id4;
    RAISE NOTICE '========================================';
    RAISE NOTICE '💡 These ads run forever and cost 0 tokens';
    RAISE NOTICE '💡 Paid seller ads will show alongside these';
    RAISE NOTICE '========================================';
END $$;

-- Verify platform ads were created
SELECT 
    campaign_name,
    headline,
    campaign_status,
    admin_approved,
    token_budget,
    tokens_spent,
    target_pages
FROM public.ad_campaigns
WHERE seller_username = 'DropDollar'
ORDER BY created_at;

SELECT '✅ Platform default ads created - banners will now always show content!' as result;

