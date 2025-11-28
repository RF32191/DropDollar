-- ============================================================================
-- 🔧 COMPLETE SELLER FIX: Approval, Dashboard, Verification Display
-- ============================================================================

-- Step 1: Clear ALL pending/incomplete seller applications
DELETE FROM seller_profiles 
WHERE status IN ('pending', 'incomplete', 'draft')
   OR registration_step < 7
   OR verified = false;

SELECT '✅ Step 1: Cleared all incomplete/pending sellers' as status;

-- Step 2: Fix approve_seller to properly activate seller dashboard
DROP FUNCTION IF EXISTS public.approve_seller(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_seller(
    seller_profile_id_param UUID,
    notes_param TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_shop_name TEXT;
BEGIN
    -- Get the user_id for this seller
    SELECT user_id, shop_name INTO v_user_id, v_shop_name
    FROM seller_profiles 
    WHERE id = seller_profile_id_param;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    -- Approve the seller profile - SET ALL FLAGS FOR ACTIVE SELLER
    UPDATE seller_profiles
    SET 
        status = 'active',
        verified = true,
        identity_verified = true,
        verified_at = NOW(),
        verification_date = NOW(),
        approved_at = NOW(),
        approved_by = (SELECT email FROM auth.users WHERE id = auth.uid()),
        registration_completed = true,
        registration_step = 7,
        notes = notes_param,
        updated_at = NOW()
    WHERE id = seller_profile_id_param;
    
    RAISE NOTICE '✅ Seller approved: % (user_id: %)', v_shop_name, v_user_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Seller approved! Dashboard now active.',
        'seller_id', seller_profile_id_param,
        'user_id', v_user_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_seller(UUID, TEXT) TO authenticated, service_role;

SELECT '✅ Step 2: approve_seller function fixed' as status;

-- Step 3: Fix get_pending_sellers to ONLY show truly pending (not approved)
DROP FUNCTION IF EXISTS public.get_pending_sellers() CASCADE;

CREATE OR REPLACE FUNCTION public.get_pending_sellers()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    email TEXT,
    shop_name TEXT,
    shop_description TEXT,
    business_name TEXT,
    business_type TEXT,
    full_legal_name TEXT,
    date_of_birth DATE,
    ssn_last4 TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    dl_front_url TEXT,
    dl_back_url TEXT,
    selfie_url TEXT,
    status TEXT,
    registration_step INTEGER,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.user_id,
        COALESCE(u.username, 'Unknown')::TEXT as username,
        COALESCE(u.email, 'Unknown')::TEXT as email,
        sp.shop_name,
        sp.shop_description,
        sp.business_name,
        sp.business_type,
        sp.full_legal_name,
        sp.date_of_birth,
        sp.ssn_last4,
        sp.contact_email,
        sp.contact_phone,
        sp.address_line1,
        sp.city,
        sp.state,
        sp.postal_code,
        sp.dl_front_url,
        sp.dl_back_url,
        sp.selfie_url,
        sp.status,
        sp.registration_step,
        COALESCE(sp.submitted_at, sp.created_at) as submitted_at,
        sp.created_at
    FROM seller_profiles sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.status = 'pending'
      AND sp.registration_step >= 6
      AND (sp.verified = false OR sp.verified IS NULL)
    ORDER BY sp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_sellers() TO authenticated, service_role;

SELECT '✅ Step 3: get_pending_sellers now filters correctly' as status;

-- Step 4: Create function to check if user has active seller dashboard
DROP FUNCTION IF EXISTS public.check_seller_status(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.check_seller_status(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_seller RECORD;
BEGIN
    SELECT * INTO v_seller
    FROM seller_profiles
    WHERE user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'is_seller', false,
            'status', 'not_registered',
            'has_dashboard', false
        );
    END IF;
    
    RETURN jsonb_build_object(
        'is_seller', v_seller.status = 'active' AND v_seller.verified = true,
        'status', v_seller.status,
        'has_dashboard', v_seller.status = 'active' AND v_seller.verified = true,
        'seller_id', v_seller.id,
        'shop_name', v_seller.shop_name,
        'registration_step', v_seller.registration_step,
        'verified', v_seller.verified
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_seller_status(UUID) TO authenticated, anon;

SELECT '✅ Step 4: check_seller_status function created' as status;

-- Step 5: Create get_seller_verifications with MASKED sensitive data
DROP FUNCTION IF EXISTS public.get_seller_verifications_masked() CASCADE;

CREATE OR REPLACE FUNCTION public.get_seller_verifications_masked()
RETURNS TABLE (
    seller_id UUID,
    user_id UUID,
    username TEXT,
    email TEXT,
    shop_name TEXT,
    shop_description TEXT,
    business_name TEXT,
    business_type TEXT,
    full_legal_name TEXT,
    date_of_birth_display TEXT,
    ssn_display TEXT,
    contact_email TEXT,
    contact_phone_display TEXT,
    address_display TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    dl_front_url TEXT,
    dl_back_url TEXT,
    selfie_url TEXT,
    status TEXT,
    registration_step INTEGER,
    identity_verified BOOLEAN,
    verified BOOLEAN,
    risk_score INTEGER,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id as seller_id,
        sp.user_id,
        COALESCE(u.username, 'Unknown')::TEXT as username,
        COALESCE(u.email, 'Unknown')::TEXT as email,
        sp.shop_name,
        sp.shop_description,
        sp.business_name,
        sp.business_type,
        sp.full_legal_name,
        -- Mask DOB: show only year
        CASE 
            WHEN sp.date_of_birth IS NOT NULL 
            THEN '**/**/****' || EXTRACT(YEAR FROM sp.date_of_birth)::TEXT
            ELSE 'Not provided'
        END as date_of_birth_display,
        -- Mask SSN: show only last 4
        CASE 
            WHEN sp.ssn_last4 IS NOT NULL 
            THEN '***-**-' || sp.ssn_last4
            ELSE 'Not provided'
        END as ssn_display,
        sp.contact_email,
        -- Mask phone: show last 4 digits
        CASE 
            WHEN sp.contact_phone IS NOT NULL AND LENGTH(sp.contact_phone) >= 4
            THEN '(***) ***-' || RIGHT(sp.contact_phone, 4)
            ELSE 'Not provided'
        END as contact_phone_display,
        -- Mask address: show only city/state
        CASE 
            WHEN sp.address_line1 IS NOT NULL 
            THEN '*** ' || COALESCE(sp.city, '') || ', ' || COALESCE(sp.state, '')
            ELSE 'Not provided'
        END as address_display,
        sp.city,
        sp.state,
        sp.postal_code,
        -- DL URLs are shown for verification (images viewable)
        sp.dl_front_url,
        sp.dl_back_url,
        sp.selfie_url,
        sp.status,
        sp.registration_step,
        COALESCE(sp.identity_verified, false) as identity_verified,
        COALESCE(sp.verified, false) as verified,
        COALESCE(sp.risk_score, 0) as risk_score,
        sp.submitted_at,
        sp.created_at
    FROM seller_profiles sp
    LEFT JOIN users u ON sp.user_id = u.id
    ORDER BY sp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_verifications_masked() TO authenticated, service_role;

SELECT '✅ Step 5: get_seller_verifications_masked with hidden sensitive data' as status;

-- Step 6: Show remaining sellers
SELECT '📋 REMAINING SELLERS:' as info;
SELECT 
    id,
    shop_name,
    status,
    registration_step,
    verified,
    identity_verified
FROM seller_profiles
ORDER BY created_at DESC;

SELECT '
============================================
✅ SELLER SYSTEM FIXED!
============================================

What this fixed:
1. ❌ Cleared all pending/incomplete applications
2. ✅ approve_seller now fully activates seller dashboard
3. ✅ get_pending_sellers only shows TRULY pending
4. ✅ check_seller_status for dashboard access
5. ✅ Verification shows MASKED sensitive data:
   - SSN: ***-**-1234
   - DOB: **/****1990
   - Phone: (***) ***-1234
   - Address: *** City, State
   - DL Images: VISIBLE for verification

============================================
' as done;

