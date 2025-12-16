-- ============================================
-- CRITICAL: RUN THIS FIRST - PHONE TABLE SETUP
-- ============================================
-- This creates the user_phones table that prevents duplicate phone numbers
-- Run this in Supabase SQL Editor RIGHT NOW before testing again

-- Step 1: Create user_phones table
CREATE TABLE IF NOT EXISTS public.user_phones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create unique index to prevent duplicate phone numbers
-- This is THE KEY - it prevents any duplicate phones at database level
CREATE UNIQUE INDEX IF NOT EXISTS user_phones_phone_number_unique 
ON public.user_phones (phone_number);

-- Step 3: Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS user_phones_user_id_idx 
ON public.user_phones (user_id);

-- Step 4: Enable Row Level Security
ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Allow users to read their own phone
DROP POLICY IF EXISTS "Users can view own phone" ON public.user_phones;
CREATE POLICY "Users can view own phone"
  ON public.user_phones FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to manage all phones (for registration)
DROP POLICY IF EXISTS "Service role can manage phones" ON public.user_phones;
CREATE POLICY "Service role can manage phones"
  ON public.user_phones FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 6: Grant permissions
GRANT ALL ON public.user_phones TO postgres;
GRANT ALL ON public.user_phones TO service_role;
GRANT SELECT ON public.user_phones TO authenticated;

-- ============================================
-- VERIFICATION TEST
-- ============================================
-- After running above, run this to verify it worked:

-- Test 1: Check table exists
SELECT 
  'user_phones table exists' AS status,
  COUNT(*) AS current_phone_count
FROM user_phones;

-- Test 2: Check unique constraint exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'user_phones' 
  AND indexname = 'user_phones_phone_number_unique';

-- ============================================
-- SUCCESS CONFIRMATION
-- ============================================
-- If both tests above return results without errors, you're ready to test!
-- The table is now ready to:
-- ✅ Store phone numbers
-- ✅ Prevent duplicates
-- ✅ Link phones to users

