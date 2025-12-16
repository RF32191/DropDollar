-- ============================================
-- VERIFY: Phone Verification Data Exists
-- ============================================
-- Run this to confirm the data that the API will check

-- Step 1: Show all verified phones (these will be blocked)
SELECT 
  'Verified phones (will be blocked)' as info,
  phone,
  verified,
  created_at
FROM phone_verification_codes
WHERE verified = true
ORDER BY created_at DESC;

-- Step 2: Show total counts
SELECT 
  'Summary' as info,
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE verified = true) as verified_count,
  COUNT(*) FILTER (WHERE verified = false OR verified IS NULL) as unverified_count
FROM phone_verification_codes;

-- Step 3: Test matching logic (replace with YOUR phone number)
-- This simulates what the API does
SELECT 
  'Matching test' as info,
  phone,
  -- Extract last 7 digits
  right(regexp_replace(phone, '[^0-9]', '', 'g'), 7) as last_7_digits,
  -- Check if it matches 2278470 (your phone's last 7)
  right(regexp_replace(phone, '[^0-9]', '', 'g'), 7) = '2278470' as matches_your_phone,
  verified
FROM phone_verification_codes
WHERE verified = true;

-- Step 4: Specific test for your phone number
SELECT 
  'Does +17142278470 exist as verified?' as question,
  EXISTS (
    SELECT 1 
    FROM phone_verification_codes 
    WHERE verified = true 
    AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 7) = '2278470'
  ) as result;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Step 1: List of verified phones (should include your phone)
-- Step 2: Should show verified_count > 0
-- Step 3: Should show matches_your_phone = true for your phone
-- Step 4: Should show result = true
--
-- If all these show the expected results, the API will block your phone!

