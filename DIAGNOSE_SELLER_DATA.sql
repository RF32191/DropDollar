-- ============================================================================
-- DIAGNOSE: Check what seller data exists
-- ============================================================================

-- Check seller_profiles table
SELECT 'SELLER PROFILES DATA:' as info;
SELECT 
    sp.id as seller_id,
    sp.user_id,
    u.email,
    u.username,
    sp.shop_name,
    sp.shop_description,
    sp.business_type,
    sp.business_name,
    sp.full_legal_name,
    sp.date_of_birth,
    sp.ssn_last4,
    sp.contact_email,
    sp.contact_phone,
    sp.address_line1,
    sp.city,
    sp.state,
    sp.postal_code,
    sp.dl_front_url,
    sp.dl_back_url,
    sp.selfie_url,
    sp.status,
    sp.registration_step,
    sp.verified,
    sp.identity_verified,
    sp.submitted_at,
    sp.created_at
FROM seller_profiles sp
LEFT JOIN users u ON sp.user_id = u.id
ORDER BY sp.created_at DESC;

-- Check column names
SELECT 'COLUMN NAMES IN SELLER_PROFILES:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seller_profiles'
ORDER BY ordinal_position;

-- Count
SELECT 'TOTAL SELLERS:' as info, COUNT(*) as count FROM seller_profiles;
SELECT 'PENDING SELLERS:' as info, COUNT(*) as count FROM seller_profiles WHERE status = 'pending';
SELECT 'STEP 6+ SELLERS:' as info, COUNT(*) as count FROM seller_profiles WHERE registration_step >= 6;

