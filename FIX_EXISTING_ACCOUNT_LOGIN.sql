-- ========================================
-- FIX EXISTING ACCOUNT LOGIN ISSUE
-- ========================================
-- This script checks if an account exists in auth.users vs public.users
-- and provides solutions to fix login issues

-- STEP 1: Check your account status
-- Replace 'YOUR_EMAIL_HERE' with your actual email

DO $$
DECLARE
    user_email TEXT := 'ryanrfermoselle@yahoo.com'; -- <<< CHANGE THIS TO YOUR EMAIL
    auth_user_id UUID;
    auth_email_confirmed BOOLEAN;
    auth_created_at TIMESTAMP;
    public_user_id UUID;
    public_username TEXT;
    public_tokens NUMERIC;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 CHECKING ACCOUNT STATUS FOR: %', user_email;
    RAISE NOTICE '========================================';

    -- Check in auth.users (Supabase Authentication)
    SELECT id, email_confirmed_at IS NOT NULL, created_at 
    INTO auth_user_id, auth_email_confirmed, auth_created_at
    FROM auth.users 
    WHERE email = user_email;

    IF auth_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ AUTH ACCOUNT EXISTS';
        RAISE NOTICE '   - User ID: %', auth_user_id;
        RAISE NOTICE '   - Email Confirmed: %', auth_email_confirmed;
        RAISE NOTICE '   - Created: %', auth_created_at;
    ELSE
        RAISE NOTICE '❌ NO AUTH ACCOUNT FOUND';
        RAISE NOTICE '   - This means you need to register, not reset password';
    END IF;

    -- Check in public.users (Your Application Profile)
    SELECT id, username, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)
    INTO public_user_id, public_username, public_tokens
    FROM public.users 
    WHERE email = user_email;

    IF public_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ PROFILE EXISTS';
        RAISE NOTICE '   - Profile ID: %', public_user_id;
        RAISE NOTICE '   - Username: %', public_username;
        RAISE NOTICE '   - Total Tokens: %', public_tokens;
    ELSE
        RAISE NOTICE '❌ NO PROFILE FOUND';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSIS:';
    
    IF auth_user_id IS NOT NULL AND public_user_id IS NOT NULL THEN
        RAISE NOTICE '🎯 SOLUTION: PASSWORD RESET';
        RAISE NOTICE '   Your account exists in both systems.';
        RAISE NOTICE '   You just need to reset your password.';
        RAISE NOTICE '';
        RAISE NOTICE '   INSTRUCTIONS:';
        RAISE NOTICE '   1. Go to: https://www.drop-dollar.com/auth/forgot-password';
        RAISE NOTICE '   2. Enter your email: %', user_email;
        RAISE NOTICE '   3. Check your email for reset link';
        RAISE NOTICE '   4. Set a new password';
        RAISE NOTICE '   5. Login with new password';
        
    ELSIF auth_user_id IS NULL AND public_user_id IS NOT NULL THEN
        RAISE NOTICE '🔧 SOLUTION: LINK PROFILE TO AUTH';
        RAISE NOTICE '   Your profile exists but has no auth account.';
        RAISE NOTICE '   This is the UUID mismatch issue.';
        RAISE NOTICE '';
        RAISE NOTICE '   RUN THE FIX BELOW (scroll down in this script)';
        
    ELSIF auth_user_id IS NOT NULL AND public_user_id IS NULL THEN
        RAISE NOTICE '🔧 SOLUTION: CREATE PROFILE';
        RAISE NOTICE '   Your auth exists but profile is missing.';
        RAISE NOTICE '   Try logging in once - it should auto-create.';
        
    ELSE
        RAISE NOTICE '❌ SOLUTION: REGISTER NEW ACCOUNT';
        RAISE NOTICE '   Neither auth nor profile exists.';
        RAISE NOTICE '   Go to /auth/register and create account.';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;


-- ========================================
-- OPTION 2: FIX UUID MISMATCH (if profile exists but no auth)
-- ========================================
-- This happens when the old fake login created a profile without proper auth
-- WARNING: Only run this if the diagnosis above says "LINK PROFILE TO AUTH"

