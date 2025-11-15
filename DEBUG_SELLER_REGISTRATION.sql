-- ============================================================================
-- DEBUG SELLER REGISTRATION ISSUES
-- ============================================================================
-- Run these queries to diagnose seller registration problems
-- ============================================================================

-- 1. CHECK IF ANY SELLER PROFILES EXIST
SELECT 
    sp.id,
    sp.user_id,
    sp.shop_name,
    sp.status,
    sp.registration_step,
    sp.registration_completed,
    sp.created_at,
    sp.updated_at
FROM public.seller_profiles sp
ORDER BY sp.created_at DESC;

-- 2. CHECK WITH USER EMAILS
SELECT 
    sp.id,
    sp.user_id,
    au.email,
    sp.shop_name,
    sp.business_name,
    sp.contact_email,
    sp.status,
    sp.registration_step,
    sp.registration_completed,
    sp.created_at
FROM public.seller_profiles sp
LEFT JOIN auth.users au ON au.id = sp.user_id
ORDER BY sp.created_at DESC;

-- 3. CHECK PENDING SELLERS SPECIFICALLY
SELECT 
    sp.id,
    sp.user_id,
    au.email,
    sp.shop_name,
    sp.business_name,
    sp.contact_email,
    sp.contact_phone,
    sp.status,
    sp.created_at
FROM public.seller_profiles sp
LEFT JOIN auth.users au ON au.id = sp.user_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC;

-- 4. CHECK IF ADMIN NOTIFICATIONS WERE CREATED
SELECT 
    an.id,
    an.type,
    an.title,
    an.message,
    an.is_read,
    an.created_at,
    sp.shop_name
FROM public.admin_notifications an
LEFT JOIN public.seller_profiles sp ON sp.id = an.related_seller_id
WHERE an.type = 'seller_pending'
ORDER BY an.created_at DESC;

-- 5. CHECK ADMIN PROFILES
SELECT 
    ap.id,
    ap.user_id,
    au.email,
    ap.role,
    ap.can_approve_sellers,
    ap.is_active
FROM public.admin_profiles ap
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.is_active = true;

-- 6. CHECK IF PUBLIC.USERS TABLE EXISTS (This might be the issue)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
) AS public_users_table_exists;

-- 7. CHECK TABLE STRUCTURE
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'seller_profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'SELLER REGISTRATION DEBUG COMPLETE';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Review the query results above to find issues';
    RAISE NOTICE '';
    RAISE NOTICE 'Common issues:';
    RAISE NOTICE '1. No seller_profiles records = registration not saving';
    RAISE NOTICE '2. Records exist but status not "pending" = status update issue';
    RAISE NOTICE '3. No admin_notifications = trigger not firing';
    RAISE NOTICE '4. public.users table missing = need to use auth.users';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Run FIX_SELLER_REGISTRATION.sql';
END $$;

