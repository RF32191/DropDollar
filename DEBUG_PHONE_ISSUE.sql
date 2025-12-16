-- ============================================
-- DEBUG: Check Phone Number Registration Issue
-- ============================================
-- Run these queries to see what's happening

-- Step 1: Check if user_phones table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_phones';

-- Step 2: Check all phone numbers currently in the table
SELECT 
  id,
  user_id,
  phone_number,
  verified,
  created_at
FROM public.user_phones
ORDER BY created_at DESC;

-- Step 3: Check what format phones are stored in
SELECT 
  phone_number,
  length(phone_number) as length,
  substring(phone_number, 1, 2) as prefix,
  created_at
FROM public.user_phones
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check recent users and their associated phones
SELECT 
  u.id as user_id,
  u.username,
  u.email,
  up.phone_number,
  up.verified,
  u.created_at
FROM auth.users u
LEFT JOIN public.user_phones up ON up.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- Step 5: Check if unique constraint exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_phones';

-- Step 6: Try a test insert (replace with YOUR actual phone)
-- UNCOMMENT AND MODIFY THIS LINE:
-- SELECT * FROM public.user_phones WHERE phone_number = '+15551234567';

-- ============================================
-- WHAT TO LOOK FOR:
-- ============================================
-- 1. Does user_phones table exist? (Step 1 should return 1 row)
-- 2. Are there any phones in the table? (Step 2)
-- 3. What format are they in? +1XXXXXXXXXX or something else? (Step 3)
-- 4. Are users linked to phones? (Step 4 - should NOT have NULL phone_number)
-- 5. Does unique constraint exist? (Step 5 - should see user_phones_phone_number_unique)