/*
DO $$
DECLARE
    user_email TEXT := 'ryanrfermoselle@yahoo.com'; -- <<< CHANGE THIS
    user_username TEXT := 'YourUsername'; -- <<< CHANGE THIS TO YOUR USERNAME
    user_password TEXT := 'YourNewPassword123!'; -- <<< CHANGE THIS TO YOUR NEW PASSWORD
    v_auth_user_id UUID;
    v_old_profile_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING UUID MISMATCH FOR: %', user_email;
    RAISE NOTICE '========================================';

    -- Get the old profile ID
    SELECT id INTO v_old_profile_id FROM public.users WHERE email = user_email;
    
    IF v_old_profile_id IS NULL THEN
        RAISE NOTICE '❌ ERROR: No profile found for this email';
        RETURN;
    END IF;

    -- Check if this is actually a UUID or a fake timestamp ID
    IF length(v_old_profile_id::TEXT) < 30 THEN
        RAISE NOTICE '⚠️  Old profile has invalid ID: %', v_old_profile_id;
        RAISE NOTICE '   This is from the fake login system.';
        
        -- Create new auth user (this would normally be done via API)
        -- NOTE: You cannot create auth users directly via SQL in Supabase
        -- You MUST use the Supabase Auth API or dashboard
        
        RAISE NOTICE '';
        RAISE NOTICE '🚨 MANUAL FIX REQUIRED:';
        RAISE NOTICE '   1. Go to Supabase Dashboard → Authentication → Users';
        RAISE NOTICE '   2. Click "Invite User" or "Add User"';
        RAISE NOTICE '   3. Enter email: %', user_email;
        RAISE NOTICE '   4. Set a password';
        RAISE NOTICE '   5. Copy the new user ID';
        RAISE NOTICE '   6. Update public.users: UPDATE users SET id = ''<new-uuid>'' WHERE email = ''%'';', user_email;
        RAISE NOTICE '';
        RAISE NOTICE '   OR use the password reset flow at /auth/forgot-password';
    ELSE
        RAISE NOTICE '✅ Profile has valid UUID: %', v_old_profile_id;
        RAISE NOTICE '   Try password reset at: https://www.drop-dollar.com/auth/forgot-password';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;
*/


-- ========================================
-- OPTION 3: DELETE OLD FAKE PROFILE AND START FRESH
-- ========================================
-- WARNING: This will delete your old profile data!
-- Only use if you don't care about losing existing data

/*
DO $$
DECLARE
    user_email TEXT := 'ryanrfermoselle@yahoo.com'; -- <<< CHANGE THIS
    v_deleted_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🗑️  DELETING OLD PROFILE FOR: %', user_email;
    RAISE NOTICE '========================================';

    DELETE FROM public.users 
    WHERE email = user_email 
    RETURNING id INTO v_deleted_id;
    
    IF v_deleted_id IS NOT NULL THEN
        RAISE NOTICE '✅ Deleted old profile: %', v_deleted_id;
        RAISE NOTICE '';
        RAISE NOTICE 'NOW YOU CAN:';
        RAISE NOTICE '   1. Go to: https://www.drop-dollar.com/auth/register';
        RAISE NOTICE '   2. Register with email: %', user_email;
        RAISE NOTICE '   3. Create a new password';
        RAISE NOTICE '   4. Login successfully!';
    ELSE
        RAISE NOTICE '❌ No profile found to delete';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;
*/


-- ========================================
-- QUICK REFERENCE: All emails to check
-- ========================================
-- Run this to check all your accounts at once

SELECT 
    u.email,
    u.id as profile_id,
    u.username,
    COALESCE(u.purchased_tokens, 0) as purchased,
    COALESCE(u.won_tokens, 0) as won,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = u.email) THEN '✅ Has Auth'
        ELSE '❌ No Auth'
    END as auth_status,
    u.created_at
FROM public.users u
WHERE u.email IN (
    'ryanrfermoselle@yahoo.com',
    'ryanfermoselle@yahoo.com',
    'rf32191@gmail.com',
    'rf321919@gmail.com'
)
ORDER BY u.email;

