-- ============================================
-- DEBUG ADMIN ACCESS ISSUE
-- ============================================
-- Check what's causing the unauthorized error
-- ============================================

-- Step 1: Check current user authentication
SELECT 
    '🔍 CURRENT USER CHECK' as check_type,
    auth.uid() as current_user_id,
    auth.email() as current_auth_email;

-- Step 2: Check if user exists in users table
SELECT 
    '👤 USER TABLE CHECK' as check_type,
    id as user_id,
    email,
    username,
    created_at
FROM public.users
WHERE id = auth.uid();

-- Step 3: Check if email matches admin requirements
SELECT 
    '✅ ADMIN EMAIL MATCH CHECK' as check_type,
    id as user_id,
    email,
    CASE 
        WHEN email IN ('rf32191@gmail.com', 'rf32191@yahoo.com') THEN '✅ IS ADMIN'
        ELSE '❌ NOT ADMIN'
    END as admin_status
FROM public.users
WHERE id = auth.uid();

-- Step 4: Check all users with similar emails (case-insensitive)
SELECT 
    '🔎 SIMILAR EMAILS CHECK' as check_type,
    id,
    email,
    username,
    CASE 
        WHEN LOWER(email) LIKE '%rf32191%' THEN '✅ MATCH'
        ELSE '❌ NO MATCH'
    END as email_match
FROM public.users
WHERE LOWER(email) LIKE '%rf32191%'
ORDER BY created_at DESC;

-- Step 5: Test the admin function directly
DO $$
BEGIN
    -- Try to call the function and catch any errors
    BEGIN
        PERFORM public.admin_get_all_listings('all');
        RAISE NOTICE '✅ Function call SUCCEEDED';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Function call FAILED: %', SQLERRM;
    END;
END $$;

-- Step 6: Show final diagnosis
SELECT '
============================================
🔍 ADMIN ACCESS DIAGNOSTIC COMPLETE
============================================

PLEASE CHECK THE RESULTS ABOVE:

1️⃣ Current User Check
   - Shows your current auth.uid() and auth.email()
   
2️⃣ User Table Check
   - Shows if your user exists in users table
   
3️⃣ Admin Email Match Check
   - Shows if your email matches admin requirements
   
4️⃣ Similar Emails Check
   - Shows all accounts with rf32191 in email
   
5️⃣ Function Test
   - Tests if admin_get_all_listings works

🎯 LIKELY ISSUES:

Issue A: Email in users table is different from auth email
   → Solution: Update users table email

Issue B: User not in users table at all
   → Solution: Insert user record

Issue C: Email has different case (e.g., RF32191@yahoo.com)
   → Solution: Update function to use LOWER()

Issue D: Function not created yet
   → Solution: Run ADD_ADMIN_LISTING_MANAGEMENT.sql

============================================
' as diagnosis;

