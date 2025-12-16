-- ============================================
-- DIAGNOSE PHONE NUMBER ISSUE
-- ============================================
-- Run this to see EXACTLY what's happening

-- Step 1: Check if function exists
SELECT 
  'Function check' as test,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'check_phone_exists';

-- Step 2: Check what phones are actually in the table
SELECT 
  'Current phones in database' as info,
  phone_number,
  length(phone_number) as length,
  substring(phone_number, 1, 3) as prefix,
  user_id,
  verified,
  created_at
FROM public.user_phones
ORDER BY created_at DESC;

-- Step 3: Test the function with a phone you KNOW exists
-- REPLACE THIS with a phone number you just registered:
SELECT 
  'Testing function with existing phone' as test,
  public.check_phone_exists('+15551234567') as result;
-- Change +15551234567 to YOUR actual phone number

-- Step 4: Test with different formats
-- If you registered with phone 5551234567, test all these:
SELECT 
  'Format tests' as test,
  public.check_phone_exists('+15551234567') as with_plus,
  public.check_phone_exists('15551234567') as without_plus,
  public.check_phone_exists('5551234567') as just_number;

-- Step 5: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_phones';

-- Step 6: Direct query test (what API should see)
SELECT 
  'Direct query test' as test,
  COUNT(*) as found_phones
FROM public.user_phones
WHERE phone_number = '+15551234567'; -- Change to YOUR phone

-- Step 7: Check if service role can read
-- This simulates what the API does
SELECT 
  'Service role simulation' as test,
  id,
  phone_number,
  user_id
FROM public.user_phones
LIMIT 5;

-- ============================================
-- WHAT TO LOOK FOR:
-- ============================================
-- 1. Function exists? (Step 1 should return 1 row)
-- 2. Phones in table? (Step 2 should show your phones)
-- 3. Function returns TRUE for existing phone? (Step 3)
-- 4. Which format works? (Step 4)
-- 5. Policies look correct? (Step 5)
-- 6. Direct query finds phone? (Step 6)

