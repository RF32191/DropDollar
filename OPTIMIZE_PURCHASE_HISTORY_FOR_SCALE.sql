-- ============================================
-- OPTIMIZE PURCHASE HISTORY FOR HIGH VOLUME
-- ============================================
-- This script optimizes the purchase_history table for handling
-- many purchases per day and many concurrent users
-- ============================================

-- ============================================
-- 1. ADDITIONAL PERFORMANCE INDEXES
-- ============================================

-- Composite index for user queries with date range filtering
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_date_range 
ON public.purchase_history(user_id, created_at DESC, status) 
WHERE status = 'completed';

-- Index for recent purchases - optimized for date-based queries
-- Note: Cannot use NOW() in index predicate (not immutable), so we use a regular index
-- The query planner will still use this index efficiently for date range queries
CREATE INDEX IF NOT EXISTS idx_purchase_history_recent 
ON public.purchase_history(user_id, created_at DESC);

-- Index for pending/failed purchases (for monitoring)
CREATE INDEX IF NOT EXISTS idx_purchase_history_pending_failed 
ON public.purchase_history(status, created_at DESC) 
WHERE status IN ('pending', 'failed');

-- Index for Stripe payment intent lookups (for webhook processing)
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_intent_lookup 
ON public.purchase_history(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Index for purchase type analytics
CREATE INDEX IF NOT EXISTS idx_purchase_history_type_date 
ON public.purchase_history(purchase_type, created_at DESC);

-- ============================================
-- 2. OPTIMIZE TABLE SETTINGS FOR PERFORMANCE
-- ============================================

-- Set fillfactor to allow HOT updates (Heap Only Tuple updates)
-- This reduces table bloat from frequent updates
ALTER TABLE public.purchase_history SET (fillfactor = 90);

-- ============================================
-- 3. CREATE MATERIALIZED VIEW FOR ANALYTICS
-- ============================================

-- Daily purchase summary (refreshed periodically, not on every insert)
CREATE MATERIALIZED VIEW IF NOT EXISTS purchase_history_daily_summary AS
SELECT 
    DATE(created_at) as purchase_date,
    COUNT(*) as total_purchases,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(tokens_purchased) as total_tokens_purchased,
    SUM(amount) as total_revenue,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_purchases,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_purchases,
    AVG(amount) as avg_purchase_amount
FROM public.purchase_history
GROUP BY DATE(created_at);

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_daily_summary_date 
ON purchase_history_daily_summary(purchase_date DESC);

-- Function to refresh the materialized view (call periodically, e.g., every hour)
CREATE OR REPLACE FUNCTION refresh_purchase_daily_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY purchase_history_daily_summary;
END;
$$;

-- ============================================
-- 4. OPTIMIZED FUNCTIONS FOR HIGH VOLUME
-- ============================================

-- Optimized function to get recent purchases (with LIMIT for performance)
CREATE OR REPLACE FUNCTION get_user_recent_purchases_optimized(
    user_id_param TEXT,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    purchase_type TEXT,
    tokens_purchased INTEGER,
    tokens_spent INTEGER,
    amount DECIMAL(10, 2),
    currency TEXT,
    stripe_payment_intent_id TEXT,
    status TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH purchase_data AS (
        SELECT 
            ph.id,
            ph.purchase_type,
            ph.tokens_purchased,
            ph.tokens_spent,
            ph.amount,
            ph.currency,
            ph.stripe_payment_intent_id,
            ph.status,
            ph.description,
            ph.created_at
        FROM public.purchase_history ph
        WHERE ph.user_id = user_id_param
        ORDER BY ph.created_at DESC
        LIMIT limit_count
        OFFSET offset_count
    ),
    total_count AS (
        SELECT COUNT(*)::BIGINT as cnt
        FROM public.purchase_history
        WHERE user_id = user_id_param
    )
    SELECT 
        pd.id,
        pd.purchase_type,
        pd.tokens_purchased,
        pd.tokens_spent,
        pd.amount,
        pd.currency,
        pd.stripe_payment_intent_id,
        pd.status,
        pd.description,
        pd.created_at,
        tc.cnt as total_count
    FROM purchase_data pd
    CROSS JOIN total_count tc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optimized function to get purchase stats (uses indexes efficiently)
CREATE OR REPLACE FUNCTION get_user_purchase_stats_optimized(
    user_id_param TEXT
)
RETURNS TABLE (
    total_purchases BIGINT,
    total_amount DECIMAL(10, 2),
    total_tokens_purchased BIGINT,
    total_tokens_spent BIGINT,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    successful_purchases BIGINT,
    failed_purchases BIGINT,
    avg_purchase_amount DECIMAL(10, 2),
    largest_purchase DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_purchases,
        COALESCE(SUM(ph.amount), 0)::DECIMAL(10, 2) as total_amount,
        COALESCE(SUM(ph.tokens_purchased), 0)::BIGINT as total_tokens_purchased,
        COALESCE(SUM(ph.tokens_spent), 0)::BIGINT as total_tokens_spent,
        MAX(ph.created_at) as last_purchase_date,
        COUNT(*) FILTER (WHERE ph.status = 'completed')::BIGINT as successful_purchases,
        COUNT(*) FILTER (WHERE ph.status = 'failed')::BIGINT as failed_purchases,
        COALESCE(AVG(ph.amount), 0)::DECIMAL(10, 2) as avg_purchase_amount,
        COALESCE(MAX(ph.amount), 0)::DECIMAL(10, 2) as largest_purchase
    FROM public.purchase_history ph
    WHERE ph.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. BATCH INSERT FUNCTION FOR EFFICIENCY
-- ============================================

-- Function to insert multiple purchases efficiently (for bulk operations)
CREATE OR REPLACE FUNCTION batch_insert_purchase_history(
    purchases JSONB
)
RETURNS TABLE (
    inserted_count INTEGER,
    error_count INTEGER
) AS $$
DECLARE
    purchase_item JSONB;
    insert_result INTEGER := 0;
    error_result INTEGER := 0;
BEGIN
    FOR purchase_item IN SELECT * FROM jsonb_array_elements(purchases)
    LOOP
        BEGIN
            INSERT INTO public.purchase_history (
                user_id,
                purchase_type,
                tokens_purchased,
                tokens_spent,
                amount,
                currency,
                stripe_payment_intent_id,
                stripe_charge_id,
                status,
                description,
                metadata,
                created_at
            ) VALUES (
                (purchase_item->>'userId')::TEXT,
                COALESCE(purchase_item->>'purchaseType', 'tokens')::TEXT,
                COALESCE((purchase_item->>'tokensPurchased')::INTEGER, 0),
                COALESCE((purchase_item->>'tokensSpent')::INTEGER, 0),
                (purchase_item->>'amount')::DECIMAL(10, 2),
                COALESCE(purchase_item->>'currency', 'usd')::TEXT,
                purchase_item->>'stripePaymentIntentId',
                purchase_item->>'stripeChargeId',
                COALESCE(purchase_item->>'status', 'completed')::TEXT,
                purchase_item->>'description',
                COALESCE(purchase_item->'metadata', '{}'::jsonb),
                COALESCE((purchase_item->>'createdAt')::TIMESTAMP WITH TIME ZONE, NOW())
            );
            insert_result := insert_result + 1;
        EXCEPTION WHEN OTHERS THEN
            error_result := error_result + 1;
            RAISE NOTICE 'Error inserting purchase: %', SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT insert_result, error_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CONNECTION POOLING OPTIMIZATION
-- ============================================

-- Create function to check table health and suggest maintenance
CREATE OR REPLACE FUNCTION check_purchase_history_health()
RETURNS TABLE (
    total_rows BIGINT,
    rows_last_24h BIGINT,
    avg_rows_per_day DECIMAL,
    table_size TEXT,
    index_size TEXT,
    bloat_estimate TEXT,
    recommendation TEXT
) AS $$
DECLARE
    v_total_rows BIGINT;
    v_rows_24h BIGINT;
    v_table_size TEXT;
    v_index_size TEXT;
BEGIN
    -- Get total rows
    SELECT COUNT(*) INTO v_total_rows FROM public.purchase_history;
    
    -- Get rows in last 24 hours
    SELECT COUNT(*) INTO v_rows_24h 
    FROM public.purchase_history 
    WHERE created_at >= NOW() - INTERVAL '24 hours';
    
    -- Get table size
    SELECT pg_size_pretty(pg_total_relation_size('public.purchase_history')) INTO v_table_size;
    
    -- Get index size
    SELECT pg_size_pretty(pg_indexes_size('public.purchase_history')) INTO v_index_size;
    
    RETURN QUERY SELECT 
        v_total_rows,
        v_rows_24h,
        CASE WHEN v_total_rows > 0 THEN (v_total_rows::DECIMAL / GREATEST(EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 86400, 1)) ELSE 0 END,
        v_table_size,
        v_index_size,
        CASE 
            WHEN v_rows_24h > 10000 THEN 'High volume detected - consider partitioning'
            WHEN v_rows_24h > 5000 THEN 'Moderate volume - monitor performance'
            ELSE 'Normal volume'
        END as bloat_estimate,
        CASE 
            WHEN v_total_rows > 1000000 THEN 'Consider partitioning by date'
            WHEN v_total_rows > 500000 THEN 'Consider archiving old records'
            ELSE 'Table size is manageable'
        END as recommendation
    FROM public.purchase_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. AUTOMATIC CLEANUP FOR OLD RECORDS (OPTIONAL)
-- ============================================

-- Function to archive old purchase records (older than 1 year)
-- Only run this if you want to archive old data
CREATE OR REPLACE FUNCTION archive_old_purchase_history(
    archive_months INTEGER DEFAULT 12
)
RETURNS TABLE (
    archived_count BIGINT
) AS $$
DECLARE
    v_archived_count BIGINT;
BEGIN
    -- Create archive table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.purchase_history_archive (LIKE public.purchase_history INCLUDING ALL);
    
    -- Move old records to archive
    WITH moved AS (
        DELETE FROM public.purchase_history
        WHERE created_at < NOW() - (archive_months || ' months')::INTERVAL
        RETURNING *
    )
    INSERT INTO public.purchase_history_archive
    SELECT * FROM moved;
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. MONITORING AND ALERTS
-- ============================================

-- Function to detect anomalies (failed purchases, duplicates, etc.)
CREATE OR REPLACE FUNCTION detect_purchase_anomalies(
    check_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    anomaly_type TEXT,
    count BIGINT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- High failure rate
    SELECT 
        'high_failure_rate'::TEXT,
        COUNT(*)::BIGINT,
        jsonb_build_object(
            'failure_rate', 
            ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0), 2)
        )
    FROM public.purchase_history
    WHERE created_at >= NOW() - (check_hours || ' hours')::INTERVAL
    HAVING COUNT(*) FILTER (WHERE status = 'failed')::DECIMAL / NULLIF(COUNT(*), 0) > 0.1
    
    UNION ALL
    
    -- Duplicate payment intents
    SELECT 
        'duplicate_payment_intents'::TEXT,
        COUNT(*)::BIGINT,
        jsonb_build_object('payment_intents', array_agg(DISTINCT stripe_payment_intent_id))
    FROM public.purchase_history
    WHERE created_at >= NOW() - (check_hours || ' hours')::INTERVAL
        AND stripe_payment_intent_id IS NOT NULL
    GROUP BY stripe_payment_intent_id
    HAVING COUNT(*) > 1
    
    UNION ALL
    
    -- Missing purchase history for successful payments
    SELECT 
        'missing_history'::TEXT,
        COUNT(*)::BIGINT,
        jsonb_build_object('sample_ids', array_agg(id))
    FROM public.token_transactions
    WHERE created_at >= NOW() - (check_hours || ' hours')::INTERVAL
        AND type = 'purchase'
        AND stripe_payment_intent_id IS NOT NULL
        AND stripe_payment_intent_id NOT IN (
            SELECT stripe_payment_intent_id 
            FROM public.purchase_history 
            WHERE stripe_payment_intent_id IS NOT NULL
        )
    GROUP BY 1
    HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. GRANT PERMISSIONS FOR OPTIMIZED FUNCTIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_recent_purchases_optimized(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_purchase_stats_optimized(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_purchase_history_health() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_purchase_daily_summary() TO authenticated;

-- ============================================
-- 10. VACUUM AND ANALYZE SETTINGS
-- ============================================

-- Set autovacuum settings for high-volume table
ALTER TABLE public.purchase_history SET (
    autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum when 5% of rows change (instead of default 20%)
    autovacuum_analyze_scale_factor = 0.02, -- Analyze when 2% of rows change (instead of default 10%)
    autovacuum_vacuum_cost_delay = 10,      -- Lower delay for faster vacuum
    autovacuum_vacuum_cost_limit = 2000     -- Higher limit for more aggressive vacuum
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'purchase_history'
-- ORDER BY idx_scan DESC;

-- Check table statistics
-- SELECT * FROM check_purchase_history_health();

-- Check for anomalies
-- SELECT * FROM detect_purchase_anomalies(24);

-- ============================================
-- NOTES FOR SCALING
-- ============================================
-- 1. If table grows beyond 10M rows, consider partitioning by date
-- 2. Monitor index usage and remove unused indexes
-- 3. Run VACUUM ANALYZE periodically during low-traffic hours
-- 4. Consider read replicas for analytics queries
-- 5. Use connection pooling (PgBouncer) for high concurrency
-- 6. Monitor query performance with pg_stat_statements
-- 7. Set up alerts for high failure rates or anomalies

