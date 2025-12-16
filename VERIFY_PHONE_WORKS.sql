-- ============================================
-- VERIFY PHONE SYSTEM WORKS
-- ============================================
-- Run this AFTER running COMPLETE_PHONE_FIX.sql

-- Step 1: Show all phones currently registered
SELECT 
  'All registered phones' as info,
  phone_number,
  user_id,
  verified,
  created_at
FROM public.user_phones
ORDER BY created_at DESC;

-- Step 2: Test if functions exist and work
SELECT 
  'Function test' as test,
  public.check_phone_exists('+15551234567') as test_exact,
  public.check_phone_exists('5551234567') as test_7_digits,
  public.check_phone_exists('15551234567') as test_11_digits;

-- Step 3: If you have a phone number you just registered, test it here
-- REPLACE +15551234567 with YOUR actual phone number:
SELECT 
  'Testing YOUR phone' as test,
  public.check_phone_exists('+15551234567') as with_plus_1,
  public.check_phone_exists('5551234567') as just_7_digits;

-- Step 4: Show function signatures
SELECT 
  proname as function_name,
  prosecdef as bypasses_rls,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('check_phone_exists', 'save_user_phone');

-- ============================================
-- WHAT YOU SHOULD SEE:
-- ============================================
-- Step 1: List of all phones (or empty if none registered yet)
-- Step 2: All should be 'false' if phone doesn't exist, 'true' if it does
-- Step 3: Should be 'true' for YOUR phone if you registered
-- Step 4: Both functions should show bypasses_rls = true

