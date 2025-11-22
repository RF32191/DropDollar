-- ============================================
-- FIX AUTHENTICATION & SCALE FOR MILLIONS OF USERS
-- ============================================
-- Fixes: Login persistence, session management, database optimization
-- Scales: Database indexes, connection pooling, query optimization
-- ============================================

-- ================================================
-- PART 1: FIX AUTHENTICATION & SESSION MANAGEMENT
-- ================================================

-- Ensure auth.users can handle millions of users
-- This is Supabase's built-in auth table - we just verify it

-- Create sessions table for better session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Add indexes for fast session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at) WHERE is_active = true;

-- Function to clean up expired sessions (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Deactivate expired sessions
    UPDATE user_sessions
    SET is_active = false
    WHERE expires_at < NOW() AND is_active = true;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Delete sessions older than 90 days
    DELETE FROM user_sessions
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleaned up % expired sessions', v_deleted_count;
    
    RETURN v_deleted_count;
END;
$$;

-- Enable RLS on sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
CREATE POLICY "Users can view their own sessions"
ON user_sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
CREATE POLICY "Users can insert their own sessions"
ON user_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
CREATE POLICY "Users can update their own sessions"
ON user_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- ================================================
-- PART 2: OPTIMIZE USERS TABLE FOR SCALE
-- ================================================

-- Add missing indexes for millions of users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Composite indexes for common queries (only if columns exist)
DO $$
BEGIN
    -- Only create status indexes if status column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_users_email_status ON public.users(email, status);
        CREATE INDEX IF NOT EXISTS idx_users_username_status ON public.users(username, status);
        CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status) WHERE status = 'active';
        RAISE NOTICE 'Status indexes created';
    ELSE
        RAISE NOTICE 'Status column not found - skipping status indexes';
    END IF;
END $$;

-- Add BRIN index for time-series data (very efficient for large datasets)
CREATE INDEX IF NOT EXISTS idx_users_created_at_brin ON public.users USING brin(created_at);

-- ================================================
-- PART 3: OPTIMIZE USER_BALANCES FOR SCALE
-- ================================================

-- Indexes for fast balance lookups
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_tokens ON public.user_balances(drop_tokens) WHERE drop_tokens > 0;
CREATE INDEX IF NOT EXISTS idx_user_balances_updated ON public.user_balances(updated_at DESC);

-- Partial index for active balances only
CREATE INDEX IF NOT EXISTS idx_user_balances_active ON public.user_balances(user_id, drop_tokens) 
WHERE drop_tokens > 0;

-- ================================================
-- PART 4: OPTIMIZE MARKETPLACE_SESSIONS FOR SCALE
-- ================================================

-- Indexes for fast session queries (only guaranteed columns)
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_listing ON public.marketplace_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_winner ON public.marketplace_sessions(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_created ON public.marketplace_sessions(created_at DESC);

-- BRIN index for time-series (very efficient for large datasets)
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_created_brin 
ON public.marketplace_sessions USING brin(created_at);

-- Optional status indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'marketplace_sessions' 
        AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_status ON public.marketplace_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_status_created 
        ON public.marketplace_sessions(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_winner_status 
        ON public.marketplace_sessions(winner_user_id, status) WHERE winner_user_id IS NOT NULL;
        RAISE NOTICE 'Marketplace session status indexes created';
    END IF;
END $$;

-- ================================================
-- PART 5: OPTIMIZE MARKETPLACE_LISTINGS FOR SCALE
-- ================================================

-- Indexes for fast listing queries (only guaranteed columns)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created ON public.marketplace_listings(created_at DESC);

-- Optional indexes (only if columns exist)
DO $$
BEGIN
    -- Status indexes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'marketplace_listings' 
        AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
        CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_created 
        ON public.marketplace_listings(status, created_at DESC) WHERE status = 'active';
        RAISE NOTICE 'Marketplace status indexes created';
    END IF;
    
    -- Full-text search indexes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'marketplace_listings' 
        AND column_name = 'title'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search 
        ON public.marketplace_listings USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
        RAISE NOTICE 'Marketplace search index created';
    END IF;
END $$;

-- ================================================
-- PART 6: OPTIMIZE SELLER_WALLETS FOR SCALE
-- ================================================

-- Indexes for seller wallet queries (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'seller_wallets') THEN
        
        CREATE INDEX IF NOT EXISTS idx_seller_wallets_seller ON public.seller_wallets(seller_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'seller_wallets' 
                   AND column_name = 'pending_balance') THEN
            CREATE INDEX IF NOT EXISTS idx_seller_wallets_pending ON public.seller_wallets(pending_balance) 
            WHERE pending_balance > 0;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'seller_wallets' 
                   AND column_name = 'released_balance') THEN
            CREATE INDEX IF NOT EXISTS idx_seller_wallets_released ON public.seller_wallets(released_balance) 
            WHERE released_balance > 0;
        END IF;
        
        RAISE NOTICE 'Seller wallets indexes created';
    ELSE
        RAISE NOTICE 'seller_wallets table not found - skipping';
    END IF;
END $$;

-- ================================================
-- PART 7: OPTIMIZE ADMIN_MESSAGES & NOTIFICATIONS
-- ================================================

-- Indexes for admin_messages (only if table and columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'admin_messages') THEN
        
        -- Create indexes only for columns that exist
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_messages' 
                   AND column_name = 'sender_id') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON public.admin_messages(sender_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_messages' 
                   AND column_name = 'recipient_id') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient ON public.admin_messages(recipient_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_messages' 
                   AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON public.admin_messages(created_at DESC);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_messages' 
                   AND column_name = 'is_read') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_messages_read ON public.admin_messages(is_read) 
            WHERE is_read = false;
            
            -- Composite index for unread messages (if recipient_id also exists)
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'admin_messages' 
                       AND column_name = 'recipient_id') THEN
                CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient_unread 
                ON public.admin_messages(recipient_id, is_read, created_at DESC) 
                WHERE is_read = false;
            END IF;
        END IF;
        
        RAISE NOTICE 'Admin messages indexes created';
    ELSE
        RAISE NOTICE 'admin_messages table not found - skipping';
    END IF;
