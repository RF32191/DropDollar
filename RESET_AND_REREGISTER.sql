-- ============================================================================
-- RESET SELLER REGISTRATION FOR RE-UPLOAD
-- ============================================================================
-- Run this AFTER creating the seller-documents bucket in Supabase Storage
-- Then re-register as a seller to upload fresh DL images
-- ============================================================================

-- Option 1: Just clear the DL URLs (keep registration, re-upload images)
UPDATE seller_profiles
SET 
    dl_front_url = NULL,
    dl_back_url = NULL,
    selfie_url = NULL,
    identity_verified = false,
    registration_step = 2  -- Go back to step 3 (identity verification)
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com', 'ryanrfermoselle@yahoo.com')
);

SELECT 'Images cleared - go to Step 3 Identity Verification to re-upload' as status;

-- Option 2: Complete reset (uncomment to use)
-- DELETE FROM seller_profiles 
-- WHERE user_id IN (
--     SELECT id FROM users 
--     WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com', 'ryanrfermoselle@yahoo.com')
-- );
-- SELECT 'Full reset done - register as seller again' as status;

-- Check current status
SELECT 
    shop_name,
    status,
    registration_step,
    CASE WHEN dl_front_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dl_front,
    CASE WHEN dl_back_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dl_back
FROM seller_profiles;

SELECT '
============================================
NEXT STEPS (SECURE SETUP):
============================================

1. FIRST: Create PRIVATE bucket in Supabase Dashboard
   Storage > New Bucket > seller-documents
   ❌ DO NOT check "Public bucket" (keep it private!)
   Click Create

2. Add upload policy for authenticated users:
   Click on bucket > Policies > New Policy
   Name: "Allow authenticated uploads"
   Operation: INSERT
   Policy: (auth.role() = ''authenticated'')
   Save

3. Then go to your Dashboard
   
4. In Seller Status section, you should see
   "Continue Registration" or similar

5. Go to Step 3 (Identity Verification)
   Upload your DL front, back, and selfie

6. Complete registration

7. Admin approves (images use signed URLs - expire in 1 hour)

SECURITY:
- Bucket is PRIVATE (no public access)
- Admin uses signed URLs (expire in 1 hour)
- Only authenticated users can upload
- DL images are NOT publicly accessible

============================================
' as instructions;

