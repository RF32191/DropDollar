-- ============================================================================
-- FIX: Update Step 3 (Contact Information) Function
-- ============================================================================
-- This fixes the update_seller_registration_step3 function to use the correct
-- column name (seller_user_id instead of user_id) after the schema updates.
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
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Update seller profile (using seller_user_id column)
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
        registration_step = GREATEST(registration_step, 4), -- Move to step 4 after contact info
        updated_at = NOW()
    WHERE seller_user_id = v_user_id; -- FIXED: Changed from user_id to seller_user_id
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found. Please complete step 1 first.');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'current_step', 4, 'message', 'Contact information saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3 TO authenticated;

COMMENT ON FUNCTION public.update_seller_registration_step3 IS 
'Updates seller contact information in step 4 of registration (after identity verification). Fixed to use seller_user_id column.';

