-- ============================================================================
-- DELETE OLD PHONE COLUMN AND CREATE A FRESH ONE
-- ============================================================================
-- This completely removes the old phone column and creates a new clean one
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop the old phone column completely (removes all restrictions/issues)
DO $$
BEGIN
  -- Drop the column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users DROP COLUMN phone CASCADE;
    RAISE NOTICE '🗑️  Deleted old phone column';
  ELSE
    RAISE NOTICE '✓ Phone column did not exist';
  END IF;
END $$;

-- Step 2: Create a brand new phone column (clean slate)
DO $$
BEGIN
  ALTER TABLE public.users ADD COLUMN phone TEXT;
  RAISE NOTICE '✅ Created new phone column';
END $$;

-- Step 3: Create unique index to prevent duplicate phone numbers
DO $$
BEGIN
  DROP INDEX IF EXISTS idx_users_phone_unique;
  CREATE UNIQUE INDEX idx_users_phone_unique 
  ON public.users (phone) 
  WHERE phone IS NOT NULL AND phone != '';
  RAISE NOTICE '✅ Created unique index on phone';
END $$;

-- Step 4: Test that the new column works
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_phone TEXT := '+15551234567';
  saved_phone TEXT;
BEGIN
  -- Try to insert a test user
  INSERT INTO public.users (id, username, email, phone, tokens)
  VALUES (
    test_id,
    'phonetest_' || FLOOR(RANDOM() * 100000),
    'phonetest_' || test_id || '@test.com',
    test_phone,
    1
  );
  
  -- Check if phone was saved
  SELECT phone INTO saved_phone FROM public.users WHERE id = test_id;
  
  IF saved_phone = test_phone THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ✅ ✅ SUCCESS! ✅ ✅ ✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phone column is WORKING!';
    RAISE NOTICE 'Test phone saved: %', saved_phone;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now register users and phone';
    RAISE NOTICE 'numbers will be saved to this column!';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ FAILED';
    RAISE NOTICE 'Expected: %', test_phone;
    RAISE NOTICE 'Got: %', COALESCE(saved_phone, 'NULL');
  END IF;
  
  -- Clean up test user
  DELETE FROM public.users WHERE id = test_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    DELETE FROM public.users WHERE id = test_id;
END $$;

-- Step 5: Show current status
DO $$
DECLARE
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DATABASE STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Phone column: FRESH and READY';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy your app (wait 2 minutes)';
  RAISE NOTICE '2. Register a new account';
  RAISE NOTICE '3. Check users table - phone should appear!';
  RAISE NOTICE '========================================';
END $$;

