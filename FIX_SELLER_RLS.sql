-- ============================================================================
-- FIX SELLER PROFILES RLS FOR ADMIN ACCESS
-- ============================================================================

-- Step 1: Check current RLS policies
SELECT 'Current RLS policies on seller_profiles:' as info;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'seller_profiles';

-- Step 2: Enable RLS if not enabled
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies
DROP POLICY IF EXISTS "Users can view own seller profile" ON seller_profiles;
DROP POLICY IF EXISTS "Users can update own seller profile" ON seller_profiles;
DROP POLICY IF EXISTS "Users can insert own seller profile" ON seller_profiles;
DROP POLICY IF EXISTS "Admin can view all seller profiles" ON seller_profiles;
DROP POLICY IF EXISTS "Anyone can view seller profiles" ON seller_profiles;

-- Step 4: Create policies
-- Users can view and manage their own profile
CREATE POLICY "Users can view own seller profile" ON seller_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own seller profile" ON seller_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own seller profile" ON seller_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin can view ALL seller profiles (using email check to avoid recursion)
CREATE POLICY "Admin can view all seller profiles" ON seller_profiles
    FOR SELECT USING (
        auth.jwt() ->> 'email' IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
    );

-- Admin can update ALL seller profiles
CREATE POLICY "Admin can update all seller profiles" ON seller_profiles
    FOR UPDATE USING (
        auth.jwt() ->> 'email' IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
    );

SELECT 'Step 4: RLS policies created' as status;

-- Step 5: Check seller data
SELECT 'SELLER DATA CHECK:' as info;
SELECT 
    id,
    shop_name,
    status,
    registration_step,
    CASE WHEN dl_front_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dl_front,
    CASE WHEN dl_back_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dl_back,
    CASE WHEN selfie_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_selfie,
    ssn_last4,
    full_legal_name
FROM seller_profiles;

SELECT '
============================================
RLS POLICIES FIXED!
============================================
Admin (rf32191@gmail.com) can now:
- View ALL seller profiles
- Update ALL seller profiles

Verification tab should now load data.
============================================
' as done;

