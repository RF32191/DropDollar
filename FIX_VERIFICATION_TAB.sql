-- ============================================================================
-- FIX VERIFICATION TAB + SELLER DASHBOARD ACCESS
-- ============================================================================

-- Step 1: Reset Ryan
DELETE FROM seller_notifications WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
);
DELETE FROM seller_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
);

SELECT 'Step 1: Ryan reset' as status;

-- Step 2: Fix check_seller_status to return correct data
DROP FUNCTION IF EXISTS public.check_seller_status();

CREATE OR REPLACE FUNCTION public.check_seller_status()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'is_seller', false,
            'status', 'not_authenticated'
        );
    END IF;
    
    SELECT * INTO v_seller FROM seller_profiles WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'is_seller', false,
            'status', 'not_registered',
            'can_access_dashboard', false
        );
    END IF;
    
    -- Return status as-is (active, pending, etc)
    RETURN jsonb_build_object(
        'is_seller', v_seller.status = 'active' AND COALESCE(v_seller.verified, false) = true,
        'status', v_seller.status,
        'can_access_dashboard', v_seller.status = 'active',
        'seller_id', v_seller.id,
        'shop_name', v_seller.shop_name,
        'business_name', v_seller.business_name,
        'contact_email', v_seller.contact_email,
        'contact_phone', v_seller.contact_phone,
        'pending_balance', COALESCE(v_seller.pending_balance, 0),
        'released_balance', COALESCE(v_seller.released_balance, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_seller_status() TO authenticated;

SELECT 'Step 2: check_seller_status fixed' as status;

-- Step 3: Test query for verification tab
SELECT 'Step 3: Testing verification query...' as info;
SELECT 
    id,
    shop_name,
    status,
    registration_step,
    full_legal_name,
    ssn_last4,
    dl_front_url
FROM seller_profiles
WHERE registration_step >= 1;

-- Step 4: Show all sellers in database
SELECT 'All sellers in database:' as info;
SELECT COUNT(*) as total_sellers FROM seller_profiles;

SELECT '
============================================
VERIFICATION TAB + DASHBOARD ACCESS FIXED!
============================================

Frontend now accepts status = active
check_seller_status returns correct data

After this:
1. Register as seller again
2. Data will show in Verification tab
3. After approval, Seller Dashboard appears

============================================
' as done;

