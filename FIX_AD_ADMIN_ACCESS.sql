-- ============================================================================
-- FIX AD ADMIN ACCESS - Allow Admin to See ALL Campaigns
-- ============================================================================
-- Problem: Admin cannot see pending or launched ad campaigns
-- Solution: Add admin RLS policy to ad_campaigns table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING AD ADMIN ACCESS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: ADD ADMIN POLICY FOR AD_CAMPAIGNS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Adding admin access policy for ad_campaigns...';
END $$;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Admin can manage all campaigns" ON public.ad_campaigns;

-- Create comprehensive admin policy (ALL operations)
CREATE POLICY "Admin can manage all campaigns" 
ON public.ad_campaigns
FOR ALL
USING (
    (current_setting('request.jwt.claims', true)::json->>'email') = 'rf32191@gmail.com'
    OR 
    (current_setting('request.jwt.claims', true)::json->>'email') = 'ryanrfermoselle@yahoo.com'
)
WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'email') = 'rf32191@gmail.com'
    OR 
    (current_setting('request.jwt.claims', true)::json->>'email') = 'ryanrfermoselle@yahoo.com'
);

DO $$
BEGIN
    RAISE NOTICE '✅ Admin policy created for ad_campaigns!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: VERIFY EXISTING POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📋 Current ad_campaigns policies:';
END $$;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'ad_campaigns'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: ADD ADMIN POLICIES FOR RELATED TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Adding admin policies for related ad tables...';
END $$;

-- Admin can view all ad images
DROP POLICY IF EXISTS "Admin can view all ad images" ON public.ad_images;
CREATE POLICY "Admin can view all ad images"
ON public.ad_images
FOR SELECT
USING (
    (current_setting('request.jwt.claims', true)::json->>'email') = 'rf32191@gmail.com'
    OR 
    (current_setting('request.jwt.claims', true)::json->>'email') = 'ryanrfermoselle@yahoo.com'
);

-- Admin can view all ad impressions
DROP POLICY IF EXISTS "Admin can view all ad impressions" ON public.ad_impressions;
CREATE POLICY "Admin can view all ad impressions"
ON public.ad_impressions
FOR SELECT
USING (
    (current_setting('request.jwt.claims', true)::json->>'email') = 'rf32191@gmail.com'
    OR 
    (current_setting('request.jwt.claims', true)::json->>'email') = 'ryanrfermoselle@yahoo.com'
);

-- Admin can view all ad transactions
DROP POLICY IF EXISTS "Admin can view all ad transactions" ON public.ad_campaign_transactions;
CREATE POLICY "Admin can view all ad transactions"
ON public.ad_campaign_transactions
FOR SELECT
USING (
    (current_setting('request.jwt.claims', true)::json->>'email') = 'rf32191@gmail.com'
    OR 
    (current_setting('request.jwt.claims', true)::json->>'email') = 'ryanrfermoselle@yahoo.com'
);

DO $$
BEGIN
    RAISE NOTICE '✅ Admin policies created for all ad tables!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: TEST QUERY (Admin should see ALL campaigns)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test the fix:';
    RAISE NOTICE '   1. Log in as admin (rf32191@gmail.com)';
    RAISE NOTICE '   2. Go to Admin Dashboard -> Ad Campaigns tab';
    RAISE NOTICE '   3. You should now see ALL campaigns (pending, active, paused)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Check campaign counts:';
END $$;

-- Show campaign counts by status
SELECT 
    campaign_status,
    admin_approved,
    COUNT(*) as count
FROM public.ad_campaigns
GROUP BY campaign_status, admin_approved
ORDER BY campaign_status, admin_approved;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ADMIN ACCESS FIXED!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Admin emails with full access:';
    RAISE NOTICE '   - rf32191@gmail.com';
    RAISE NOTICE '   - ryanrfermoselle@yahoo.com';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

