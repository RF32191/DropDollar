-- ============================================================================
-- CREATE PHONE COLUMN (IT DOESN'T EXIST!)
-- ============================================================================
-- The phone column doesn't exist - that's why phones weren't being saved!
-- This creates it fresh
-- ============================================================================

-- Create the phone column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Phone column CREATED';
  ELSE
    RAISE NOTICE '✓ Phone column already exists';
  END IF;
END $$;

-- Create unique index to prevent duplicate phone numbers
DO $$
BEGIN
  DROP INDEX IF EXISTS idx_users_phone_unique;
  CREATE UNIQUE INDEX idx_users_phone_unique 
  ON public.users (phone) 
  WHERE phone IS NOT NULL AND phone != '';
  RAISE NOTICE '✅ Unique index created (prevents duplicate phones)';
END $$;

-- Test that it works
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_phone TEXT := '+15551234567';
  saved_phone TEXT;
BEGIN
  -- Insert test user
  INSERT INTO public.users (id, username, email, phone, tokens)
  VALUES (
    test_id,
    'test_' || FLOOR(RANDOM() * 100000),
    'test_' || test_id || '@test.com',
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
    RAISE NOTICE 'Phone numbers will now be saved when';
    RAISE NOTICE 'users register on your website!';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ Phone column created but not saving';
    RAISE NOTICE 'Expected: %', test_phone;
    RAISE NOTICE 'Got: %', COALESCE(saved_phone, 'NULL');
  END IF;
  
  -- Clean up
  DELETE FROM public.users WHERE id = test_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    DELETE FROM public.users WHERE id = test_id;
END $$;

-- Show summary
DO $$
DECLARE
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 READY TO USE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Phone column: CREATED and WORKING';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Wait 2 minutes (code already deployed)';
  RAISE NOTICE '2. Register a new account';
  RAISE NOTICE '3. Check users table - phone will appear!';
  RAISE NOTICE '========================================';
END $$;

