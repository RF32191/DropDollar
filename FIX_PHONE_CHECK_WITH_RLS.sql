-- ============================================
-- BULLETPROOF PHONE DUPLICATE CHECK
-- ============================================
-- This creates a secure database function that bypasses RLS
-- for checking phone duplicates while maintaining security

-- Step 1: Ensure user_phones table exists
CREATE TABLE IF NOT EXISTS public.user_phones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create unique index (prevents duplicates at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS user_phones_phone_number_unique 
ON public.user_phones (phone_number);

-- Step 3: Create index on user_id
CREATE INDEX IF NOT EXISTS user_phones_user_id_idx 
ON public.user_phones (user_id);

-- Step 4: Enable RLS (security)
ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop old policies
DROP POLICY IF EXISTS "Users can view own phone" ON public.user_phones;
DROP POLICY IF EXISTS "Service role can manage phones" ON public.user_phones;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_phones;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_phones;

-- Step 6: Create NEW policies (proper security)
-- Users can read their own phone
CREATE POLICY "Users can view own phone"
  ON public.user_phones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for API)
CREATE POLICY "Service role full access"
  ON public.user_phones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon users cannot access (security)
-- (No policy = no access for anon)

-- Step 7: Grant permissions
GRANT ALL ON public.user_phones TO postgres;
GRANT ALL ON public.user_phones TO service_role;
GRANT SELECT ON public.user_phones TO authenticated;

-- ============================================
-- CRITICAL: Database Function for Phone Check
-- ============================================
-- This function runs with SECURITY DEFINER, bypassing RLS
-- It's safe because it only returns true/false, not actual data

CREATE OR REPLACE FUNCTION public.check_phone_exists(phone_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it bypass RLS
SET search_path = public
AS $$
DECLARE
  phone_exists boolean;
BEGIN
  -- Check if phone exists in user_phones table
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_phones 
    WHERE phone_number = phone_to_check
  ) INTO phone_exists;
  
  RETURN phone_exists;
END;
$$;

-- Grant execute to service_role and authenticated
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO anon;

-- ============================================
-- ADDITIONAL: Function to Save Phone
-- ============================================
-- This ensures phone is saved even if RLS is tricky

CREATE OR REPLACE FUNCTION public.save_user_phone(
  p_user_id uuid,
  p_phone_number text,
  p_verified boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  phone_id uuid;
BEGIN
  -- Insert phone and return the ID
  INSERT INTO public.user_phones (user_id, phone_number, verified, verified_at)
  VALUES (p_user_id, p_phone_number, p_verified, 
          CASE WHEN p_verified THEN now() ELSE NULL END)
  RETURNING id INTO phone_id;
  
  RETURN phone_id;
EXCEPTION
  WHEN unique_violation THEN
    -- If phone already exists, raise error
    RAISE EXCEPTION 'Phone number already registered';
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.save_user_phone(uuid, text, boolean) TO service_role;

-- ============================================
-- VERIFICATION TESTS
-- ============================================

-- Test 1: Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_phones') THEN
    RAISE NOTICE '✅ user_phones table exists';
  ELSE
    RAISE NOTICE '❌ user_phones table does NOT exist';
  END IF;
END $$;

-- Test 2: Check if unique constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_phones' 
      AND indexname = 'user_phones_phone_number_unique'
  ) THEN
    RAISE NOTICE '✅ Unique constraint exists';
  ELSE
    RAISE NOTICE '❌ Unique constraint does NOT exist';
  END IF;
END $$;

-- Test 3: Check if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_phone_exists'
  ) THEN
    RAISE NOTICE '✅ check_phone_exists function exists';
  ELSE
    RAISE NOTICE '❌ check_phone_exists function does NOT exist';
  END IF;
END $$;

-- Test 4: Test the function
SELECT 
  'Testing check_phone_exists function' as test,
  public.check_phone_exists('+19999999999') as result;

-- Should return false for non-existent phone
-- If it returns true, that phone already exists in your DB

-- Test 5: Show current phones (if any)
SELECT 
  'Current phones in database' as info,
  COUNT(*) as total_phones
FROM public.user_phones;

-- Test 6: Show sample phones
SELECT 
  phone_number,
  verified,
  created_at
FROM public.user_phones
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- SUCCESS!
-- ============================================
-- You should see:
-- ✅ user_phones table exists
-- ✅ Unique constraint exists  
-- ✅ check_phone_exists function exists
-- Test result: false (for non-existent phone)
-- Current phones count: [number]

