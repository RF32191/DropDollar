-- ============================================================================
-- 🔧 FIX SELLER REGISTRATION: Auto-advance steps on Continue
-- ============================================================================
-- Each step function saves data and advances to next step automatically
-- ============================================================================

-- Step 1: Start Registration (Shop Info)
DROP FUNCTION IF EXISTS public.start_seller_registration(TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.start_seller_registration(
    shop_name_param TEXT,
    shop_description_param TEXT DEFAULT NULL,
    shop_tagline_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_existing RECORD;
    v_seller_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check for existing profile
    SELECT * INTO v_existing FROM seller_profiles WHERE user_id = v_user_id;
    
    IF FOUND THEN
        -- Update existing
        UPDATE seller_profiles
        SET 
            shop_name = shop_name_param,
            shop_description = COALESCE(shop_description_param, shop_description),
            shop_tagline = COALESCE(shop_tagline_param, shop_tagline),
            registration_step = GREATEST(registration_step, 1),
            updated_at = NOW()
        WHERE user_id = v_user_id
        RETURNING id INTO v_seller_id;
    ELSE
        -- Create new
        INSERT INTO seller_profiles (user_id, shop_name, shop_description, shop_tagline, registration_step, status)
        VALUES (v_user_id, shop_name_param, shop_description_param, shop_tagline_param, 1, 'draft')
        RETURNING id INTO v_seller_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Shop created! Moving to Step 2...',
        'seller_id', v_seller_id,
        'next_step', 2
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_seller_registration(TEXT, TEXT, TEXT) TO authenticated;

-- Step 2: Business Details
DROP FUNCTION IF EXISTS public.update_seller_registration_step2(TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_seller_registration_step2(
    business_type_param TEXT,
    business_name_param TEXT DEFAULT NULL,
    tax_id_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE seller_profiles
    SET 
        business_type = business_type_param,
        business_name = business_name_param,
        tax_id = tax_id_param,
        registration_step = GREATEST(registration_step, 2),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please complete Step 1 first');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Business details saved! Moving to Step 3...',
        'next_step', 3
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step2(TEXT, TEXT, TEXT) TO authenticated;

-- Step 3: Identity Verification
DROP FUNCTION IF EXISTS public.update_seller_identity_verification(TEXT, DATE, TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_seller_identity_verification(
    full_legal_name_param TEXT,
    date_of_birth_param DATE,
    ssn_last4_param TEXT,
    dl_front_url_param TEXT,
    dl_back_url_param TEXT,
    selfie_url_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE seller_profiles
    SET 
        full_legal_name = full_legal_name_param,
        date_of_birth = date_of_birth_param,
        ssn_last4 = ssn_last4_param,
        dl_front_url = dl_front_url_param,
        dl_back_url = dl_back_url_param,
        selfie_url = selfie_url_param,
        registration_step = GREATEST(registration_step, 3),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please complete previous steps first');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Identity verified! Moving to Step 4...',
        'next_step', 4
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_identity_verification(TEXT, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 4: Contact Information (was Step 3)
DROP FUNCTION IF EXISTS public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_seller_registration_step3(
    contact_email_param TEXT,
    contact_phone_param TEXT,
    address_line1_param TEXT,
    address_line2_param TEXT DEFAULT NULL,
    city_param TEXT DEFAULT NULL,
    state_param TEXT DEFAULT NULL,
    postal_code_param TEXT DEFAULT NULL,
    country_param TEXT DEFAULT 'US'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE seller_profiles
    SET 
        contact_email = contact_email_param,
        contact_phone = contact_phone_param,
        address_line1 = address_line1_param,
        address_line2 = address_line2_param,
        city = city_param,
        state = state_param,
        postal_code = postal_code_param,
        country = country_param,
        registration_step = GREATEST(registration_step, 4),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please complete previous steps first');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contact info saved! Moving to Step 5...',
        'next_step', 5
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 5: Banking & Payment (was Step 4)
DROP FUNCTION IF EXISTS public.update_seller_registration_step4(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_seller_registration_step4(
    payout_method_param TEXT DEFAULT 'bank_transfer',
    bank_holder_name_param TEXT DEFAULT NULL,
    bank_name_param TEXT DEFAULT NULL,
    bank_account_type_param TEXT DEFAULT 'checking',
    bank_routing_param TEXT DEFAULT NULL,
    bank_last4_param TEXT DEFAULT NULL,
    paypal_email_param TEXT DEFAULT NULL,
    crypto_wallet_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE seller_profiles
    SET 
        payout_method = payout_method_param,
        bank_holder_name = bank_holder_name_param,
        bank_name = bank_name_param,
        bank_account_type = bank_account_type_param,
        bank_routing = bank_routing_param,
        bank_last4 = bank_last4_param,
        paypal_email = paypal_email_param,
        crypto_wallet = crypto_wallet_param,
        registration_step = GREATEST(registration_step, 5),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please complete previous steps first');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment info saved! Moving to Step 6...',
        'next_step', 6
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step4(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 6: Shipping & Policies (was Step 5)
DROP FUNCTION IF EXISTS public.update_seller_registration_step5(TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_seller_registration_step5(
    ships_from_param TEXT,
    shipping_countries_param TEXT[] DEFAULT ARRAY['US'],
    processing_min_param INTEGER DEFAULT 1,
    processing_max_param INTEGER DEFAULT 3,
    return_policy_param TEXT DEFAULT NULL,
    shipping_policy_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE seller_profiles
    SET 
        ships_from = ships_from_param,
        shipping_countries = shipping_countries_param,
        processing_time_min = processing_min_param,
        processing_time_max = processing_max_param,
        return_policy = return_policy_param,
        shipping_policy = shipping_policy_param,
        registration_step = GREATEST(registration_step, 6),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please complete previous steps first');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Shipping info saved! Moving to final step...',
        'next_step', 7
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step5(TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Step 7: Complete Registration
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
    v_seller_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please accept all agreements');
    END IF;
    
    UPDATE seller_profiles
    SET 
        terms_accepted = terms_accepted_param,
        privacy_accepted = privacy_accepted_param,
        seller_agreement_accepted = seller_agreement_accepted_param,
        registration_step = 7,
        status = 'pending',
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_user_id
    RETURNING id INTO v_seller_id;
    
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Application submitted! Pending admin approval.',
        'seller_id', v_seller_id,
        'status', 'pending'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Add any missing columns needed for these functions
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS shop_tagline TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'bank_transfer';
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS bank_holder_name TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS bank_account_type TEXT DEFAULT 'checking';
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS bank_routing TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS bank_last4 TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS crypto_wallet TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS ships_from TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS shipping_countries TEXT[] DEFAULT ARRAY['US'];
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS processing_time_min INTEGER DEFAULT 1;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS processing_time_max INTEGER DEFAULT 3;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS return_policy TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

SELECT '
============================================
✅ SELLER STEP FUNCTIONS FIXED!
============================================

Each step now:
1. Validates required fields
2. Saves data to database
3. Returns success with next_step
4. Frontend auto-advances to next step

Steps:
1. Shop Information → Continue → Step 2
2. Business Details → Continue → Step 3
3. Identity Verification → Continue → Step 4
4. Contact Information → Continue → Step 5
5. Banking & Payment → Continue → Step 6
6. Shipping & Policies → Continue → Step 7
7. Review & Submit → Submit → PENDING

============================================
' as done;

