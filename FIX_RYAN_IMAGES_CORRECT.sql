-- ============================================================================
-- FIX RYAN'S IMAGE PATHS - CORRECT PATHS FROM STORAGE
-- ============================================================================
-- Found from URL: dl_back_1763974383287.HEIC
-- User ID: 52c0b177-e93f-4b4d-bedc-8ccd89044b4f
-- ============================================================================

-- Update with the HEIC file paths
-- NOTE: Check Supabase Storage for exact dl_front and selfie filenames
UPDATE seller_profiles
SET 
    dl_front_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/dl_front_1763974383287.HEIC',
    dl_back_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/dl_back_1763974383287.HEIC',
    selfie_url = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f/selfie_1763974383287.HEIC'
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'::UUID;

-- Verify the update worked
SELECT 
    shop_name,
    dl_front_url,
    dl_back_url,
    selfie_url
FROM seller_profiles
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'::UUID;

SELECT 'Image paths updated! Refresh admin dashboard.' as status;

-- ============================================================================
-- NOTE: If the timestamps are different for dl_front and selfie,
-- check Supabase Storage and update the filenames accordingly.
-- The timestamp 1763974383287 might be the same or different for each file.
-- ============================================================================

