-- ============================================================================
-- DIAGNOSE: Why images aren't showing
-- ============================================================================

-- Step 1: Check what's stored in seller_profiles
SELECT 'CURRENT IMAGE PATHS IN DATABASE:' as info;
SELECT 
    sp.id,
    sp.shop_name,
    u.email,
    sp.dl_front_url,
    sp.dl_back_url,
    sp.selfie_url
FROM seller_profiles sp
JOIN users u ON sp.user_id = u.id;

-- Step 2: List files in storage bucket (run this query)
-- Go to Supabase Dashboard > Storage > seller-documents
-- Copy the file paths you see there

-- Step 3: If you see files like "user_id/dl_front_12345.jpg" in storage,
-- update the seller_profiles with those paths:

-- EXAMPLE (replace with actual paths from your storage):
-- UPDATE seller_profiles
-- SET 
--     dl_front_url = 'YOUR_USER_ID/dl_front_TIMESTAMP.jpg',
--     dl_back_url = 'YOUR_USER_ID/dl_back_TIMESTAMP.jpg',
--     selfie_url = 'YOUR_USER_ID/selfie_TIMESTAMP.jpg'
-- WHERE user_id = 'YOUR_USER_ID';

SELECT '
============================================
WHAT TO DO:
============================================

1. Go to Supabase Dashboard > Storage > seller-documents

2. Find your uploaded files (should be in a folder named with your user_id)

3. Copy the FULL PATH of each file, for example:
   - a68c0750-49f7-4d75-ad93-5d6698ea34f7/dl_front_1732123456789.jpg

4. Run the UPDATE query below with YOUR actual paths

============================================
' as instructions;

-- Step 4: Get the user_id for Ryan
SELECT 'RYAN USER ID:' as info;
SELECT id, email FROM users 
WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com', 'ryanrfermoselle@yahoo.com');

