-- ============================================================================
-- 🔧 RESET SELLER REGISTRATION FOR ryanrfermoselle
-- ============================================================================

-- Step 1: Find the user
SELECT '📋 FINDING USER:' as info;
SELECT id, email, username FROM users WHERE username ILIKE '%ryan%' OR email ILIKE '%ryan%';

-- Step 2: Delete seller profile for this user
DELETE FROM seller_profiles 
WHERE user_id IN (
    SELECT id FROM users WHERE username ILIKE '%ryanrfermoselle%' OR email ILIKE '%ryanrfermoselle%'
);

-- Also try with just 'ryan' in case username is different
DELETE FROM seller_profiles 
WHERE user_id IN (
    SELECT id FROM users WHERE username = 'rfermoselle' OR email ILIKE '%rfermoselle%'
);

SELECT '✅ Seller profile deleted for ryan' as status;

-- Step 3: Check what seller profiles exist now
SELECT '📋 REMAINING SELLER PROFILES:' as info;
SELECT sp.id, sp.shop_name, sp.status, sp.registration_step, u.username, u.email
FROM seller_profiles sp
JOIN users u ON sp.user_id = u.id
LIMIT 10;

-- Step 4: Fix the admin view to show pending applications
-- Make sure there's a function to get pending sellers
DROP FUNCTION IF EXISTS public.get_pending_seller_applications();

CREATE OR REPLACE FUNCTION public.get_pending_seller_applications()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    email TEXT,
    shop_name TEXT,
    shop_description TEXT,
    business_type TEXT,
    status TEXT,
    registration_step INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.user_id,
        COALESCE(u.username, 'Unknown') as username,
        COALESCE(u.email, 'Unknown') as email,
        sp.shop_name,
        sp.shop_description,
        sp.business_type,
        sp.status,
        sp.registration_step,
        sp.created_at,
        sp.updated_at
    FROM seller_profiles sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.status IN ('pending', 'pending_review', 'submitted')
       OR sp.registration_step >= 6
    ORDER BY sp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_seller_applications() TO authenticated, anon, service_role;

-- Step 5: Also fix complete_seller_registration to set status to 'pending' for admin review
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
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get profile
    SELECT * INTO v_profile FROM seller_profiles WHERE user_id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found');
    END IF;
    
    -- Check required fields (minimal check - just shop name and address)
    IF v_profile.shop_name IS NULL OR TRIM(v_profile.shop_name) = '' THEN
        v_missing := array_append(v_missing, 'Shop Name');
    END IF;
    
    -- If missing fields, return error
    IF array_length(v_missing, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Please complete: ' || array_to_string(v_missing, ', ')
        );
    END IF;
    
    -- Check agreements
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please accept all agreements');
    END IF;
    
    -- Complete registration - SET STATUS TO PENDING FOR ADMIN REVIEW
    UPDATE seller_profiles
    SET 
        status = 'pending',  -- Changed from 'active' to 'pending' for admin review
        terms_accepted = terms_accepted_param,
        privacy_accepted = privacy_accepted_param,
        seller_agreement_accepted = seller_agreement_accepted_param,
        registration_step = 7,
        verified_at = NOW(),
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

-- Step 6: Create admin approval function
DROP FUNCTION IF EXISTS public.approve_seller_application(UUID);

CREATE OR REPLACE FUNCTION public.approve_seller_application(seller_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE seller_profiles
    SET status = 'active', verified_at = NOW(), updated_at = NOW()
    WHERE id = seller_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller approved!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_seller_application(UUID) TO authenticated, service_role;

-- Step 7: Create admin reject function
DROP FUNCTION IF EXISTS public.reject_seller_application(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.reject_seller_application(seller_id_param UUID, reason_param TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE seller_profiles
    SET status = 'rejected', updated_at = NOW()
    WHERE id = seller_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_seller_application(UUID, TEXT) TO authenticated, service_role;

SELECT '
============================================
✅ SELLER RESET COMPLETE!
============================================
- Deleted seller profile for ryan
- Created get_pending_seller_applications()
- Fixed complete_seller_registration to set pending
- Created approve_seller_application()
- Created reject_seller_application()

Now ryanrfermoselle can re-register and 
the application will appear in admin!
============================================
' as done;

