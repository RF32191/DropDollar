-- DIAGNOSE_MISSING_CAMPAIGN.sql
-- Check why your ad campaign isn't showing in banners or admin tab

-- ========================================
-- 1. CHECK: Does the campaign exist?
-- ========================================
SELECT 
    '1️⃣ CAMPAIGN EXISTS?' as check_name,
    COUNT(*) as campaign_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ No campaigns found - creation may have failed'
        ELSE '✅ Campaign(s) exist'
    END as status
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'; -- Exclude platform ads

-- ========================================
-- 2. CHECK: Campaign Details
-- ========================================
SELECT 
    '2️⃣ CAMPAIGN DETAILS' as section,
    id as campaign_id,
    seller_username,
    campaign_name,
    campaign_status,
    admin_approved,
    token_budget,
    tokens_spent,
    target_pages,
    created_at
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 3. CHECK: Why not showing in banners?
-- ========================================
SELECT 
    '3️⃣ BANNER VISIBILITY CHECK' as section,
    id,
    campaign_name,
    CASE 
        WHEN campaign_status != 'active' THEN '❌ Status is "' || campaign_status || '" - needs to be "active"'
        WHEN NOT admin_approved THEN '❌ Not approved by admin - needs approval'
        WHEN tokens_spent >= token_budget THEN '❌ Budget depleted (' || tokens_spent || '/' || token_budget || ')'
        WHEN start_date > NOW() THEN '❌ Start date is in the future'
        WHEN end_date < NOW() THEN '❌ End date has passed'
        ELSE '✅ Should be visible in banners!'
    END as visibility_status,
    campaign_status,
    admin_approved,
    tokens_spent || '/' || token_budget as budget_usage,
    target_pages
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'
ORDER BY created_at DESC;

-- ========================================
-- 4. CHECK: Admin tab data
-- ========================================
SELECT 
    '4️⃣ ADMIN TAB DATA' as section,
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE campaign_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE campaign_status = 'active') as active,
    COUNT(*) FILTER (WHERE admin_approved = TRUE) as approved
FROM public.ad_campaigns;

-- ========================================
-- 5. QUICK FIX: Auto-approve pending campaigns
-- ========================================
DO $$
DECLARE
    v_pending_count INTEGER;
BEGIN
    -- Count pending campaigns
    SELECT COUNT(*) INTO v_pending_count
    FROM public.ad_campaigns
    WHERE campaign_status = 'pending'
    AND NOT admin_approved
    AND seller_username != 'DropDollar';
    
    IF v_pending_count > 0 THEN
        -- Auto-approve all pending non-platform campaigns
        UPDATE public.ad_campaigns
        SET campaign_status = 'active',
            admin_approved = TRUE,
            updated_at = NOW()
        WHERE campaign_status = 'pending'
        AND NOT admin_approved
        AND seller_username != 'DropDollar';
        
        RAISE NOTICE '✅ AUTO-APPROVED % pending campaign(s)!', v_pending_count;
        RAISE NOTICE '📺 Your ads should now appear in banners and admin tab!';
    ELSE
        RAISE NOTICE '✅ No pending campaigns to approve';
    END IF;
END $$;

-- ========================================
-- 6. FINAL STATUS
-- ========================================
SELECT 
    '6️⃣ FINAL STATUS - YOUR ADS' as section,
    id,
    campaign_name,
    campaign_status,
    admin_approved,
    CASE 
        WHEN campaign_status = 'active' AND admin_approved THEN '✅ LIVE - Showing in banners!'
        WHEN campaign_status = 'pending' THEN '⏳ PENDING - Needs admin approval'
        WHEN campaign_status = 'paused' THEN '⏸️ PAUSED - Resume to show'
        ELSE '❌ NOT SHOWING'
    END as display_status,
    COALESCE(total_impressions, 0) as impressions,
    COALESCE(total_clicks, 0) as clicks,
    COALESCE(tokens_spent, 0) as spent,
    COALESCE(token_budget, 0) as budget,
    COALESCE(token_budget, 0) - COALESCE(tokens_spent, 0) as tokens_remaining
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar'
ORDER BY created_at DESC;

SELECT '🎉 Run this script to diagnose and auto-fix your campaign!' as message;

