-- ============================================================================
-- SELLER DOCUMENTS STORAGE BUCKET SETUP
-- ============================================================================
-- This creates the storage bucket and policies for seller verification documents
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE THE BUCKET (if not exists)
-- ============================================================================
-- Note: This might fail if bucket already exists - that's OK!

INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-documents', 'seller-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: DROP EXISTING POLICIES (for clean re-run)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload seller docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own seller docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all seller docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own seller docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own seller docs" ON storage.objects;

-- ============================================================================
-- STEP 3: CREATE UPLOAD POLICY (Users upload their own documents)
-- ============================================================================

CREATE POLICY "Authenticated users can upload seller docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seller-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 4: CREATE READ POLICY (Users read their own documents)
-- ============================================================================

CREATE POLICY "Users can read own seller docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 5: CREATE ADMIN READ POLICY (Admin can read all documents)
-- ============================================================================

CREATE POLICY "Admins can read all seller docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.email = 'rf32191@gmail.com'
  )
);

-- ============================================================================
-- STEP 6: CREATE UPDATE POLICY (Users can update their own documents)
-- ============================================================================

CREATE POLICY "Users can update own seller docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 7: CREATE DELETE POLICY (Users can delete their own documents)
-- ============================================================================

CREATE POLICY "Users can delete own seller docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- ✅ SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ SELLER STORAGE BUCKET CONFIGURED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ Bucket: seller-documents';
  RAISE NOTICE '✅ Type: Private';
  RAISE NOTICE '✅ Policies Created:';
  RAISE NOTICE '   📤 Users can upload their own docs';
  RAISE NOTICE '   👀 Users can read their own docs';
  RAISE NOTICE '   🔄 Users can update their own docs';
  RAISE NOTICE '   🗑️  Users can delete their own docs';
  RAISE NOTICE '   👑 Admin (rf32191@gmail.com) can read ALL docs';
  RAISE NOTICE '';
  RAISE NOTICE '📂 File Structure:';
  RAISE NOTICE '   seller-documents/';
  RAISE NOTICE '   └── {user_id}/';
  RAISE NOTICE '       ├── dl_front_*.jpg';
  RAISE NOTICE '       ├── dl_back_*.jpg';
  RAISE NOTICE '       └── selfie_*.jpg';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 NOW TRY SELLER REGISTRATION:';
  RAISE NOTICE '   1. Go to /seller/register';
  RAISE NOTICE '   2. Complete Steps 1-2';
  RAISE NOTICE '   3. Step 3: Upload DL + Selfie';
  RAISE NOTICE '   4. Should work without "Bucket not found"!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
END $$;

