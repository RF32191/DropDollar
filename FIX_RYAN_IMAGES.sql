-- ============================================================================
-- FIX RYAN'S IMAGE PATHS
-- ============================================================================

-- Step 1: List all files in storage for this user
-- Go to Supabase > Storage > seller-documents > 52c0b177-e93f-4b4d-bedc-8ccd89044b4f
-- Copy the exact filenames you see

-- Step 2: Update with actual paths (REPLACE filenames with what you see in storage)
UPDATE seller_profiles
SET 
    dl_front_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/dl_front_1732836689682.jpg',
    dl_back_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/dl_back_1732836689683.jpg',
    selfie_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/selfie_1732836689684.jpg'
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'::UUID;

-- Step 3: Verify
SELECT 
    shop_name,
    dl_front_url,
    dl_back_url,
    selfie_url
FROM seller_profiles
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'::UUID;

SELECT '
============================================
IMPORTANT: Check the actual filenames!
============================================

1. Go to Supabase > Storage > seller-documents
2. Click on folder: 52c0b177-e93f-4b4d-bedc-8ccd89044b4f
3. Note the EXACT filenames (timestamps will differ)
4. If different, update the paths above and re-run

============================================
' as note;

