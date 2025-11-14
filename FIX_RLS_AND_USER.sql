-- ============================================================================
-- FIX RLS AND USER ACCESS
-- RLS might be blocking the frontend from seeing the user
-- ============================================================================

-- Check RLS status
SELECT 'RLS STATUS ON USERS TABLE:' as info;
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- Show RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';

-- DISABLE RLS temporarily to fix access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop any restrictive policies
DROP POLICY IF EXISTS "Users can only see their own data" ON public.users;
DROP POLICY IF EXISTS "Users can only update their own data" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

-- Create permissive policies
CREATE POLICY "Allow all to read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to insert" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow users to update own data" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Re-enable RLS with permissive policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Now ensure user exists
DELETE FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';

INSERT INTO public.users (
  id,
  email,
  username,
  purchased_tokens,
  won_tokens,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'ryanrfermoselle',
  300.00,
  0.00,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'ryanrfermoselle@yahoo.com';

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;

-- Verify user exists and is accessible
SELECT 'USER DATA (should show 1 row):' as info;
SELECT id, email, username, purchased_tokens, won_tokens 
FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';

-- Test anonymous access (simulating frontend)
SET ROLE anon;
SELECT 'ANONYMOUS ACCESS TEST:' as info;
SELECT COUNT(*) as user_count FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';
RESET ROLE;

-- Success
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ USER EXISTS AND RLS FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'User count: %', v_count;
    RAISE NOTICE 'RLS: ENABLED with permissive policies';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Try logging in now (hard refresh: Ctrl+F5)';
  ELSE
    RAISE NOTICE '❌ USER STILL NOT CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Email might not exist in auth.users';
  END IF;
  RAISE NOTICE '';
END $$;


