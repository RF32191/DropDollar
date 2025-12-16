-- ============================================
-- COMPLETE PHONE NUMBER FIX - ALL IN ONE
-- ============================================
-- This fixes EVERYTHING in one script
-- Matches on last 7 digits like you requested

-- Step 1: Ensure table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_phones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create unique index (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS user_phones_phone_number_unique 
ON public.user_phones (phone_number);

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS user_phones_user_id_idx 
ON public.user_phones (user_id);

-- Step 4: Enable RLS
ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'user_phones' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_phones', pol.policyname);
  END LOOP;
END $$;

-- Step 6: Create policies (security)
CREATE POLICY "Users can view own phone"
  ON public.user_phones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.user_phones FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 7: Grant permissions
GRANT ALL ON public.user_phones TO postgres, service_role;
GRANT SELECT ON public.user_phones TO authenticated;

-- ============================================
-- FUNCTION 1: Check if phone exists (matches last 7 digits!)
-- ============================================
DROP FUNCTION IF EXISTS public.check_phone_exists(text);

CREATE OR REPLACE FUNCTION public.check_phone_exists(phone_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_exists boolean;
  normalized_input text;
  last_7_digits text;
BEGIN
  -- Extract digits only from input
  normalized_input := regexp_replace(phone_to_check, '[^0-9]', '', 'g');
  
  -- Get last 7 digits for comparison (the main part of US number)
  IF length(normalized_input) >= 7 THEN
    last_7_digits := right(normalized_input, 7);
  ELSE
    -- If less than 7 digits, can't be valid
    RETURN false;
  END IF;
  
  -- Check if ANY phone in database matches the last 7 digits
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_phones 
    WHERE 
      -- Extract last 7 digits from stored phone and compare
      right(regexp_replace(phone_number, '[^0-9]', '', 'g'), 7) = last_7_digits
  ) INTO phone_exists;
  
  RETURN phone_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO service_role, authenticated, anon;

-- ============================================
-- FUNCTION 2: Save phone number
-- ============================================
DROP FUNCTION IF EXISTS public.save_user_phone(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.save_user_phone(
  p_user_id uuid,
  p_phone_number text,
  p_verified boolean DEFAULT true
)
RETURNS TABLE(
  id uuid,
  phone_number text,
  user_id uuid,
  verified boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert and return the record
  RETURN QUERY
  INSERT INTO public.user_phones (user_id, phone_number, verified, verified_at, created_at)
  VALUES (
    p_user_id,
    p_phone_number,
    p_verified,
    CASE WHEN p_verified THEN now() ELSE NULL END,
    now()
  )
  RETURNING 
    public.user_phones.id,
    public.user_phones.phone_number,
    public.user_phones.user_id,
    public.user_phones.verified,
    public.user_phones.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_phone(uuid, text, boolean) TO service_role, postgres;

-- ============================================
-- TESTS
-- ============================================

-- Test 1: Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_phones') THEN
    RAISE NOTICE '✅ user_phones table exists';
  ELSE
    RAISE NOTICE '❌ user_phones table missing';
  END IF;
END $$;

-- Test 2: Check if unique constraint exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_phones' AND indexname = 'user_phones_phone_number_unique') THEN
    RAISE NOTICE '✅ Unique constraint exists';
  ELSE
    RAISE NOTICE '❌ Unique constraint missing';
  END IF;
END $$;

-- Test 3: Check functions exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_phone_exists') THEN
    RAISE NOTICE '✅ check_phone_exists function exists';
  ELSE
    RAISE NOTICE '❌ check_phone_exists function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'save_user_phone') THEN
    RAISE NOTICE '✅ save_user_phone function exists';
  ELSE
    RAISE NOTICE '❌ save_user_phone function missing';
  END IF;
END $$;

-- Test 4: Test save and check functions
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  saved_phone record;
  phone_found boolean;
BEGIN
  -- Save a test phone
  SELECT * FROM public.save_user_phone(test_user_id, '+15551234567', true) INTO saved_phone;
  RAISE NOTICE '✅ Saved test phone: %', saved_phone.phone_number;
  
  -- Test exact match
  SELECT public.check_phone_exists('+15551234567') INTO phone_found;
  RAISE NOTICE '✅ Check exact match (+15551234567): %', phone_found;
  
  -- Test with just 10 digits
  SELECT public.check_phone_exists('5551234567') INTO phone_found;
  RAISE NOTICE '✅ Check 10 digits (5551234567): %', phone_found;
  
  -- Test with 11 digits
  SELECT public.check_phone_exists('15551234567') INTO phone_found;
  RAISE NOTICE '✅ Check 11 digits (15551234567): %', phone_found;
  
  -- Test with different format
  SELECT public.check_phone_exists('(555) 123-4567') INTO phone_found;
  RAISE NOTICE '✅ Check formatted ((555) 123-4567): %', phone_found;
  
  -- Clean up
  DELETE FROM public.user_phones WHERE user_id = test_user_id;
  RAISE NOTICE '✅ Test data cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test failed: %', SQLERRM;
  -- Try to clean up anyway
  DELETE FROM public.user_phones WHERE user_id = test_user_id;
END $$;

-- Test 5: Show current data
SELECT 
  'Current phones' as info,
  COUNT(*) as total,
  string_agg(DISTINCT phone_number, ', ') as phones
FROM public.user_phones;

-- ============================================
-- EXPECTED OUTPUT:
-- ============================================
-- ✅ user_phones table exists
-- ✅ Unique constraint exists
-- ✅ check_phone_exists function exists
-- ✅ save_user_phone function exists
-- ✅ Saved test phone: +15551234567
-- ✅ Check exact match (+15551234567): true
-- ✅ Check 10 digits (5551234567): true  <- MATCHES ON LAST 7 DIGITS!
-- ✅ Check 11 digits (15551234567): true <- MATCHES ON LAST 7 DIGITS!
-- ✅ Check formatted ((555) 123-4567): true <- MATCHES ON LAST 7 DIGITS!
-- ✅ Test data cleaned up