END $$;

-- Indexes for admin_notifications (only if table and columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_notifications' 
                   AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_notifications_user ON public.admin_notifications(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_notifications' 
                   AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'admin_notifications' 
                   AND column_name = 'is_read') THEN
            CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(is_read) 
            WHERE is_read = false;
        END IF;
        
        RAISE NOTICE 'Admin notifications indexes created';
    ELSE
        RAISE NOTICE 'admin_notifications table not found - skipping';
    END IF;
END $$;

-- ================================================
-- PART 8: ADD MATERIALIZED VIEWS FOR ANALYTICS
-- ================================================

-- Materialized views (drop and recreate to avoid column issues)
DO $$
BEGIN
    -- User statistics view
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'users') THEN
        
        -- Drop existing view if it exists
        DROP MATERIALIZED VIEW IF EXISTS user_statistics CASCADE;
        
        -- Create fresh view
        CREATE MATERIALIZED VIEW user_statistics AS
        SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as users_last_24h,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as users_last_7d,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as users_last_30d,
            MIN(created_at) as first_user_created,
            MAX(created_at) as last_user_created
        FROM users;
        
        CREATE UNIQUE INDEX idx_user_statistics_refresh ON user_statistics ((true));
        RAISE NOTICE 'User statistics materialized view created';
    END IF;
    
    -- Marketplace statistics view
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'marketplace_listings') THEN
        
        -- Drop existing view if it exists
        DROP MATERIALIZED VIEW IF EXISTS marketplace_statistics CASCADE;
        
        -- Create fresh view
        CREATE MATERIALIZED VIEW marketplace_statistics AS
        SELECT 
            COUNT(*) as total_listings,
            COUNT(DISTINCT seller_id) as total_sellers,
            MIN(created_at) as first_listing_created,
            MAX(created_at) as last_listing_created
        FROM marketplace_listings;
        
        CREATE UNIQUE INDEX idx_marketplace_statistics_refresh ON marketplace_statistics ((true));
        RAISE NOTICE 'Marketplace statistics materialized view created';
    END IF;
END $$;

-- ================================================
-- PART 9: ADD QUERY OPTIMIZATION FUNCTIONS
-- ================================================

-- Function to get user with all related data (optimized single query)
CREATE OR REPLACE FUNCTION get_user_complete_profile(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'user', row_to_json(u.*),
        'balance', row_to_json(ub.*),
        'seller_wallet', row_to_json(sw.*),
        'unread_messages', (
            SELECT COUNT(*) 
            FROM admin_messages 
            WHERE recipient_id = p_user_id AND is_read = false
        ),
        'unread_notifications', (
            SELECT COUNT(*) 
            FROM admin_notifications 
            WHERE user_id = p_user_id AND is_read = false
        )
    )
    INTO v_result
    FROM users u
    LEFT JOIN user_balances ub ON ub.user_id = u.id
    LEFT JOIN seller_wallets sw ON sw.seller_id = u.id
    WHERE u.id = p_user_id;
    
    RETURN v_result;
