-- ============================================
-- COMPLETE RLS POLICY FIX FOR PURCHASE HISTORY
-- ============================================
-- This script completely fixes RLS policies to allow
-- users to insert their own purchase history and transactions
-- ============================================

-- ============================================
-- 1. DISABLE RLS TEMPORARILY TO FIX POLICIES
-- ============================================

-- Disable RLS temporarily
ALTER TABLE public.purchase_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES
-- ============================================

-- Drop all purchase_history policies
DROP POLICY IF EXISTS "Users can view own purchase history" ON public.purchase_history;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchase_history;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchase_history;
DROP POLICY IF EXISTS "Service role full access" ON public.purchase_history;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchase_history;

-- Drop all token_transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Service role full access transactions" ON public.token_transactions;

-- ============================================
-- 3. RE-ENABLE RLS
-- ============================================

ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE CORRECT POLICIES FOR PURCHASE_HISTORY
-- ============================================

-- Policy: Users can view their own purchase history
CREATE POLICY "Users can view own purchase history"
    ON public.purchase_history
    FOR SELECT
    USING (
        -- Handle both TEXT and UUID user_id types
        (auth.uid()::TEXT = user_id::TEXT)
        OR (auth.uid()::TEXT = user_id)
    );

-- Policy: Users can insert their own purchases
-- This is CRITICAL - must allow authenticated users to insert
CREATE POLICY "Users can insert own purchases"
    ON public.purchase_history
    FOR INSERT
    WITH CHECK (
        -- Handle both TEXT and UUID user_id types
        (auth.uid()::TEXT = user_id::TEXT)
        OR (auth.uid()::TEXT = user_id)
    );

-- Policy: Service role can do everything
CREATE POLICY "Service role full access"
    ON public.purchase_history
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
    );

-- ============================================
-- 5. CREATE CORRECT POLICIES FOR TOKEN_TRANSACTIONS
-- ============================================

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.token_transactions
    FOR SELECT
    USING (
        -- Handle both TEXT and UUID user_id types
        (auth.uid()::TEXT = user_id::TEXT)
        OR (auth.uid()::TEXT = user_id)
    );

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
    ON public.token_transactions
    FOR INSERT
    WITH CHECK (
        -- Handle both TEXT and UUID user_id types
        (auth.uid()::TEXT = user_id::TEXT)
        OR (auth.uid()::TEXT = user_id)
    );

-- Policy: Service role can do everything
CREATE POLICY "Service role full access transactions"
    ON public.token_transactions
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
    );

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant SELECT and INSERT to authenticated users
GRANT SELECT, INSERT ON public.purchase_history TO authenticated;
GRANT SELECT, INSERT ON public.token_transactions TO authenticated;

-- Grant SELECT and INSERT to anon (for public access if needed)
GRANT SELECT, INSERT ON public.purchase_history TO anon;
GRANT SELECT, INSERT ON public.token_transactions TO anon;

-- ============================================
-- 7. VERIFY POLICIES
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

-- Check token_transactions policies
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
-- 8. TEST QUERY (Uncomment to test)
-- ============================================

-- Test if you can see your own purchases (replace YOUR_USER_ID)
-- SELECT * FROM public.purchase_history WHERE user_id = 'YOUR_USER_ID';

-- ============================================
-- NOTES
-- ============================================
-- 1. The policies now handle both TEXT and UUID user_id types
-- 2. Service role can bypass RLS completely
-- 3. Authenticated users can insert their own records
-- 4. If inserts still fail, the server-side API endpoints will handle it
-- 5. Check browser console for detailed error messages

