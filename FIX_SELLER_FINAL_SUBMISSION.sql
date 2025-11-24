-- ============================================================================
-- FIX SELLER REGISTRATION FINAL SUBMISSION
-- ============================================================================
-- This adds missing columns and ensures proper validation before submission
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD MISSING COLUMNS
-- ============================================================================

DO $$ 
BEGIN
    -- Registration Completed At
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'registration_completed_at'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN registration_completed_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added registration_completed_at column';
    ELSE
        RAISE NOTICE '⚠️ registration_completed_at column already exists';
    END IF;

    -- Registration Completed (boolean)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'registration_completed'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN registration_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added registration_completed column';
    ELSE
        RAISE NOTICE '⚠️ registration_completed column already exists';
    END IF;

    -- Submitted At (when they clicked final submit)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN submitted_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added submitted_at column';
    ELSE
        RAISE NOTICE '⚠️ submitted_at column already exists';
    END IF;

    -- Contact Email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'contact_email'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN contact_email TEXT;
        RAISE NOTICE '✅ Added contact_email column';
    ELSE
        RAISE NOTICE '⚠️ contact_email column already exists';
    END IF;

    -- Contact Phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'contact_phone'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN contact_phone TEXT;
        RAISE NOTICE '✅ Added contact_phone column';
    ELSE
        RAISE NOTICE '⚠️ contact_phone column already exists';
    END IF;

    -- Address Line 1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'address_line1'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN address_line1 TEXT;
        RAISE NOTICE '✅ Added address_line1 column';
    ELSE
        RAISE NOTICE '⚠️ address_line1 column already exists';
    END IF;

    -- Address Line 2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'address_line2'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN address_line2 TEXT;
        RAISE NOTICE '✅ Added address_line2 column';
    ELSE
        RAISE NOTICE '⚠️ address_line2 column already exists';
    END IF;

    -- City
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN city TEXT;
        RAISE NOTICE '✅ Added city column';
    ELSE
        RAISE NOTICE '⚠️ city column already exists';
    END IF;

    -- State
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'state'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN state TEXT;
        RAISE NOTICE '✅ Added state column';
    ELSE
        RAISE NOTICE '⚠️ state column already exists';
    END IF;

    -- Postal Code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN postal_code TEXT;
        RAISE NOTICE '✅ Added postal_code column';
    ELSE
        RAISE NOTICE '⚠️ postal_code column already exists';
    END IF;

    -- Country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN country TEXT DEFAULT 'US';
        RAISE NOTICE '✅ Added country column';
    ELSE
        RAISE NOTICE '⚠️ country column already exists';
    END IF;

    -- Shop Description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'shop_description'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN shop_description TEXT;
        RAISE NOTICE '✅ Added shop_description column';
    ELSE
        RAISE NOTICE '⚠️ shop_description column already exists';
    END IF;

    -- Business Type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'business_type'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN business_type TEXT;
        RAISE NOTICE '✅ Added business_type column';
    ELSE
        RAISE NOTICE '⚠️ business_type column already exists';
    END IF;

    -- Terms Accepted
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'terms_accepted'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added terms_accepted column';
    ELSE
        RAISE NOTICE '⚠️ terms_accepted column already exists';
    END IF;

    -- Privacy Accepted
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'privacy_accepted'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN privacy_accepted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added privacy_accepted column';
    ELSE
        RAISE NOTICE '⚠️ privacy_accepted column already exists';
    END IF;

    -- Seller Agreement Accepted
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'seller_agreement_accepted'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN seller_agreement_accepted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added seller_agreement_accepted column';
    ELSE
        RAISE NOTICE '⚠️ seller_agreement_accepted column already exists';
    END IF;

END $$;

