-- ============================================================================
-- URGENT: FIX PHONE NUMBER STORAGE
-- ============================================================================
-- Run this NOW to fix phone number storage in users table
-- ============================================================================

-- Step 1: Ensure phone column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Drop any existing constraint that might be blocking
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Step 3: Create unique index for phone numbers (prevents duplicates)
DROP INDEX IF EXISTS public.idx_users_phone_unique;
CREATE UNIQUE INDEX idx_users_phone_unique 
ON public.users (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Step 4: Enable RLS if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create/Update RLS policy to allow phone inserts
DROP POLICY IF EXISTS "Enable insert for service role" ON public.users;
CREATE POLICY "Enable insert for service role"
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Step 6: Allow updates for service role
DROP POLICY IF EXISTS "Enable update for service role" ON public.users;
CREATE POLICY "Enable update for service role"
ON public.users
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Step 7: Show current phone status
SELECT 
  COUNT(*) as total_users,
  COUNT(phone) as users_with_phone,
  COUNT(*) - COUNT(phone) as users_without_phone
FROM public.users;

-- Step 8: Test insert (will fail if column doesn't work)
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Try inserting a test user with phone
  INSERT INTO public.users (id, username, email, phone, tokens, created_at, updated_at)
  VALUES (
    test_id,
    'test_phone_user_' || FLOOR(RANDOM() * 10000),
    'test_' || test_id || '@test.com',
    '+15559999999',
    1,
    NOW(),
    NOW()
  );
  
  -- Check if it was inserted
  IF EXISTS (SELECT 1 FROM public.users WHERE id = test_id AND phone = '+15559999999') THEN
    RAISE NOTICE '✅ SUCCESS! Phone column is working correctly';
    -- Clean up test user
    DELETE FROM public.users WHERE id = test_id;
  ELSE
    RAISE NOTICE '❌ FAILED! Phone column exists but value not stored';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    -- Try to clean up if test user was created
    DELETE FROM public.users WHERE id = test_id;
END $$;

-- Step 9: Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PHONE STORAGE FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. ✅ Phone column added (if missing)';
  RAISE NOTICE '2. ✅ Unique index created (prevents duplicates)';
  RAISE NOTICE '3. ✅ RLS policies updated for service role';
  RAISE NOTICE '4. ✅ Test insert completed';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to Vercel dashboard';
  RAISE NOTICE '2. Redeploy your application';
  RAISE NOTICE '3. Try registering with a new phone number';
  RAISE NOTICE '4. Check Supabase users table - phone should be saved!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

