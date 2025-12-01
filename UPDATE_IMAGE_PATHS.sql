-- ============================================================================
-- UPDATE IMAGE PATHS
-- ============================================================================
-- Replace the paths below with the ACTUAL file paths from your Supabase Storage
-- Go to Storage > seller-documents and copy the exact file paths
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > Storage > seller-documents
-- 2. Click on the folder (your user_id)
-- 3. You'll see files like: dl_front_1732123456789.jpg
-- 4. The full path is: YOUR_USER_ID/dl_front_1732123456789.jpg
-- 5. Replace the paths below and run this query

-- REPLACE THESE WITH YOUR ACTUAL PATHS:
UPDATE seller_profiles
SET 
    dl_front_url = 'PASTE_DL_FRONT_PATH_HERE',
    dl_back_url = 'PASTE_DL_BACK_PATH_HERE',
    selfie_url = 'PASTE_SELFIE_PATH_HERE',
    identity_verified = false
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email = 'ryanrfermoselle@yahoo.com'
);

-- Verify the update
SELECT 
    shop_name,
    dl_front_url,
    dl_back_url,
    selfie_url
FROM seller_profiles;

SELECT 'Paths updated! Refresh admin dashboard to see images.' as status;

