-- ============================================
-- FIX NULL USER - CREATE MISSING USER RECORD
-- ============================================
-- Your auth works but user record doesn't exist
-- This will create it from your auth data
-- ============================================

-- Step 1: Check current auth data
SELECT 
    '🔍 YOUR AUTH DATA' as info,
    auth.uid() as your_user_id,
    auth.email() as your_auth_email;

-- Step 2: Check if you exist in users table
SELECT 
    '👤 CURRENT USERS TABLE STATUS' as info,
    COUNT(*) as user_exists,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO RECORD - NEEDS TO BE CREATED'
        ELSE '✅ RECORD EXISTS'
    END as status
FROM public.users
WHERE id = auth.uid();

-- Step 3: Get your auth.users data (Supabase Auth table)
SELECT 
    '📧 YOUR AUTH.USERS DATA' as info,
    id,
    email,
    raw_user_meta_data->>'username' as username,
    created_at
FROM auth.users
WHERE id = auth.uid();

-- Step 4: Insert your user record if it doesn't exist
INSERT INTO public.users (
    id,
    email,
    username,
    tokens,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        SPLIT_PART(au.email, '@', 1)  -- Use email prefix if no username
    ),
    300.00,  -- Starting tokens
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.id = auth.uid()
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 5: Verify the user was created/updated
SELECT 
    '✅ VERIFICATION' as info,
    id,
    email,
    username,
    tokens,
    created_at
FROM public.users
WHERE id = auth.uid();

-- Step 6: Now test admin access
DO $$
DECLARE
    v_user_email TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email
    FROM public.users
    WHERE id = auth.uid();
    
    -- Check if admin
    v_is_admin := LOWER(v_user_email) IN ('rf32191@gmail.com', 'rf32191@yahoo.com');
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ USER RECORD CHECK COMPLETE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Your User ID: %', auth.uid();
    RAISE NOTICE 'Your Email: %', v_user_email;
    RAISE NOTICE 'Admin Status: %', CASE WHEN v_is_admin THEN '✅ IS ADMIN' ELSE '❌ NOT ADMIN' END;
    RAISE NOTICE '==========================================';
    
    IF NOT v_is_admin THEN
        RAISE NOTICE '⚠️  YOUR EMAIL DOES NOT MATCH ADMIN EMAILS';
        RAISE NOTICE 'Expected: rf32191@gmail.com OR rf32191@yahoo.com';
        RAISE NOTICE 'Got: %', v_user_email;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 FIX: Update the email in auth.users or add your email to the whitelist';
    END IF;
END $$;

-- Step 7: Final summary
SELECT '
============================================
✅ USER RECORD FIX COMPLETE
============================================

WHAT WAS DONE:

1️⃣ Checked your auth data
2️⃣ Checked users table
3️⃣ Copied data from auth.users to public.users
4️⃣ Set starting tokens to 300
5️⃣ Verified the record was created
6️⃣ Tested admin access

🎯 WHAT TO DO NEXT:

Option A: If your email in auth.users is rf32191@yahoo.com
   → You should now have admin access! Refresh the page.

Option B: If your email is something else
   → We need to either:
      a) Update your auth.users email to rf32191@yahoo.com
      b) Add your actual email to the admin whitelist

Check the NOTICES above to see your actual email!

============================================
' as summary;

