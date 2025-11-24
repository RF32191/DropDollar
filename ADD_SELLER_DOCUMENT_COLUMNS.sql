-- ============================================================================
-- ADD MISSING DOCUMENT COLUMNS TO SELLER_PROFILES
-- ============================================================================
-- This adds the columns needed for identity verification documents
-- ============================================================================

-- Add document URL columns if they don't exist
DO $$ 
BEGIN
    -- Driver's License Front
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'dl_front_url'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN dl_front_url TEXT;
        RAISE NOTICE '✅ Added dl_front_url column';
    ELSE
        RAISE NOTICE '⚠️ dl_front_url column already exists';
    END IF;

    -- Driver's License Back
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'dl_back_url'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN dl_back_url TEXT;
        RAISE NOTICE '✅ Added dl_back_url column';
    ELSE
        RAISE NOTICE '⚠️ dl_back_url column already exists';
    END IF;

    -- Selfie Photo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'selfie_url'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN selfie_url TEXT;
        RAISE NOTICE '✅ Added selfie_url column';
    ELSE
        RAISE NOTICE '⚠️ selfie_url column already exists';
    END IF;

    -- Full Legal Name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'full_legal_name'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN full_legal_name TEXT;
        RAISE NOTICE '✅ Added full_legal_name column';
    ELSE
        RAISE NOTICE '⚠️ full_legal_name column already exists';
    END IF;

    -- Date of Birth
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN date_of_birth DATE;
        RAISE NOTICE '✅ Added date_of_birth column';
    ELSE
        RAISE NOTICE '⚠️ date_of_birth column already exists';
    END IF;

    -- SSN Last 4
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'ssn_last4'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN ssn_last4 TEXT;
        RAISE NOTICE '✅ Added ssn_last4 column';
    ELSE
        RAISE NOTICE '⚠️ ssn_last4 column already exists';
    END IF;

    -- Verification Status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN verification_status TEXT DEFAULT 'pending';
        RAISE NOTICE '✅ Added verification_status column';
    ELSE
        RAISE NOTICE '⚠️ verification_status column already exists';
    END IF;

    -- Identity Verified At
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_profiles' 
        AND column_name = 'identity_verified_at'
    ) THEN
        ALTER TABLE public.seller_profiles 
        ADD COLUMN identity_verified_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added identity_verified_at column';
    ELSE
        RAISE NOTICE '⚠️ identity_verified_at column already exists';
    END IF;

END $$;

-- ============================================================================
-- UPDATE THE STEP 3 FUNCTION TO USE THESE COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_seller_registration_step3_identity(
  full_legal_name_param TEXT,
  date_of_birth_param DATE,
  ssn_last4_param TEXT,
  dl_front_url_param TEXT,
  dl_back_url_param TEXT,
  selfie_url_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Validate all required fields
  IF full_legal_name_param IS NULL OR TRIM(full_legal_name_param) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Full legal name is required'
    );
  END IF;

  IF date_of_birth_param IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Date of birth is required'
    );
  END IF;

  IF ssn_last4_param IS NULL OR LENGTH(TRIM(ssn_last4_param)) != 4 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'SSN last 4 digits are required'
    );
  END IF;

  -- Validate image URLs
  IF dl_front_url_param IS NULL OR TRIM(dl_front_url_param) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Driver license front photo is required'
    );
  END IF;

  IF dl_back_url_param IS NULL OR TRIM(dl_back_url_param) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Driver license back photo is required'
    );
  END IF;

  IF selfie_url_param IS NULL OR TRIM(selfie_url_param) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Selfie photo is required'
    );
  END IF;

  -- Update seller profile
  UPDATE public.seller_profiles
  SET 
    full_legal_name = full_legal_name_param,
    date_of_birth = date_of_birth_param,
    ssn_last4 = ssn_last4_param,
    dl_front_url = dl_front_url_param,
    dl_back_url = dl_back_url_param,
    selfie_url = selfie_url_param,
    verification_status = 'pending',
    registration_step = GREATEST(registration_step, 3),
    updated_at = NOW()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Seller profile not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Identity verification information saved successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3_identity(TEXT, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ SELLER DOCUMENT COLUMNS ADDED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ Added columns:';
  RAISE NOTICE '   📄 dl_front_url';
  RAISE NOTICE '   📄 dl_back_url';
  RAISE NOTICE '   📄 selfie_url';
  RAISE NOTICE '   👤 full_legal_name';
  RAISE NOTICE '   📅 date_of_birth';
  RAISE NOTICE '   🔢 ssn_last4';
  RAISE NOTICE '   ✔️ verification_status';
  RAISE NOTICE '   📆 identity_verified_at';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Updated function:';
  RAISE NOTICE '   update_seller_registration_step3_identity()';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 NOW TRY SELLER REGISTRATION STEP 3!';
  RAISE NOTICE '✅ ========================================';
END $$;

