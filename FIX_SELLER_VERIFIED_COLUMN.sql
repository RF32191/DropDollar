-- ============================================================================
-- 🔧 FIX SELLER: Add verified column + fix verification tab data
-- ============================================================================

-- Step 1: Add all potentially missing columns
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS seller_agreement_accepted BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS full_legal_name TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS ssn_last4 TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS dl_front_url TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS dl_back_url TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Step 2: Fix complete_seller_registration to set submitted_at
DROP FUNCTION IF EXISTS public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.complete_seller_registration(
    terms_accepted_param BOOLEAN,
    privacy_accepted_param BOOLEAN,
    seller_agreement_accepted_param BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT * INTO v_profile FROM seller_profiles WHERE user_id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found');
    END IF;
    
    -- Check agreements
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please accept all agreements');
    END IF;
    
    -- Complete registration - SET STATUS TO PENDING FOR ADMIN REVIEW
    UPDATE seller_profiles
    SET 
        status = 'pending',
        terms_accepted = terms_accepted_param,
        privacy_accepted = privacy_accepted_param,
        seller_agreement_accepted = seller_agreement_accepted_param,
        registration_step = 7,
        verified = false,
        verified_at = NULL,
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Application submitted! Pending admin approval.',
        'seller_id', v_profile.id,
        'status', 'pending'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Step 3: Create function to get ALL seller data for verification tab
DROP FUNCTION IF EXISTS public.get_seller_verifications();

CREATE OR REPLACE FUNCTION public.get_seller_verifications()
RETURNS TABLE (
    seller_id UUID,
    user_id UUID,
    username TEXT,
    email TEXT,
    shop_name TEXT,
    shop_description TEXT,
    business_type TEXT,
    business_name TEXT,
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
        sp.business_type,
        sp.business_name,
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

GRANT EXECUTE ON FUNCTION public.get_seller_verifications() TO authenticated, service_role;

-- Step 4: Update approve function
DROP FUNCTION IF EXISTS public.approve_seller_application(UUID);

CREATE OR REPLACE FUNCTION public.approve_seller_application(seller_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE seller_profiles
    SET 
        status = 'active',
        verified = true,
        identity_verified = true,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE id = seller_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller approved and verified!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_seller_application(UUID) TO authenticated, service_role;

-- Step 5: Verify columns exist
SELECT '✅ SELLER_PROFILES COLUMNS:' as info;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'seller_profiles'
ORDER BY column_name;

-- Step 6: Check existing sellers
SELECT '📋 EXISTING SELLERS:' as info;
SELECT id, shop_name, status, registration_step, verified, submitted_at
FROM seller_profiles;

SELECT '
============================================
✅ SELLER VERIFICATION FIX COMPLETE!
============================================
- Added verified column
- Added all missing columns
- Fixed complete_seller_registration
- Created get_seller_verifications()
- Updated approve function

All seller data will now show in verification tab!
============================================
' as done;

