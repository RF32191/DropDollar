-- SIMPLE FIX - Just ensure your user exists in public.users with correct ID

-- Step 1: Check current state
SELECT '=== CHECKING IDs ===' as step;
SELECT id, email FROM auth.users WHERE email = 'rf32191@gmail.com';
SELECT id, email FROM public.users WHERE email = 'rf32191@gmail.com';

-- Step 2: Delete and recreate with correct ID
DELETE FROM public.users WHERE email = 'rf32191@gmail.com';

INSERT INTO public.users (id, email, username, created_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'username', 'ryan') as username,
    created_at
FROM auth.users 
WHERE email = 'rf32191@gmail.com';

-- Step 3: Verify
SELECT '=== VERIFICATION ===' as step;
SELECT 
    (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com') as auth_id,
    (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com') as public_id,
    CASE 
        WHEN (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com') = 
             (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com')
        THEN '✅ IDs MATCH - Ready to create listings!'
        ELSE '❌ IDs DO NOT MATCH'
    END as status;

