-- ============================================
-- FIX PURCHASE HISTORY RLS POLICIES
-- ============================================
-- This script ensures RLS policies allow users to insert
-- their own purchase history and view their own transactions
-- ============================================

-- ============================================
-- 1. FIX PURCHASE_HISTORY RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own purchase history" ON public.purchase_history;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchase_history;
DROP POLICY IF EXISTS "Service role full access" ON public.purchase_history;

-- Policy: Users can view their own purchase history
-- Cast both sides to TEXT to handle TEXT or UUID user_id types
CREATE POLICY "Users can view own purchase history"
    ON public.purchase_history
    FOR SELECT
    USING (auth.uid()::TEXT = user_id::TEXT);

-- Policy: Users can insert their own purchases
-- This is critical - users need to insert via client-side code
CREATE POLICY "Users can insert own purchases"
    ON public.purchase_history
    FOR INSERT
    WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

-- Policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access"
    ON public.purchase_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'service_role'
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- ============================================
-- 2. FIX TOKEN_TRANSACTIONS RLS POLICIES
-- ============================================

-- Check if token_transactions table exists and has RLS enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'token_transactions'
    ) THEN
        -- Enable RLS if not already enabled
        ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own transactions" ON public.token_transactions;
        DROP POLICY IF EXISTS "Users can insert own transactions" ON public.token_transactions;
        DROP POLICY IF EXISTS "Service role full access transactions" ON public.token_transactions;
        
        -- Policy: Users can view their own transactions
        CREATE POLICY "Users can view own transactions"
            ON public.token_transactions
            FOR SELECT
            USING (auth.uid()::TEXT = user_id::TEXT);
        
        -- Policy: Users can insert their own transactions
        CREATE POLICY "Users can insert own transactions"
            ON public.token_transactions
            FOR INSERT
            WITH CHECK (auth.uid()::TEXT = user_id::TEXT);
        
        -- Policy: Service role can do everything
        CREATE POLICY "Service role full access transactions"
            ON public.token_transactions
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND raw_user_meta_data->>'role' = 'service_role'
                )
                OR auth.jwt() ->> 'role' = 'service_role'
            );
        
        RAISE NOTICE '✅ Token transactions RLS policies updated';
    ELSE
        RAISE NOTICE '⚠️ token_transactions table does not exist - skipping';
    END IF;
END $$;

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================

-- Grant SELECT and INSERT to authenticated users
GRANT SELECT, INSERT ON public.purchase_history TO authenticated;
GRANT SELECT, INSERT ON public.token_transactions TO authenticated;

-- ============================================
-- 4. VERIFY POLICIES
-- ============================================

-- Check purchase_history policies
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
WHERE tablename = 'purchase_history'
ORDER BY policyname;

-- Check token_transactions policies (if table exists)
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
WHERE tablename = 'token_transactions'
ORDER BY policyname;

-- ============================================
-- NOTES
-- ============================================
-- 1. Users must be authenticated (have a valid session) to insert
-- 2. The user_id in the insert must match auth.uid()
-- 3. If inserts are still failing, check:
--    - User is logged in (auth.uid() is not null)
--    - user_id matches auth.uid() exactly (both cast to TEXT)
--    - Table has RLS enabled
--    - Policies are created correctly

