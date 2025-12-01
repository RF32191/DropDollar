-- ============================================================================
-- DIAGNOSE W-9 DATA - Check if submissions exist
-- ============================================================================

-- 1. Check if tax_profiles table exists and has data
SELECT 'TAX_PROFILES TABLE:' as check_type;
SELECT COUNT(*) as total_records FROM tax_profiles;

-- 2. Show all W-9 submissions
SELECT 'ALL W-9 SUBMISSIONS:' as check_type;
SELECT 
    id,
    user_id,
    full_name,
    tax_classification,
    ssn_last4,
    city,
    state,
    signed_at,
    created_at
FROM tax_profiles
ORDER BY created_at DESC;

-- 3. Check if the admin function exists
SELECT 'ADMIN FUNCTION EXISTS:' as check_type;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'admin_get_all_w9s';

-- 4. Try running the function
SELECT 'FUNCTION OUTPUT:' as check_type;
SELECT * FROM admin_get_all_w9s(10, 0, NULL);

