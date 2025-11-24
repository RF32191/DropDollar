-- ============================================================================
-- ADD IDENTITY VERIFICATION STEP TO SELLER REGISTRATION
-- ============================================================================
-- This script adds the identity verification step (Step 3) to the seller
-- registration flow, including driver's license upload and selfie verification.
--
-- IMPORTANT: Run this after STREAMLINED_ETSY_VERIFICATION.sql
-- ============================================================================

-- Add function to update seller registration step 3 (Identity Verification)
CREATE OR REPLACE FUNCTION update_seller_registration_step3_identity(
  full_legal_name_param TEXT,
  date_of_birth_param DATE,
  ssn_last4_param TEXT,
  dl_front_path_param TEXT,
  dl_back_path_param TEXT,
  selfie_path_param TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_seller_id UUID;
  v_current_step INT;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Get seller profile
  SELECT id, registration_step
  INTO v_seller_id, v_current_step
  FROM seller_profiles
  WHERE seller_user_id = v_user_id;

  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Seller profile not found'
    );
  END IF;

  -- Validate we're on step 2 or 3
  IF v_current_step < 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Please complete previous steps first'
    );
  END IF;

  -- Update seller profile with identity verification data
  UPDATE seller_profiles
  SET
    full_legal_name = full_legal_name_param,
    date_of_birth = date_of_birth_param,
    ssn_last4 = ssn_last4_param,
    dl_front_url = dl_front_path_param,
    dl_back_url = dl_back_path_param,
    selfie_url = selfie_path_param,
    identity_verified = FALSE, -- Will be verified by admin
    registration_step = GREATEST(registration_step, 3),
    updated_at = NOW()
  WHERE seller_user_id = v_user_id;

  -- Insert document records for the uploaded files
  INSERT INTO seller_documents (seller_id, document_type, file_path, status)
  VALUES
    (v_seller_id, 'drivers_license_front', dl_front_path_param, 'pending'),
    (v_seller_id, 'drivers_license_back', dl_back_path_param, 'pending'),
    (v_seller_id, 'selfie_with_id', selfie_path_param, 'pending')
  ON CONFLICT (seller_id, document_type) 
  DO UPDATE SET
    file_path = EXCLUDED.file_path,
    status = 'pending',
    uploaded_at = NOW();

  -- Log verification event
  INSERT INTO seller_verification_events (seller_id, event_type, event_data, created_by)
  VALUES (
    v_seller_id,
    'identity_documents_uploaded',
    jsonb_build_object(
      'documents', jsonb_build_array('dl_front', 'dl_back', 'selfie'),
      'name', full_legal_name_param,
      'dob', date_of_birth_param
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Identity verification documents uploaded successfully!'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_seller_registration_step3_identity TO authenticated;

-- Create seller-documents storage bucket if it doesn't exist (admin must do this in Supabase dashboard)
-- This is just documentation, you need to create the bucket manually in Supabase Storage:
-- 1. Go to Storage > Create Bucket
-- 2. Name: seller-documents
-- 3. Set to Private (not public)
-- 4. Add RLS policies:
--    - Authenticated users can upload their own documents
--    - Only seller and admins can read documents

COMMENT ON FUNCTION update_seller_registration_step3_identity IS 
'Handles identity verification step (step 3) of seller registration. Saves driver''s license photos, selfie with ID, and identity information.';

-- ============================================================================
-- DEPLOYMENT NOTES:
-- ============================================================================
-- 1. Run this SQL file in Supabase SQL editor
-- 2. Create 'seller-documents' storage bucket in Supabase Storage (if not exists)
-- 3. Set up RLS policies for the storage bucket:
--    - Allow authenticated users to upload to their own folder
--    - Allow users to read only their own documents
--    - Allow admins to read all documents
-- 4. Test the registration flow from step 1 to step 7
-- ============================================================================

