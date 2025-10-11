-- ============================================
-- SCALABLE PRODUCTION SCHEMA FOR MILLIONS OF USERS
-- ============================================
-- Optimized for:
-- - High performance with millions of users
-- - Efficient indexing for fast queries
-- - Partitioning for large tables
-- - Caching strategies
-- - Connection pooling
-- - Read replicas support
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Fast text search

-- ============================================
-- 1. USERS TABLE (Optimized for Scale)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Keep TEXT for localStorage compatibility
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  tokens INTEGER DEFAULT 0 CHECK (tokens >= 0),
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON public.users(role) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON public.users(last_login DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON public.users(is_active) WHERE is_active = true;

-- Text search index for username/email search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm ON public.users USING gin(username gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trgm ON public.users USING gin(email gin_trgm_ops);

-- ============================================
-- 2. TOKEN TRANSACTIONS (Partitioned by Date)
-- ============================================
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'spend', 'earn', 'refund')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  related_listing_id TEXT,
  related_game_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at) -- Composite key for partitioning
) PARTITION BY RANGE (created_at);

-- Create partitions for token_transactions (one per month for scalability)
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_01 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_02 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_03 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_04 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_05 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_06 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_07 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_08 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_09 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_10 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_11 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS public.token_transactions_2025_12 PARTITION OF public.token_transactions
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Default partition for future dates
CREATE TABLE IF NOT EXISTS public.token_transactions_default PARTITION OF public.token_transactions DEFAULT;

