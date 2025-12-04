-- OPTIMIZE_LOGIN_SPEED.sql
-- Add database indexes to speed up login queries

-- ========================================
-- STEP 1: Add indexes for faster user lookups
-- ========================================

-- Index on users.email for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Index on users.id for primary key lookups (usually exists, but ensure it)
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- Index on users.username for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- ========================================
-- STEP 2: Add indexes for user_balances
-- ========================================

-- Fast balance lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);

-- ========================================
-- STEP 3: Add indexes for seller_profiles
-- ========================================

-- Fast seller lookups
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_email ON public.seller_profiles(email);

-- ========================================
-- STEP 4: Add indexes for admin_profiles
-- ========================================

-- Fast admin lookups
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON public.admin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON public.admin_profiles(email);

-- ========================================
-- STEP 5: Analyze tables to update query planner statistics
-- ========================================

ANALYZE public.users;
ANALYZE public.user_balances;
ANALYZE public.seller_profiles;
ANALYZE public.admin_profiles;

-- ========================================
-- STEP 6: Verify indexes were created
-- ========================================

SELECT 
    '✅ LOGIN SPEED INDEXES' as status,
    tablename as table_name,
    indexname as index_name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'user_balances', 'seller_profiles', 'admin_profiles')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT '✅ Login queries now optimized with indexes!' as result;
SELECT '💡 Login should be noticeably faster now!' as tip;