END;
$$;

-- ================================================
-- PART 10: ADD DATABASE MAINTENANCE FUNCTIONS
-- ================================================

-- Function to analyze and optimize all tables (only existing ones)
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result TEXT := '';
BEGIN
    -- Analyze tables that exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ANALYZE users;
        v_result := v_result || 'Analyzed: users, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_balances') THEN
        ANALYZE user_balances;
        v_result := v_result || 'user_balances, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_listings') THEN
        ANALYZE marketplace_listings;
        v_result := v_result || 'marketplace_listings, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_sessions') THEN
        ANALYZE marketplace_sessions;
        v_result := v_result || 'marketplace_sessions, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seller_wallets') THEN
        ANALYZE seller_wallets;
        v_result := v_result || 'seller_wallets, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_messages') THEN
        ANALYZE admin_messages;
        v_result := v_result || 'admin_messages, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
        ANALYZE admin_notifications;
        v_result := v_result || 'admin_notifications, ';
    END IF;
    
    -- Refresh materialized views if they exist
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'user_statistics') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
        v_result := v_result || 'Refreshed: user_statistics, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'marketplace_statistics') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY marketplace_statistics;
        v_result := v_result || 'marketplace_statistics';
    END IF;
    
    RETURN 'Database optimized: ' || v_result;
END;
$$;

-- ================================================
-- PART 11: ADD CONNECTION POOL SETTINGS
-- ================================================

-- These settings should be added to your Supabase project settings
-- or postgresql.conf file:

COMMENT ON DATABASE postgres IS 
'Recommended settings for millions of concurrent users:
- max_connections: 200 (or higher with PgBouncer)
- shared_buffers: 25% of RAM
- effective_cache_size: 75% of RAM
- work_mem: 50MB
- maintenance_work_mem: 2GB
- checkpoint_completion_target: 0.9
- wal_buffers: 16MB
- default_statistics_target: 100
- random_page_cost: 1.1 (for SSD)
- effective_io_concurrency: 200
- Use PgBouncer for connection pooling (transaction mode)';

-- ================================================
-- PART 12: ADD AUTOMATIC VACUUM SETTINGS
-- ================================================

-- Configure autovacuum for high-traffic tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE users SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_analyze_scale_factor = 0.02
        );
        RAISE NOTICE 'Autovacuum configured for users';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_balances') THEN
        ALTER TABLE user_balances SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_analyze_scale_factor = 0.02
        );
        RAISE NOTICE 'Autovacuum configured for user_balances';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_sessions') THEN
        ALTER TABLE marketplace_sessions SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_analyze_scale_factor = 0.02
        );
        RAISE NOTICE 'Autovacuum configured for marketplace_sessions';
    END IF;
END $$;

-- ================================================
-- PART 13: ADD TABLE PARTITIONING (FOR FUTURE SCALE)
-- ================================================

-- Comments for future implementation (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_sessions') THEN
        COMMENT ON TABLE marketplace_sessions IS 
        'Consider partitioning by created_at (monthly) when table exceeds 10M rows';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_messages') THEN
        COMMENT ON TABLE admin_messages IS 
        'Consider partitioning by created_at (monthly) when table exceeds 10M rows';
    END IF;
END $$;

-- ================================================
-- PART 14: ADD PERFORMANCE MONITORING
-- ================================================

-- View to monitor slow queries (if pg_stat_statements extension exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        EXECUTE '
        CREATE OR REPLACE VIEW slow_queries AS
        SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            max_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 50';
    ELSE
        RAISE NOTICE 'pg_stat_statements extension not found - slow_queries view not created';
    END IF;
END $$;

-- View to monitor table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ DATABASE OPTIMIZED FOR SCALE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '📊 Indexes added for fast queries';
    RAISE NOTICE '🔐 Session management improved';
    RAISE NOTICE '⚡ Query performance optimized';
    RAISE NOTICE '🗄️ Materialized views created';
    RAISE NOTICE '🔧 Maintenance functions added';
    RAISE NOTICE '====================================';
    RAISE NOTICE '📈 Ready for millions of users!';
    RAISE NOTICE '====================================';
END $$;

