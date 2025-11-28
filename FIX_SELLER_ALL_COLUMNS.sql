-- ============================================================================
-- 🔧 COMPLETE SELLER FIX: Add ALL missing columns
-- ============================================================================

-- Step 1: Add EVERY possible missing column
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ;
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
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS notes TEXT;

SELECT '✅ Step 1: All columns added' as status;

-- Step 2: Reset user ryanrfermoselle for fresh registration test
DELETE FROM seller_profiles 
WHERE user_id IN (
    SELECT id FROM users WHERE username = 'ryanrfermoselle' OR email LIKE '%ryanrfermoselle%'
);

SELECT '✅ Step 2: Reset ryanrfermoselle seller profile' as status;

-- Step 3: Fix approve function to use correct column names
DROP FUNCTION IF EXISTS public.approve_seller_application(UUID) CASCADE;

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
        verification_date = NOW(),
        approved_at = NOW(),
        registration_completed = true,
        updated_at = NOW()
    WHERE id = seller_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller approved!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_seller_application(UUID) TO authenticated, service_role;

SELECT '✅ Step 3: Approve function (approve_seller_application) fixed' as status;

-- Step 3B: Create approve_seller function (frontend uses this name)
DROP FUNCTION IF EXISTS public.approve_seller(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_seller(
    seller_profile_id_param UUID,
    notes_param TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE seller_profiles
    SET 
        status = 'active',
        verified = true,
        identity_verified = true,
        verified_at = NOW(),
        verification_date = NOW(),
        approved_at = NOW(),
        registration_completed = true,
        notes = notes_param,
        updated_at = NOW()
    WHERE id = seller_profile_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller approved!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_seller(UUID, TEXT) TO authenticated, service_role;

SELECT '✅ Step 3B: approve_seller function created' as status;

-- Step 3C: Create reject_seller function
DROP FUNCTION IF EXISTS public.reject_seller(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.reject_seller(
    seller_profile_id_param UUID,
    reason_param TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE seller_profiles
    SET 
        status = 'rejected',
        rejection_reason = reason_param,
        updated_at = NOW()
    WHERE id = seller_profile_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_seller(UUID, TEXT) TO authenticated, service_role;

SELECT '✅ Step 3C: reject_seller function created' as status;

-- Step 3D: Create get_pending_sellers function
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
    WHERE sp.status = 'pending' OR sp.registration_step >= 6
    ORDER BY sp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_sellers() TO authenticated, service_role;

SELECT '✅ Step 3D: get_pending_sellers function created' as status;

-- Step 4: Fix complete_seller_registration
DROP FUNCTION IF EXISTS public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.complete_seller_registration(
    terms_accepted_param BOOLEAN,
    privacy_accepted_param BOOLEAN,
    seller_agreement_accepted_param BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
    
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please accept all agreements');
    END IF;
    
    UPDATE seller_profiles
    SET 
        status = 'pending',
        terms_accepted = terms_accepted_param,
        privacy_accepted = privacy_accepted_param,
        seller_agreement_accepted = seller_agreement_accepted_param,
        registration_step = 7,
        verified = false,
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Application submitted for review!',
        'seller_id', v_profile.id,
        'status', 'pending'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

SELECT '✅ Step 4: Registration function fixed' as status;

-- Step 5: Show current columns
SELECT '📋 SELLER_PROFILES COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seller_profiles'
ORDER BY ordinal_position;

-- Step 6: Show existing sellers
SELECT '👥 EXISTING SELLERS:' as info;
SELECT 
    id,
    shop_name,
    status,
    registration_step,
    verified,
    identity_verified,
    submitted_at,
    created_at
FROM seller_profiles
ORDER BY created_at DESC;

SELECT '
============================================
✅ ALL SELLER COLUMNS ADDED!
============================================
Now you can:
1. Register as a seller (ryanrfermoselle reset)
2. View applications in Verification tab
3. Approve/reject sellers without errors
============================================
' as done;

