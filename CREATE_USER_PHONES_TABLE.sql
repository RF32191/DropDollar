-- ============================================================================
-- CREATE SEPARATE USER_PHONES TABLE
-- ============================================================================
-- Creates a dedicated table for phone numbers (like wallets, transactions, etc.)
-- This is cleaner than adding to users table
-- ============================================================================

-- Create user_phones table
CREATE TABLE IF NOT EXISTS public.user_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verified BOOLEAN DEFAULT TRUE,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on phone_number (prevents duplicate phones)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phones_phone_unique 
ON public.user_phones (phone_number);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_phones_user_id 
ON public.user_phones (user_id);

-- Enable RLS
ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own phone
DROP POLICY IF EXISTS "Users can view own phone" ON public.user_phones;
CREATE POLICY "Users can view own phone"
ON public.user_phones
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON public.user_phones;
CREATE POLICY "Service role full access"
ON public.user_phones
USING (true)
WITH CHECK (true);

-- Test the table
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_phone_id UUID;
  test_phone TEXT := '+15551234567';
  saved_phone TEXT;
BEGIN
  -- Insert test user
  INSERT INTO public.users (id, username, email, tokens)
  VALUES (
    test_user_id,
    'phonetest_' || FLOOR(RANDOM() * 100000),
    'phonetest_' || test_user_id || '@test.com',
    1
  );
  
  -- Insert phone for test user
  INSERT INTO public.user_phones (user_id, phone_number)
  VALUES (test_user_id, test_phone)
  RETURNING id INTO test_phone_id;
  
  -- Check if phone was saved
  SELECT phone_number INTO saved_phone 
  FROM public.user_phones 
  WHERE user_id = test_user_id;
  
  IF saved_phone = test_phone THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ✅ ✅ SUCCESS! ✅ ✅ ✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'user_phones table is WORKING!';
    RAISE NOTICE 'Test phone saved: %', saved_phone;
    RAISE NOTICE '';
    RAISE NOTICE 'Phone numbers will be stored in';
    RAISE NOTICE 'separate user_phones table!';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ Test failed';
    RAISE NOTICE 'Expected: %', test_phone;
    RAISE NOTICE 'Got: %', COALESCE(saved_phone, 'NULL');
  END IF;
  
  -- Clean up
  DELETE FROM public.users WHERE id = test_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    DELETE FROM public.users WHERE id = test_user_id;
END $$;

-- Show summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 TABLE CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table: user_phones';
  RAISE NOTICE 'Columns: id, user_id, phone_number, verified';
  RAISE NOTICE 'Unique constraint: phone_number';
  RAISE NOTICE '';
  RAISE NOTICE 'This works just like your wallet tables!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Code will be updated to use this table';
  RAISE NOTICE '========================================';
END $$;

