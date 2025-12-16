-- ============================================
-- TEST: Direct Insert to user_phones
-- ============================================
-- This tests if we can insert into user_phones at all

-- First, show current state
SELECT 'Current user_phones table:' as info, COUNT(*) as rows FROM public.user_phones;

-- Try to insert a test phone directly
INSERT INTO public.user_phones (user_id, phone_number, verified, created_at)
VALUES (
  gen_random_uuid(), -- Fake user_id (will fail foreign key, that's expected)
  '+19998887777',
  true,
  now()
);

-- If above fails with "foreign key violation", that's GOOD! It means RLS allows inserts.
-- The issue is just linking to real users.

-- Let's try inserting with a real user_id from auth.users
-- First, show users:
SELECT 
  'Recent users' as info,
  id as user_id,
  email,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Now try inserting with a real user_id (copy one from above)
-- REPLACE the user_id below with a REAL user_id from the query above:
/*
INSERT INTO public.user_phones (user_id, phone_number, verified, created_at)
VALUES (
  'paste-real-user-id-here', -- Replace this
  '+15559998888',
  true,
  now()
);
*/

-- Check if it worked
SELECT 
  'After insert attempt:' as info,
  *
FROM public.user_phones
ORDER BY created_at DESC;

