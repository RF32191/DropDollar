-- ============================================================================
-- CREATE BRAND NEW PHONE COLUMN
-- ============================================================================
-- Creates a NEW column called "user_phone" (not "phone")
-- This bypasses any issues with the old phone column
-- ============================================================================

-- Step 1: Create the new column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Step 2: Create unique index on new column
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_phone_unique 
ON public.users (user_phone) 
WHERE user_phone IS NOT NULL AND user_phone != '';

-- Step 3: Test the new column
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_phone TEXT := '+15551234567';
  inserted_phone TEXT;
BEGIN
  -- Insert test user with phone in new column
  INSERT INTO public.users (id, username, email, user_phone, tokens)
  VALUES (
    test_id,
    'test_' || FLOOR(RANDOM() * 100000),
    'test_' || test_id || '@test.com',
    test_phone,
    1
  );
  
  -- Check if it was saved
  SELECT user_phone INTO inserted_phone FROM public.users WHERE id = test_id;
  
  IF inserted_phone = test_phone THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ✅ ✅ SUCCESS! ✅ ✅ ✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New column "user_phone" is WORKING!';
    RAISE NOTICE 'Phone saved: %', inserted_phone;
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ FAILED - Phone: %', COALESCE(inserted_phone, 'NULL');
  END IF;
  
  -- Clean up
  DELETE FROM public.users WHERE id = test_id;
END $$;

-- Step 4: Show summary
DO $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DATABASE STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total;
  RAISE NOTICE 'New column: user_phone';
  RAISE NOTICE 'Status: Ready for use';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Code will be updated to use "user_phone"';
  RAISE NOTICE '2. Deploy and test registration';
  RAISE NOTICE '3. Check user_phone column in users table';
  RAISE NOTICE '========================================';
END $$;

