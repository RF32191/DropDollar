-- ============================================================================
-- TEST SELLER REGISTRATION SYSTEM
-- ============================================================================
-- Run this AFTER a user completes seller registration
-- This will show you exactly what's in the database
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SELLER REGISTRATION DIAGNOSTIC TEST';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Check if seller_profiles table exists and has data
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '1️⃣ CHECKING SELLER_PROFILES TABLE...';
    RAISE NOTICE '----------------------------------------';
    
    SELECT COUNT(*) INTO v_count FROM public.seller_profiles;
    
    IF v_count = 0 THEN
        RAISE NOTICE '❌ NO SELLER PROFILES FOUND!';
        RAISE NOTICE '   This means registration is not saving data.';
    ELSE
        RAISE NOTICE '✅ Found % seller profile(s)', v_count;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Show all seller profiles
SELECT 
    id,
    user_id,
    shop_name,
    business_name,
    status,
    registration_step,
    registration_completed,
    contact_email,
    contact_phone,
    created_at,
    updated_at
FROM public.seller_profiles
ORDER BY created_at DESC;

-- ============================================================================
-- TEST 2: Check seller profiles with user emails
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '2️⃣ CHECKING WITH USER EMAILS...';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT 
    sp.id as seller_id,
    sp.user_id,
    au.email as user_email,
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

-- ============================================================================
-- TEST 3: Check specifically for PENDING sellers
-- ============================================================================

DO $$
DECLARE
    v_pending_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ CHECKING PENDING SELLERS...';
    RAISE NOTICE '----------------------------------------';
    
    SELECT COUNT(*) INTO v_pending_count 
    FROM public.seller_profiles 
    WHERE status = 'pending';
    
    IF v_pending_count = 0 THEN
        RAISE NOTICE '⚠️  NO PENDING SELLERS';
        RAISE NOTICE '   Check if status is being set correctly';
    ELSE
        RAISE NOTICE '✅ Found % pending seller(s)', v_pending_count;
    END IF;
    
    RAISE NOTICE '';
END $$;

SELECT 
    sp.id as seller_id,
    au.email as user_email,
    sp.shop_name,
    sp.business_name,
    sp.contact_email,
    sp.contact_phone,
    sp.status,
    sp.registration_completed,
    sp.terms_accepted,
    sp.privacy_accepted,
    sp.seller_agreement_accepted,
    sp.created_at
FROM public.seller_profiles sp
LEFT JOIN auth.users au ON au.id = sp.user_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC;

-- ============================================================================
-- TEST 4: Check admin notifications
-- ============================================================================

DO $$
DECLARE
    v_notif_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '4️⃣ CHECKING ADMIN NOTIFICATIONS...';
    RAISE NOTICE '----------------------------------------';
    
    SELECT COUNT(*) INTO v_notif_count 
    FROM public.admin_notifications 
    WHERE type = 'seller_pending';
    
    IF v_notif_count = 0 THEN
        RAISE NOTICE '⚠️  NO SELLER NOTIFICATIONS';
        RAISE NOTICE '   Trigger might not be firing';
    ELSE
        RAISE NOTICE '✅ Found % notification(s)', v_notif_count;
    END IF;
    
    RAISE NOTICE '';
END $$;

SELECT 
    an.id,
    an.type,
    an.title,
    an.message,
    an.is_read,
    sp.shop_name,
    au.email as seller_email,
    an.created_at
FROM public.admin_notifications an
LEFT JOIN public.seller_profiles sp ON sp.id = an.related_seller_id
LEFT JOIN auth.users au ON au.id = an.related_user_id
WHERE an.type = 'seller_pending'
ORDER BY an.created_at DESC;

-- ============================================================================
-- TEST 5: Test get_pending_sellers() function AS ADMIN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '5️⃣ TESTING get_pending_sellers() FUNCTION...';
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Note: This test runs as DEFINER (system), not as your user';
    RAISE NOTICE '';
END $$;

-- Try to call the function (this will show what the admin would see)
-- Note: This won't work perfectly without being logged in as admin,
-- but it will show if there are any SQL errors

-- ============================================================================
-- TEST 6: Check registration completion status
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '6️⃣ CHECKING REGISTRATION COMPLETION...';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT 
    status,
    registration_completed,
    terms_accepted,
    privacy_accepted,
    seller_agreement_accepted,
    COUNT(*) as count
FROM public.seller_profiles
GROUP BY status, registration_completed, terms_accepted, privacy_accepted, seller_agreement_accepted;

-- ============================================================================
-- TEST 7: Check if master admin exists
-- ============================================================================

