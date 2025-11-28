-- ============================================================================
-- 🔧 FIX STEPS 4, 5, 6 - They weren't auto-advancing
-- ============================================================================

-- First: Reset Ryan's seller profile (both emails)
DELETE FROM seller_profiles 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com', 'ryanrfermoselle@yahoo.com')
       OR username = 'ryanrfermoselle'
);

SELECT '✅ Reset: All Ryan seller profiles deleted' as status;

-- Fix Step 4: Contact Information - Return success properly
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
    v_updated INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Validate required fields
    IF contact_email_param IS NULL OR contact_email_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Contact email is required');
    END IF;
    IF contact_phone_param IS NULL OR contact_phone_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Phone number is required');
    END IF;
    IF address_line1_param IS NULL OR address_line1_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Address is required');
    END IF;
    IF city_param IS NULL OR city_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'City is required');
    END IF;
    IF state_param IS NULL OR state_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'State is required');
    END IF;
    IF postal_code_param IS NULL OR postal_code_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Postal code is required');
    END IF;
    
    UPDATE seller_profiles
    SET 
        contact_email = contact_email_param,
        contact_phone = contact_phone_param,
        address_line1 = address_line1_param,
        address_line2 = COALESCE(address_line2_param, address_line2),
        city = city_param,
        state = state_param,
        postal_code = postal_code_param,
        country = COALESCE(country_param, 'US'),
        registration_step = GREATEST(COALESCE(registration_step, 0), 4),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found. Please start from Step 1.');
    END IF;
    
    RAISE NOTICE '✅ Step 4 saved for user %', v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contact info saved! Moving to Step 5...'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT '✅ Step 4 (Contact Info) function fixed' as status;

-- Fix Step 5: Banking & Payment
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
    v_updated INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE seller_profiles
    SET 
        payout_method = COALESCE(payout_method_param, 'bank_transfer'),
        bank_holder_name = bank_holder_name_param,
        bank_name = bank_name_param,
        bank_account_type = COALESCE(bank_account_type_param, 'checking'),
        bank_routing = bank_routing_param,
        bank_last4 = bank_last4_param,
        paypal_email = paypal_email_param,
        crypto_wallet = crypto_wallet_param,
        registration_step = GREATEST(COALESCE(registration_step, 0), 5),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found. Please start from Step 1.');
    END IF;
    
    RAISE NOTICE '✅ Step 5 saved for user %', v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment info saved! Moving to Step 6...'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step4(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT '✅ Step 5 (Banking) function fixed' as status;

-- Fix Step 6: Shipping & Policies
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
    v_updated INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Validate required field
    IF ships_from_param IS NULL OR ships_from_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Shipping location is required');
    END IF;
    
    UPDATE seller_profiles
    SET 
        ships_from = ships_from_param,
        shipping_countries = COALESCE(shipping_countries_param, ARRAY['US']),
        processing_time_min = COALESCE(processing_min_param, 1),
        processing_time_max = COALESCE(processing_max_param, 3),
        return_policy = return_policy_param,
        shipping_policy = shipping_policy_param,
        registration_step = GREATEST(COALESCE(registration_step, 0), 6),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No seller profile found. Please start from Step 1.');
    END IF;
    
    RAISE NOTICE '✅ Step 6 saved for user %', v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Shipping info saved! Moving to final step...'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step5(TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

SELECT '✅ Step 6 (Shipping) function fixed' as status;

-- Make sure all columns exist
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

-- Verify no pending sellers
SELECT 'Current seller profiles:' as info;
SELECT id, shop_name, status, registration_step FROM seller_profiles;

SELECT '
============================================
✅ STEPS 4, 5, 6 FIXED + RYAN RESET!
============================================

All step functions now:
1. Validate required fields
2. Save data properly
3. Return {success: true} on success
4. Frontend will auto-advance

Ryan profiles deleted - ready for fresh registration!
============================================
' as done;

