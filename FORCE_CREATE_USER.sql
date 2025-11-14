-- ============================================================================
-- FORCE CREATE USER - Guaranteed to create the user
-- ============================================================================

-- Step 1: Check what we have
SELECT 'BEFORE FIX - Auth user:' as info;
SELECT id, email FROM auth.users WHERE email = 'ryanrfermoselle@yahoo.com';

SELECT 'BEFORE FIX - Public user:' as info;
SELECT id, email FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';

-- Step 2: Delete ALL public users with this email
DELETE FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';

-- Step 3: Create user with auth ID
INSERT INTO public.users (
  id,
  email,
  username,
  purchased_tokens,
  won_tokens,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'ryanrfermoselle',
  300.00,
  0.00,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'ryanrfermoselle@yahoo.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  updated_at = NOW();

-- Step 4: Verify
SELECT 'AFTER FIX - User created:' as info;
SELECT id, email, username, purchased_tokens, won_tokens 
FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';

-- Step 5: Check if IDs match
SELECT 'ID MATCH CHECK:' as info;
SELECT 
  au.id as auth_id,
  pu.id as public_id,
  CASE WHEN au.id = pu.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'ryanrfermoselle@yahoo.com' OR pu.email = 'ryanrfermoselle@yahoo.com';

-- Success message
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM auth.users au
    JOIN public.users pu ON au.id = pu.id
    WHERE au.email = 'ryanrfermoselle@yahoo.com'
  ) THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ USER CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Clear browser cache and try logging in';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '❌ SOMETHING WENT WRONG';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User may not exist in auth.users';
  END IF;
END $$;