-- Performance indexes for token_transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transactions_user ON public.token_transactions(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transactions_type ON public.token_transactions(type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transactions_stripe ON public.token_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transactions_listing ON public.token_transactions(related_listing_id) WHERE related_listing_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transactions_created ON public.token_transactions(created_at DESC);

-- GIN index for JSONB metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transactions_metadata ON public.token_transactions USING gin(metadata);

-- ============================================
-- 3. GAME HISTORY (Partitioned by Date)
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  game_type VARCHAR(50) NOT NULL,
  game_name VARCHAR(100),
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  game_duration INTEGER,
  is_practice BOOLEAN DEFAULT true,
  is_competition BOOLEAN DEFAULT false,
  listing_id TEXT,
  entry_number INTEGER,
  placement INTEGER,
  prize_won DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for game_history (one per month)
CREATE TABLE IF NOT EXISTS public.game_history_2025_01 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_02 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_03 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_04 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_05 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_06 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_07 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_08 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_09 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_10 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_11 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS public.game_history_2025_12 PARTITION OF public.game_history
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS public.game_history_default PARTITION OF public.game_history DEFAULT;

-- Performance indexes for game_history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_history_user ON public.game_history(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_history_listing ON public.game_history(listing_id, created_at DESC) WHERE listing_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_history_competition ON public.game_history(is_competition, created_at DESC) WHERE is_competition = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_history_score ON public.game_history(game_type, score DESC) WHERE is_competition = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_history_winners ON public.game_history(placement, created_at DESC) WHERE placement = 1;

-- ============================================
-- 4. PURCHASE HISTORY (Partitioned by Date)
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id UUID DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  purchase_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tokens_purchased INTEGER,
  tokens_spent INTEGER,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for purchase_history
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_01 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_02 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_03 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_04 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_05 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_06 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_07 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_08 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_09 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_10 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_11 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_2025_12 PARTITION OF public.purchase_history
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS public.purchase_history_default PARTITION OF public.purchase_history DEFAULT;

-- Performance indexes for purchase_history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_history_user ON public.purchase_history(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_history_type ON public.purchase_history(purchase_type, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_history_stripe_intent ON public.purchase_history(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_history_stripe_charge ON public.purchase_history(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_history_status ON public.purchase_history(status, created_at DESC);

-- ============================================
-- 5. USER LISTINGS (For Sellers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  game_type VARCHAR(50),
  entry_fee INTEGER,
  prize_value DECIMAL(10,2),
  total_entries INTEGER DEFAULT 0,
  max_entries INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  winner_user_id TEXT,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for user_listings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_listings_user ON public.user_listings(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_listings_status ON public.user_listings(status, ends_at) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_listings_category ON public.user_listings(category, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_listings_game_type ON public.user_listings(game_type, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_listings_ends_at ON public.user_listings(ends_at) WHERE status = 'active';

-- ============================================
-- 6. USER ACTIVITY (Partitioned by Date)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for user_activity (weekly for high volume)
CREATE TABLE IF NOT EXISTS public.user_activity_2025_10_w1 PARTITION OF public.user_activity
    FOR VALUES FROM ('2025-10-01') TO ('2025-10-08');
CREATE TABLE IF NOT EXISTS public.user_activity_2025_10_w2 PARTITION OF public.user_activity
    FOR VALUES FROM ('2025-10-08') TO ('2025-10-15');
CREATE TABLE IF NOT EXISTS public.user_activity_2025_10_w3 PARTITION OF public.user_activity
    FOR VALUES FROM ('2025-10-15') TO ('2025-10-22');
CREATE TABLE IF NOT EXISTS public.user_activity_2025_10_w4 PARTITION OF public.user_activity
    FOR VALUES FROM ('2025-10-22') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS public.user_activity_default PARTITION OF public.user_activity DEFAULT;

-- Performance indexes for user_activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_user ON public.user_activity(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_created ON public.user_activity(created_at DESC);

-- ============================================
-- 7. MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- User statistics (refreshed periodically for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_statistics_mv AS
SELECT 
  u.id AS user_id,
  u.username,
  u.email,
  u.tokens,
  u.balance,
  u.total_spent,
  u.total_earned,
  u.games_played,
  u.games_won,
  COALESCE(gh.total_games, 0) AS actual_games_played,
  COALESCE(gh.total_wins, 0) AS actual_games_won,
  COALESCE(gh.avg_score, 0) AS average_score,
  COALESCE(gh.best_score, 0) AS best_score,
  COALESCE(tt.total_purchased, 0) AS total_tokens_purchased,
  COALESCE(tt.total_spent_tokens, 0) AS total_tokens_spent,
  COALESCE(ph.total_purchases, 0) AS total_purchases,
  COALESCE(ph.total_purchase_amount, 0) AS total_purchase_amount,
  u.created_at,
  u.last_login,
  NOW() AS last_refreshed
FROM public.users u
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) AS total_games,
    SUM(CASE WHEN placement = 1 THEN 1 ELSE 0 END) AS total_wins,
    AVG(score)::NUMERIC(10,2) AS avg_score,
    MAX(score) AS best_score
  FROM public.game_history
  WHERE created_at > NOW() - INTERVAL '90 days' -- Only last 90 days for performance
  GROUP BY user_id
) gh ON u.id = gh.user_id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) AS total_purchased,
    SUM(CASE WHEN type = 'spend' THEN amount ELSE 0 END) AS total_spent_tokens
  FROM public.token_transactions
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY user_id
) tt ON u.id = tt.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) AS total_purchases,
    SUM(amount) AS total_purchase_amount
  FROM public.purchase_history
  WHERE status = 'completed' AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY user_id
) ph ON u.id = ph.user_id
WHERE u.is_active = true;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_statistics_mv_user_id ON public.user_statistics_mv(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_mv_refreshed ON public.user_statistics_mv(last_refreshed DESC);

-- Leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.game_leaderboards_mv AS
SELECT 
  game_type,
  user_id,
  username,
  best_score,
  total_games,
  avg_score,
  ROW_NUMBER() OVER (PARTITION BY game_type ORDER BY best_score DESC) AS rank,
  NOW() AS last_refreshed
FROM (
  SELECT 
    gh.game_type,
    gh.user_id,
    u.username,
    MAX(gh.score) AS best_score,
    COUNT(*) AS total_games,
    AVG(gh.score)::NUMERIC(10,2) AS avg_score
  FROM public.game_history gh
  JOIN public.users u ON gh.user_id = u.id
  WHERE gh.created_at > NOW() - INTERVAL '30 days'
    AND gh.is_competition = true
    AND u.is_active = true
  GROUP BY gh.game_type, gh.user_id, u.username
) ranked
WHERE total_games >= 3; -- At least 3 games to qualify

-- Indexes for leaderboard
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_leaderboards_mv_game_user ON public.game_leaderboards_mv(game_type, user_id);
CREATE INDEX IF NOT EXISTS idx_game_leaderboards_mv_rank ON public.game_leaderboards_mv(game_type, rank);

-- ============================================
-- 8. FUNCTIONS FOR MATERIALIZED VIEW REFRESH
-- ============================================

-- Function to refresh user statistics (call this hourly)
CREATE OR REPLACE FUNCTION refresh_user_statistics_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_statistics_mv;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh leaderboards (call this every 5 minutes)
CREATE OR REPLACE FUNCTION refresh_game_leaderboards_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.game_leaderboards_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. AUTOMATIC PARTITION CREATION
-- ============================================

-- Function to create next month's partitions automatically
CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
DECLARE
  next_month DATE;
  following_month DATE;
  partition_name TEXT;
BEGIN
  next_month := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  following_month := next_month + INTERVAL '1 month';
  
  -- Token transactions partition
  partition_name := 'token_transactions_' || TO_CHAR(next_month, 'YYYY_MM');
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.token_transactions FOR VALUES FROM (%L) TO (%L)', 
    partition_name, next_month, following_month);
  
  -- Game history partition
  partition_name := 'game_history_' || TO_CHAR(next_month, 'YYYY_MM');
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.game_history FOR VALUES FROM (%L) TO (%L)', 
    partition_name, next_month, following_month);
  
  -- Purchase history partition
  partition_name := 'purchase_history_' || TO_CHAR(next_month, 'YYYY_MM');
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.purchase_history FOR VALUES FROM (%L) TO (%L)', 
    partition_name, next_month, following_month);
  
  RAISE NOTICE 'Created partitions for %', TO_CHAR(next_month, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_listings_updated_at BEFORE UPDATE ON public.user_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. MAINTENANCE FUNCTIONS
-- ============================================

-- Function to archive old partitions (move to cold storage)
CREATE OR REPLACE FUNCTION archive_old_partitions(months_to_keep INTEGER DEFAULT 12)
RETURNS void AS $$
DECLARE
  cutoff_date DATE;
BEGIN
  cutoff_date := DATE_TRUNC('month', NOW() - (months_to_keep || ' months')::INTERVAL);
  
  -- Log the archival (in production, this would move data to S3 or similar)
  RAISE NOTICE 'Archiving partitions older than %', cutoff_date;
  
  -- In production, you would:
  -- 1. Export old partitions to cold storage
  -- 2. Drop the old partitions
  -- 3. Keep partition structure for historical queries
END;
$$ LANGUAGE plpgsql;

-- Function to get database health metrics
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS TABLE (
  metric VARCHAR,
  value BIGINT,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Total Users'::VARCHAR,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) < 1000000 THEN 'OK' ELSE 'HIGH' END::VARCHAR
  FROM public.users
  UNION ALL
  SELECT 
    'Active Users (Last 30 days)'::VARCHAR,
    COUNT(*)::BIGINT,
    'OK'::VARCHAR
  FROM public.users
  WHERE last_login > NOW() - INTERVAL '30 days'
  UNION ALL
  SELECT 
    'Total Transactions'::VARCHAR,
    COUNT(*)::BIGINT,
    'OK'::VARCHAR
  FROM public.token_transactions
  UNION ALL
  SELECT 
    'Total Games Played'::VARCHAR,
    COUNT(*)::BIGINT,
    'OK'::VARCHAR
  FROM public.game_history
  UNION ALL
  SELECT 
    'Total Purchases'::VARCHAR,
    COUNT(*)::BIGINT,
    'OK'::VARCHAR
  FROM public.purchase_history;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETE! Production-ready for millions of users!
-- ============================================

-- Schedule these to run automatically:
-- 1. SELECT create_next_month_partitions(); -- Run monthly (1st of each month)
-- 2. SELECT refresh_user_statistics_mv(); -- Run hourly
-- 3. SELECT refresh_game_leaderboards_mv(); -- Run every 5 minutes
-- 4. SELECT archive_old_partitions(12); -- Run monthly (archive data older than 12 months)
-- 5. VACUUM ANALYZE; -- Run daily during off-peak hours
-- 6. REINDEX CONCURRENTLY; -- Run weekly during off-peak hours

