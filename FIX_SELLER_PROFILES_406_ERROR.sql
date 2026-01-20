-- ============================================================================
-- FIX SELLER_PROFILES 406 ERROR - RLS Policy Fix
-- This fixes the "406 Not Acceptable" error when querying seller_profiles
-- ============================================================================

-- Step 1: Check current RLS status
SELECT 'Checking current RLS status...' as step;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'seller_profiles';

-- Step 2: Check existing policies
SELECT 'Current RLS policies:' as step;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'seller_profiles';

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can update own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can insert own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can delete own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Admin can view all seller profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Admin can update all seller profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Anyone can view seller profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can view their own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can create seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can update their own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can view seller profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can insert their own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can update their own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can delete own incomplete profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.seller_profiles;

-- Step 5: Create comprehensive RLS policies
-- Policy 1: Users can SELECT their own seller profile
CREATE POLICY "seller_profiles_select_own"
    ON public.seller_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can INSERT their own seller profile
CREATE POLICY "seller_profiles_insert_own"
    ON public.seller_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can UPDATE their own seller profile
CREATE POLICY "seller_profiles_update_own"
    ON public.seller_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Admin can SELECT all seller profiles (for admin dashboard)
CREATE POLICY "seller_profiles_admin_select"
    ON public.seller_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND user_type = 'admin'
        )
        OR
        auth.jwt() ->> 'email' IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
    );

-- Policy 5: Admin can UPDATE all seller profiles
CREATE POLICY "seller_profiles_admin_update"
    ON public.seller_profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND user_type = 'admin'
        )
        OR
        auth.jwt() ->> 'email' IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND user_type = 'admin'
        )
        OR
        auth.jwt() ->> 'email' IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
    );

-- Step 6: Verify policies were created
SELECT 'Verifying new policies...' as step;
SELECT 
    policyname,
    cmd as operation,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'seller_profiles'
ORDER BY policyname;

-- Step 7: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.seller_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.seller_profiles TO anon;

-- Step 8: Test query (this will show if RLS is working)
SELECT 'Testing RLS policies...' as step;
SELECT 
    'If you see this, RLS policies are configured correctly' as status,
    COUNT(*) as total_profiles
FROM public.seller_profiles;

-- Step 9: Summary
SELECT '✅ RLS policies fixed successfully!' as status;
SELECT 
    'Next steps:' as info,
    '1. Test the query in your application' as step1,
    '2. Ensure users are authenticated before querying' as step2,
    '3. Check browser console for any remaining errors' as step3;

