-- ============================================================================
-- SIMPLE PHONE FIX - Add phone column with NO restrictions
-- ============================================================================
-- This adds a phone column that works exactly like the email column
-- Copy and paste this into Supabase SQL Editor and run
-- ============================================================================

-- Add phone column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Remove any unique constraint that might exist (we'll add it back properly)
DROP INDEX IF EXISTS idx_users_phone_unique;

-- Create unique index to prevent duplicate phone numbers
CREATE UNIQUE INDEX idx_users_phone_unique 
ON public.users (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Test that we can insert and read phone numbers
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_phone TEXT := '+15551234567';
  inserted_phone TEXT;
BEGIN
  -- Try to insert a test user with phone
  INSERT INTO public.users (id, username, email, phone, tokens)
  VALUES (
    test_id,
    'test_' || FLOOR(RANDOM() * 100000),
    'test_' || test_id || '@test.com',
    test_phone,
    1
  );
  
  -- Check if phone was saved
  SELECT phone INTO inserted_phone FROM public.users WHERE id = test_id;
  
  IF inserted_phone = test_phone THEN
    RAISE NOTICE '✅ SUCCESS! Phone storage is working!';
  ELSE
    RAISE NOTICE '❌ FAILED! Phone: % (expected: %)', COALESCE(inserted_phone, 'NULL'), test_phone;
  END IF;
  
  -- Clean up
  DELETE FROM public.users WHERE id = test_id;
END $$;

-- Show current status
DO $$
DECLARE
  total INTEGER;
  with_phone INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.users;
  SELECT COUNT(*) INTO with_phone FROM public.users WHERE phone IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total;
  RAISE NOTICE 'Users with phone numbers: %', with_phone;
  RAISE NOTICE 'Users without phone: %', total - with_phone;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phone column is ready!';
  RAISE NOTICE 'Next: Deploy your app and test registration';
END $$;

