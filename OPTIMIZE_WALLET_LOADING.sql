-- ============================================================================
-- OPTIMIZE WALLET LOADING AND HOT SELL PRIZE POOL DISPLAY
-- This SQL will make wallets load instantly on login and fix prize pool display
-- ============================================================================

-- ============================================================================
-- PART 1: ADD DATABASE INDEXES FOR LIGHTNING-FAST WALLET QUERIES
-- ============================================================================

-- Index on users.email for super-fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
ON public.users(email);

-- Index on users.id for fast profile queries
CREATE INDEX IF NOT EXISTS idx_users_id 
ON public.users(id);

-- Index on users tokens for fast balance checks
CREATE INDEX IF NOT EXISTS idx_users_tokens 
ON public.users(purchased_tokens, won_tokens);

-- Index on hot_sell_sessions for fast active session lookups
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_status 
ON public.hot_sell_sessions(status, created_at DESC);

-- Index on hot_sell_sessions config_id for joining with configs
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_config 
ON public.hot_sell_sessions(config_id, status);

-- Index on winner_takes_all_sessions for fast lookups
CREATE INDEX IF NOT EXISTS idx_wta_sessions_status 
ON public.winner_takes_all_sessions(status, created_at DESC);

-- Index on winner_takes_all_sessions config_id
CREATE INDEX IF NOT EXISTS idx_wta_sessions_config 
ON public.winner_takes_all_sessions(config_id, status);

-- Index on one_v_one_sessions for fast lookups
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_status 
ON public.one_v_one_sessions(status, created_at DESC);

-- Index on one_v_one_sessions config_id
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_config 
ON public.one_v_one_sessions(config_id, status);

-- Index on participants tables for fast user lookups
CREATE INDEX IF NOT EXISTS idx_hot_sell_participants_user 
ON public.hot_sell_participants(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_wta_participants_user 
ON public.winner_takes_all_participants(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_1v1_participants_user 
ON public.one_v_one_participants(user_id, session_id);

-- Index on participants tables for fast session lookups
CREATE INDEX IF NOT EXISTS idx_hot_sell_participants_session 
ON public.hot_sell_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_wta_participants_session 
ON public.winner_takes_all_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_1v1_participants_session 
ON public.one_v_one_participants(session_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Database indexes created for lightning-fast queries!';
END $$;

-- ============================================================================
-- PART 2: OPTIMIZE get_all_hot_sell_sessions TO RETURN prize_pool
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions();

CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id::TEXT,
        'prize_pool', COALESCE(s.prize_pool, 0),  -- ACTUAL token pool
        'base_price', s.base_price,
        'participants_count', s.participants_count,
        'max_participants', s.max_participants,
        'status', s.status::TEXT,
        'created_at', s.created_at,
        'participants', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', p.user_id::TEXT,
                'score', p.score,
                'joined_at', p.joined_at
              )
            )
            FROM public.hot_sell_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        )
      )
    )
    FROM public.hot_sell_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ get_all_hot_sell_sessions updated to return prize_pool!';
END $$;

-- ============================================================================
-- PART 3: OPTIMIZE get_all_winner_takes_all_sessions
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions();

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id::TEXT,
        'current_pool', COALESCE(s.current_pool, 0),  -- Current accumulated pool
        'base_price', s.base_price,
        'participants_count', s.participants_count,
        'status', s.status::TEXT,
        'timer_duration', s.timer_duration,
        'created_at', s.created_at,
        'participants', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', p.user_id::TEXT,
                'score', p.score,
                'joined_at', p.joined_at
              )
            )
            FROM public.winner_takes_all_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        )
      )
    )
    FROM public.winner_takes_all_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ get_all_winner_takes_all_sessions optimized!';
END $$;

-- ============================================================================
-- PART 4: ADD MATERIALIZED VIEW FOR SUPER-FAST USER STATS (OPTIONAL)
-- ============================================================================

-- Create a materialized view for user stats that refreshes periodically
DROP MATERIALIZED VIEW IF EXISTS user_wallet_stats CASCADE;

CREATE MATERIALIZED VIEW user_wallet_stats AS
SELECT 
  id,
  email,
  username,
  purchased_tokens,
  won_tokens,
  (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) as total_tokens,
  last_login,
  created_at
FROM public.users;

-- Index on the materialized view
CREATE UNIQUE INDEX idx_user_wallet_stats_id ON user_wallet_stats(id);
CREATE INDEX idx_user_wallet_stats_email ON user_wallet_stats(email);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_wallet_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_wallet_stats;
END;
$$;

-- Note: You can set up a cron job to refresh this every minute for real-time stats
-- Or refresh it after any token transaction

DO $$ BEGIN
  RAISE NOTICE '✅ Materialized view created for ultra-fast wallet queries!';
  RAISE NOTICE '💡 TIP: Refresh with: SELECT refresh_user_wallet_stats();';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_index_count INTEGER;
  v_function_count INTEGER;
BEGIN
  -- Count indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

  -- Count functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_all_hot_sell_sessions',
    'get_all_winner_takes_all_sessions',
    'refresh_user_wallet_stats'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ OPTIMIZATION COMPLETE!';
  RAISE NOTICE '📊 Total Indexes: %', v_index_count;
  RAISE NOTICE '📊 Optimized Functions: %', v_function_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '🚀 Wallets will now load INSTANTLY!';
  RAISE NOTICE '🎯 Hot Sell prize pools will show REAL values!';
  RAISE NOTICE '========================================';
END $$;

