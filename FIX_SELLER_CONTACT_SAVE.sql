-- ============================================================================
-- 🔧 FIX SELLER REGISTRATION: Contact Info Not Saving
-- ============================================================================

-- Step 1: Check what columns exist in seller_profiles
SELECT '📋 SELLER_PROFILES COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seller_profiles' 
AND column_name IN ('address_line1', 'address_line2', 'city', 'state', 'postal_code', 'contact_email', 'contact_phone')
ORDER BY column_name;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS seller_agreement_accepted BOOLEAN DEFAULT false;

-- Step 3: Fix the update_seller_registration_step3 function
DROP FUNCTION IF EXISTS public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_seller_registration_step3(
    contact_email_param TEXT,
    contact_phone_param TEXT,
    address_line1_param TEXT,
    address_line2_param TEXT,
    city_param TEXT,
    state_param TEXT,
    postal_code_param TEXT,
    country_param TEXT DEFAULT 'US'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Debug log
    RAISE NOTICE 'Updating step 3 for user: %, email: %, phone: %, address: %, city: %, state: %, postal: %',
        v_user_id, contact_email_param, contact_phone_param, address_line1_param, city_param, state_param, postal_code_param;
    
    -- Update seller profile
    UPDATE seller_profiles
    SET 
        contact_email = contact_email_param,
        contact_phone = contact_phone_param,
        address_line1 = address_line1_param,
        address_line2 = COALESCE(address_line2_param, ''),
        city = city_param,
        state = state_param,
        postal_code = postal_code_param,
        country = COALESCE(country_param, 'US'),
        registration_step = GREATEST(COALESCE(registration_step, 0), 4),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found. Please start registration first.');
    END IF;
    
    RAISE NOTICE 'Updated % rows for contact info', v_rows_updated;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contact information saved successfully',
        'next_step', 5
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in step3: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 4: Also update complete_seller_registration to be more lenient or provide better debug
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
    
    -- Debug: Show what we have
    RAISE NOTICE 'Profile: address=%, city=%, state=%, postal=%', 
        v_profile.address_line1, v_profile.city, v_profile.state, v_profile.postal_code;
    
    -- Check required fields
    IF v_profile.shop_name IS NULL OR TRIM(v_profile.shop_name) = '' THEN
        v_missing := array_append(v_missing, 'Shop Name (Step 1)');
    END IF;
    
    IF v_profile.address_line1 IS NULL OR TRIM(v_profile.address_line1) = '' THEN
        v_missing := array_append(v_missing, 'Address (Step 4)');
    END IF;
    
    IF v_profile.city IS NULL OR TRIM(v_profile.city) = '' THEN
        v_missing := array_append(v_missing, 'City (Step 4)');
    END IF;
    
    IF v_profile.state IS NULL OR TRIM(v_profile.state) = '' THEN
        v_missing := array_append(v_missing, 'State (Step 4)');
    END IF;
    
    IF v_profile.postal_code IS NULL OR TRIM(v_profile.postal_code) = '' THEN
        v_missing := array_append(v_missing, 'Postal Code (Step 4)');
    END IF;
    
    -- If missing fields, return error with details
    IF array_length(v_missing, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Please complete all required fields: ' || array_to_string(v_missing, ', '),
            'missing_fields', v_missing,
            'debug', jsonb_build_object(
                'address', v_profile.address_line1,
                'city', v_profile.city,
                'state', v_profile.state,
                'postal', v_profile.postal_code
            )
        );
    END IF;
    
    -- Check agreements
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please accept all agreements');
    END IF;
    
    -- Complete registration
    UPDATE seller_profiles
    SET 
        status = 'active',
        terms_accepted = terms_accepted_param,
        privacy_accepted = privacy_accepted_param,
        seller_agreement_accepted = seller_agreement_accepted_param,
        registration_step = 7,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Congratulations! Your seller account is now active!',
        'seller_id', v_profile.id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Step 5: Verify columns exist
SELECT '✅ COLUMNS AFTER FIX:' as info;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'seller_profiles' 
AND column_name IN ('address_line1', 'city', 'state', 'postal_code')
ORDER BY column_name;

SELECT '
============================================
✅ SELLER CONTACT SAVE FIXED!
============================================
- Added missing columns if needed
- Fixed update_seller_registration_step3
- Added debug info to complete function
============================================
' as done;