-- ============================================================================
-- STEP 2: UPDATE COMPLETE_SELLER_REGISTRATION FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN);

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
  v_missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Get seller profile
  SELECT * INTO v_profile
  FROM public.seller_profiles
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Seller profile not found. Please start registration from Step 1.'
    );
  END IF;

  -- Validate all required fields from all steps
  
  -- Step 1: Shop Information
  IF v_profile.shop_name IS NULL OR TRIM(v_profile.shop_name) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Shop Name (Step 1)');
  END IF;
  
  IF v_profile.shop_description IS NULL OR TRIM(v_profile.shop_description) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Shop Description (Step 1)');
  END IF;

  -- Step 2: Business Details
  IF v_profile.business_type IS NULL OR TRIM(v_profile.business_type) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Business Type (Step 2)');
  END IF;

  -- Step 3: Identity Verification
  IF v_profile.full_legal_name IS NULL OR TRIM(v_profile.full_legal_name) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Full Legal Name (Step 3)');
  END IF;

  IF v_profile.date_of_birth IS NULL THEN
    v_missing_fields := array_append(v_missing_fields, 'Date of Birth (Step 3)');
  END IF;

  IF v_profile.ssn_last4 IS NULL OR LENGTH(TRIM(v_profile.ssn_last4)) != 4 THEN
    v_missing_fields := array_append(v_missing_fields, 'SSN Last 4 (Step 3)');
  END IF;

  IF v_profile.dl_front_url IS NULL OR TRIM(v_profile.dl_front_url) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Driver License Front (Step 3)');
  END IF;

  IF v_profile.dl_back_url IS NULL OR TRIM(v_profile.dl_back_url) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Driver License Back (Step 3)');
  END IF;

  IF v_profile.selfie_url IS NULL OR TRIM(v_profile.selfie_url) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Selfie Photo (Step 3)');
  END IF;

  -- Step 4: Contact Information
  IF v_profile.contact_email IS NULL OR TRIM(v_profile.contact_email) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Contact Email (Step 4)');
  END IF;

  IF v_profile.contact_phone IS NULL OR TRIM(v_profile.contact_phone) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Phone Number (Step 4)');
  END IF;

  IF v_profile.address_line1 IS NULL OR TRIM(v_profile.address_line1) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Address (Step 4)');
  END IF;

  IF v_profile.city IS NULL OR TRIM(v_profile.city) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'City (Step 4)');
  END IF;

  IF v_profile.state IS NULL OR TRIM(v_profile.state) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'State (Step 4)');
  END IF;

  IF v_profile.postal_code IS NULL OR TRIM(v_profile.postal_code) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Postal Code (Step 4)');
  END IF;

  -- Step 7: Legal Agreements
  IF NOT terms_accepted_param THEN
    v_missing_fields := array_append(v_missing_fields, 'Terms & Conditions (Step 7)');
  END IF;

  IF NOT privacy_accepted_param THEN
    v_missing_fields := array_append(v_missing_fields, 'Privacy Policy (Step 7)');
  END IF;

  IF NOT seller_agreement_accepted_param THEN
    v_missing_fields := array_append(v_missing_fields, 'Seller Agreement (Step 7)');
  END IF;

  -- If any fields are missing, return error
  IF array_length(v_missing_fields, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Please complete all required fields: ' || array_to_string(v_missing_fields, ', '),
      'missing_fields', v_missing_fields
    );
  END IF;

  -- All validation passed - mark as completed and pending review
  UPDATE public.seller_profiles
  SET 
    terms_accepted = terms_accepted_param,
    privacy_accepted = privacy_accepted_param,
    seller_agreement_accepted = seller_agreement_accepted_param,
    registration_completed = TRUE,
    registration_completed_at = NOW(),
    submitted_at = NOW(),
    status = 'pending',
    registration_step = 7,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  RAISE NOTICE '✅ Seller registration completed for user: %', v_user_id;
  RAISE NOTICE '📧 Email: %', v_profile.contact_email;
  RAISE NOTICE '🏪 Shop: %', v_profile.shop_name;
  RAISE NOTICE '📊 Status: pending (awaiting admin review)';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Registration submitted successfully! Your application is now pending admin review.',
    'status', 'pending',
    'shop_name', v_profile.shop_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================================
-- STEP 3: CREATE ADMIN VIEW FOR PENDING REGISTRATIONS
-- ============================================================================

CREATE OR REPLACE VIEW public.admin_pending_seller_registrations AS
SELECT 
  sp.id,
  sp.user_id,
  u.email,
  u.username,
  sp.shop_name,
  sp.shop_description,
  sp.business_type,
  sp.business_name,
  sp.full_legal_name,
  sp.date_of_birth,
  sp.ssn_last4,
  sp.dl_front_url,
  sp.dl_back_url,
  sp.selfie_url,
  sp.contact_email,
  sp.contact_phone,
  sp.address_line1,
  sp.address_line2,
  sp.city,
  sp.state,
  sp.postal_code,
  sp.country,
  sp.verification_status,
  sp.status,
  sp.registration_step,
  sp.registration_completed,
  sp.submitted_at,
  sp.registration_completed_at,
  sp.created_at,
  sp.updated_at
FROM public.seller_profiles sp
JOIN public.users u ON sp.user_id = u.id
WHERE sp.registration_completed = TRUE
AND sp.status IN ('pending', 'approved', 'rejected')
ORDER BY sp.submitted_at DESC;

-- Grant access to admins
GRANT SELECT ON public.admin_pending_seller_registrations TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ SELLER REGISTRATION VALIDATION FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ Added columns:';
  RAISE NOTICE '   📅 registration_completed_at';
  RAISE NOTICE '   ☑️ registration_completed';
  RAISE NOTICE '   📤 submitted_at';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Updated function:';
  RAISE NOTICE '   complete_seller_registration()';
  RAISE NOTICE '   → Validates ALL 7 steps';
  RAISE NOTICE '   → Checks all required fields';
  RAISE NOTICE '   → Sets status to "pending"';
  RAISE NOTICE '   → Sends to admin for review';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created admin view:';
  RAISE NOTICE '   admin_pending_seller_registrations';
  RAISE NOTICE '   → Shows all pending registrations';
  RAISE NOTICE '   → Includes all submitted data';
  RAISE NOTICE '   → Ordered by submission date';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 NOW TRY:';
  RAISE NOTICE '   1. Complete all 7 steps';
  RAISE NOTICE '   2. Click Submit on Step 7';
  RAISE NOTICE '   3. Check admin page for submission';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
END $$;