DO $$
DECLARE
    v_master_exists BOOLEAN;
    v_master_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '7️⃣ CHECKING MASTER ADMIN...';
    RAISE NOTICE '----------------------------------------';
    
    SELECT id INTO v_master_id
    FROM auth.users
    WHERE email = 'rf32191@gmail.com';
    
    IF v_master_id IS NULL THEN
        RAISE NOTICE '❌ MASTER ADMIN ACCOUNT NOT FOUND!';
        RAISE NOTICE '   Email: rf32191@gmail.com';
        RAISE NOTICE '   You need to create this account first';
    ELSE
        RAISE NOTICE '✅ Master admin found: %', v_master_id;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 8: Check admin_profiles table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '8️⃣ CHECKING ADMIN_PROFILES...';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT 
    ap.id,
    ap.user_id,
    au.email,
    ap.role,
    ap.can_approve_sellers,
    ap.can_review_audits,
    ap.is_active
FROM public.admin_profiles ap
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.is_active = true;

-- ============================================================================
-- SUMMARY & RECOMMENDATIONS
-- ============================================================================

DO $$
DECLARE
    v_seller_count INTEGER;
    v_pending_count INTEGER;
    v_notif_count INTEGER;
    v_master_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Count sellers
    SELECT COUNT(*) INTO v_seller_count FROM public.seller_profiles;
    SELECT COUNT(*) INTO v_pending_count FROM public.seller_profiles WHERE status = 'pending';
    SELECT COUNT(*) INTO v_notif_count FROM public.admin_notifications WHERE type = 'seller_pending';
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'rf32191@gmail.com') INTO v_master_exists;
    
    RAISE NOTICE 'Results:';
    RAISE NOTICE '- Total Sellers: %', v_seller_count;
    RAISE NOTICE '- Pending Sellers: %', v_pending_count;
    RAISE NOTICE '- Admin Notifications: %', v_notif_count;
    RAISE NOTICE '- Master Admin Exists: %', v_master_exists;
    RAISE NOTICE '';
    
    -- Recommendations
    IF v_seller_count = 0 THEN
        RAISE NOTICE '🔴 PROBLEM: No seller data found!';
        RAISE NOTICE '';
        RAISE NOTICE 'Possible causes:';
        RAISE NOTICE '1. Registration form not submitting';
        RAISE NOTICE '2. RPC functions not being called';
        RAISE NOTICE '3. JavaScript errors in frontend';
        RAISE NOTICE '4. User not authenticated during registration';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Open browser console (F12)';
        RAISE NOTICE '2. Try registration again';
        RAISE NOTICE '3. Look for errors in console';
        RAISE NOTICE '4. Check Network tab for failed RPC calls';
        
    ELSIF v_pending_count = 0 AND v_seller_count > 0 THEN
        RAISE NOTICE '🟡 PROBLEM: Sellers exist but none are pending!';
        RAISE NOTICE '';
        RAISE NOTICE 'Check the status column in the results above.';
        RAISE NOTICE 'If status is not "pending", the complete_seller_registration function';
        RAISE NOTICE 'might not be setting the status correctly.';
        
    ELSIF v_pending_count > 0 AND v_notif_count = 0 THEN
        RAISE NOTICE '🟡 WARNING: Pending sellers exist but no notifications!';
        RAISE NOTICE '';
        RAISE NOTICE 'The trigger might not be firing properly.';
        RAISE NOTICE 'But sellers should still appear in admin panel.';
        
    ELSIF v_pending_count > 0 AND NOT v_master_exists THEN
        RAISE NOTICE '🟡 PROBLEM: Pending sellers exist but master admin account missing!';
        RAISE NOTICE '';
        RAISE NOTICE 'Create account with email: rf32191@gmail.com';
        RAISE NOTICE 'Then login and access /admin/dashboard';
        
    ELSIF v_pending_count > 0 AND v_master_exists THEN
        RAISE NOTICE '🟢 SUCCESS: Everything looks good!';
        RAISE NOTICE '';
        RAISE NOTICE 'Login as: rf32191@gmail.com';
        RAISE NOTICE 'Go to: /admin/dashboard';
        RAISE NOTICE 'Password: 321SnoopDog1994321!';
        RAISE NOTICE 'Click: "Pending Sellers" tab';
        RAISE NOTICE '';
        RAISE NOTICE 'You should see % pending seller(s)!', v_pending_count;
        
    ELSE
        RAISE NOTICE '🔴 UNKNOWN STATE';
        RAISE NOTICE 'Check the results above to diagnose the issue.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

