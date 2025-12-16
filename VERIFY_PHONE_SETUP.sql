-- ============================================================================
-- VERIFY PHONE SETUP AND SHOW WHAT'S WRONG
-- ============================================================================
-- Run this to see what's blocking phone numbers from being saved
-- ============================================================================

-- Check 1: Does user_phone column exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'user_phone'
  ) THEN
    RAISE NOTICE '✅ user_phone column EXISTS';
  ELSE
    RAISE NOTICE '❌ user_phone column DOES NOT EXIST';
    RAISE NOTICE '   → Run CREATE_NEW_PHONE_COLUMN.sql first!';
  END IF;
END $$;

-- Check 2: Show all columns in users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

RAISE NOTICE 'ℹ️  All columns shown above - look for user_phone';

-- Check 3: Show last 5 users and their phone data
SELECT 
  id,
  username,
  email,
  user_phone,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

RAISE NOTICE 'ℹ️  Last 5 users shown above - check user_phone column';

-- Check 4: Count how many users have phone numbers
DO $$
DECLARE
  total INTEGER;
  with_user_phone INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM users;
  SELECT COUNT(*) INTO with_user_phone FROM users WHERE user_phone IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 CURRENT STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total;
  RAISE NOTICE 'Users with phone in user_phone column: %', with_user_phone;
  RAISE NOTICE 'Users without phone: %', total - with_user_phone;
  RAISE NOTICE '========================================';
END $$;

-- Check 5: Can we insert a user with user_phone?
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  success BOOLEAN := FALSE;
BEGIN
  BEGIN
    INSERT INTO users (id, username, email, user_phone, tokens)
    VALUES (
      test_id,
      'test_verify_' || FLOOR(RANDOM() * 100000),
      'verify_' || test_id || '@test.com',
      '+15559876543',
      1
    );
    success := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ CANNOT INSERT: %', SQLERRM;
      success := FALSE;
  END;
  
  IF success THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CAN insert users with user_phone!';
    RAISE NOTICE '   The column is working correctly.';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  If phone numbers still not appearing:';
    RAISE NOTICE '   1. Check Vercel deployment status';
    RAISE NOTICE '   2. Check Vercel logs for errors';
    RAISE NOTICE '   3. Make sure you waited 2+ minutes after deployment';
    RAISE NOTICE '   4. Try registering with a DIFFERENT phone number';
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
  END IF;
END $$;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '🔍 DIAGNOSIS COMPLETE';
RAISE NOTICE '========================================';

