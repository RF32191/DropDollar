-- ============================================================================
-- LINK RYAN'S IMAGES - RUN THIS NOW
-- ============================================================================
-- Based on the URL you shared: dl_back_1763974383287.HEIC
-- User ID: 52c0b177-e93f-4b4d-bedc-8ccd89044b4f
-- ============================================================================

-- First, check what files exist in storage
-- Go to Supabase > Storage > seller-documents > 52c0b177-e93f-4b4d-bedc-8ccd89044b4f
-- and note the EXACT filenames, then update below if different

-- UPDATE THE PATHS (using timestamp from your URL: 1763974383287)
UPDATE seller_profiles
SET 
    dl_front_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/dl_front_1763974383287.HEIC',
    dl_back_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/dl_back_1763974383287.HEIC',
    selfie_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/selfie_1763974383287.HEIC'
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'::UUID;

-- Check it worked
SELECT 'UPDATED PATHS:' as status;
SELECT 
    shop_name,
    CASE WHEN dl_front_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dl_front,
    CASE WHEN dl_back_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dl_back,
    CASE WHEN selfie_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_selfie,
    dl_front_url,
    dl_back_url,
    selfie_url
FROM seller_profiles
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'::UUID;

