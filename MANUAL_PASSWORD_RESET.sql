-- ========================================
-- MANUAL PASSWORD RESET VIA SUPABASE DASHBOARD
-- ========================================
-- Since email isn't sending, use this method instead:

-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to: Authentication → Users
-- 4. Find your email: ryanrfermoselle@yahoo.com
-- 5. Click the "..." menu next to your user
-- 6. Click "Reset Password" or "Send Password Recovery"
-- 7. You can manually set a new password for this user

-- ========================================
-- ALTERNATIVE: Check if user exists
-- ========================================
-- Run this to confirm your account exists:

-- Check auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    CASE 
        WHEN encrypted_password IS NOT NULL THEN '✅ Has Password'
        ELSE '❌ No Password Set'
    END as password_status
FROM auth.users 
WHERE email IN (
    'ryanrfermoselle@yahoo.com',
    'ryanfermoselle@yahoo.com',
    'rf32191@gmail.com',
    'rf321919@gmail.com'
);

-- Check public.users (your profile)
SELECT 
    id,
    email,
    username,
    purchased_tokens,
    won_tokens,
    created_at
FROM public.users 
WHERE email IN (
    'ryanrfermoselle@yahoo.com',
    'ryanfermoselle@yahoo.com',
    'rf32191@gmail.com',
    'rf321919@gmail.com'
);

-- ========================================
-- DIAGNOSE EMAIL ISSUE
-- ========================================
-- If you want to check why emails aren't sending:

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '📧 EMAIL CONFIGURATION CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Supabase uses its own email system for auth emails.';
    RAISE NOTICE 'This is separate from your Resend API for game notifications.';
    RAISE NOTICE '';
    RAISE NOTICE 'TO FIX EMAIL ISSUES:';
    RAISE NOTICE '1. Go to Supabase Dashboard → Authentication → Email Templates';
    RAISE NOTICE '2. Check SMTP Settings';
    RAISE NOTICE '3. Enable Custom SMTP using Resend:';
    RAISE NOTICE '   - Host: smtp.resend.com';
    RAISE NOTICE '   - Port: 587';
    RAISE NOTICE '   - Username: resend';
    RAISE NOTICE '   - Password: YOUR_RESEND_API_KEY';
    RAISE NOTICE '';
    RAISE NOTICE 'OR USE OPTION 2:';
    RAISE NOTICE '1. Go to Supabase Dashboard → Authentication → Users';
    RAISE NOTICE '2. Find your user';
    RAISE NOTICE '3. Click "..." menu → "Reset Password"';
    RAISE NOTICE '4. Manually set a new password';
    RAISE NOTICE '========================================';
END $$;

