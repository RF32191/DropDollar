-- ============================================================================
-- FIX: Re-approve Ryan + Check Image URLs
-- ============================================================================

-- Step 1: Check the DL URLs
SELECT 'CHECKING IMAGE URLs:' as info;
SELECT 
    id,
    shop_name,
    dl_front_url,
    dl_back_url,
    selfie_url,
    status
FROM seller_profiles
WHERE shop_name = 'VG' OR shop_name LIKE '%VGMAKERS%';

-- Step 2: Re-approve Ryan (set status to active instead of rejected)
UPDATE seller_profiles
SET 
    status = 'active',
    verified = true,
    identity_verified = true,
    verified_at = NOW(),
    approved_at = NOW(),
    registration_completed = true,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com', 'ryanrfermoselle@yahoo.com')
);

SELECT 'Step 2: Ryan re-approved as active seller' as status;

-- Step 3: Check if storage bucket exists and is public
-- Note: This just shows what to check in Supabase dashboard
SELECT '
============================================
CHECK IN SUPABASE DASHBOARD:
============================================

1. Go to Storage > Buckets
2. Find "seller-documents" bucket
3. Click on it and check:
   - Is it PUBLIC? (needs to be for images to show)
   - Are there files inside?

If bucket is private, make it public:
1. Click on seller-documents bucket
2. Click "Policies" tab
3. Add policy: "Enable read access to everyone"

OR create signed URLs in the code.
============================================
' as instructions;

-- Step 4: Verify status
SELECT 'UPDATED STATUS:' as info;
SELECT id, shop_name, status, verified, identity_verified FROM seller_profiles;

