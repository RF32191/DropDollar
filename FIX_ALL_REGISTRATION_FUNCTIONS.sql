-- ============================================================================
-- FIX: All Seller Registration Step Functions
-- ============================================================================
-- This fixes ALL registration functions to use seller_user_id instead of user_id
-- Run this to ensure the entire registration flow works correctly.
-- ============================================================================

-- Drop existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.update_seller_registration_step2(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_seller_registration_step4(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_seller_registration_step5(TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN);

-- ============================================================================
-- FUNCTION: update_seller_registration_step2 (Business Details)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step2(
    business_type_param TEXT,
    business_name_param TEXT DEFAULT NULL,
    tax_id_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        business_type = business_type_param,
        business_name = business_name_param,
        tax_id = tax_id_param,
        registration_step = GREATEST(registration_step, 2),
        updated_at = NOW()
    WHERE seller_user_id = v_user_id; -- FIXED
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'current_step', 2, 'message', 'Business details saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step3 (Contact Information)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step3(
    contact_email_param TEXT,
    contact_phone_param TEXT,
    address_line1_param TEXT,
    city_param TEXT,
    state_param TEXT,
    postal_code_param TEXT,
    address_line2_param TEXT DEFAULT NULL,
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        contact_email = contact_email_param,
        contact_phone = contact_phone_param,
        business_address_line1 = address_line1_param,
        business_address_line2 = address_line2_param,
        business_city = city_param,
        business_state = state_param,
        business_postal_code = postal_code_param,
        business_country = country_param,
        registration_step = GREATEST(registration_step, 4),
        updated_at = NOW()
    WHERE seller_user_id = v_user_id; -- FIXED
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'current_step', 4, 'message', 'Contact information saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step4 (Banking & Payment)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step4(
    payout_method_param TEXT,
    bank_holder_name_param TEXT DEFAULT NULL,
    bank_name_param TEXT DEFAULT NULL,
    bank_account_type_param TEXT DEFAULT NULL,
    bank_routing_param TEXT DEFAULT NULL,
    bank_last4_param TEXT DEFAULT NULL,
    paypal_email_param TEXT DEFAULT NULL,
    crypto_wallet_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        payout_method = payout_method_param,
        bank_holder_name = bank_holder_name_param,
        bank_name = bank_name_param,
        bank_account_type = bank_account_type_param,
        bank_routing_number = bank_routing_param,
        bank_account_last4 = bank_last4_param,
        paypal_email = paypal_email_param,
        crypto_wallet_address = crypto_wallet_param,
        registration_step = GREATEST(registration_step, 5),
        updated_at = NOW()
    WHERE seller_user_id = v_user_id; -- FIXED
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'current_step', 5, 'message', 'Payment information saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step5 (Shipping & Policies)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step5(
    ships_from_param TEXT,
    shipping_countries_param TEXT[],
    processing_min_param INTEGER,
    processing_max_param INTEGER,
    return_policy_param TEXT DEFAULT NULL,
    shipping_policy_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        ships_from_location = ships_from_param,
        shipping_countries = shipping_countries_param,
        processing_time_min = processing_min_param,
        processing_time_max = processing_max_param,
        return_policy = return_policy_param,
        shipping_policy = shipping_policy_param,
        registration_step = GREATEST(registration_step, 6),
        updated_at = NOW()
    WHERE seller_user_id = v_user_id; -- FIXED
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'current_step', 6, 'message', 'Shipping & policies saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: complete_seller_registration (Final Step)
-- ============================================================================
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
    v_seller_id UUID;
    v_rows_updated INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Verify all agreements are accepted
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'All agreements must be accepted');
    END IF;
    
    -- Complete registration
    UPDATE public.seller_profiles
    SET 
        terms_accepted = terms_accepted_param,
        privacy_accepted = privacy_accepted_param,
        seller_agreement_accepted = seller_agreement_accepted_param,
        terms_accepted_at = NOW(),
        registration_step = 7,
        registration_completed = TRUE,
        registration_completed_at = NOW(),
        status = 'pending', -- Awaiting admin approval
        updated_at = NOW()
    WHERE seller_user_id = v_user_id -- FIXED
    RETURNING id INTO v_seller_id;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'seller_id', v_seller_id,
        'message', 'Registration complete! Your application is under review.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Grant execute permissions to all functions
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3 TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step4 TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step5 TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_seller_registration TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ All seller registration functions fixed!';
  RAISE NOTICE 'All functions now use seller_user_id instead of user_id';
  RAISE NOTICE 'Registration flow should work correctly now.';
END $$;

