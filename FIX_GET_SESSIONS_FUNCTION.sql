-- ============================================================================
-- FIX GET_ALL_WINNER_TAKES_ALL_SESSIONS FUNCTION
-- ============================================================================
-- The frontend calls this function to load sessions
-- ============================================================================

-- ============================================================================
-- 1. DROP AND RECREATE THE FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_winner_takes_all_sessions();

CREATE OR REPLACE FUNCTION get_all_winner_takes_all_sessions()
RETURNS TABLE (
  id TEXT,
  config_id TEXT,
  current_pool DECIMAL(10,2),
  base_price DECIMAL(10,2),
  participants_count INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  timer_duration INTEGER,
  winner_user_id UUID,
  prize_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::TEXT,
    s.config_id::TEXT,
    s.current_pool,
    s.base_price,
    s.participants_count,
    s.status::TEXT,
    s.timer_started_at,
    s.timer_duration,
    s.winner_user_id,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.winner_takes_all_participants p
        WHERE p.session_id = s.id::TEXT
      ),
      '[]'::json
    ) as participants
  FROM public.winner_takes_all_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

-- ============================================================================
-- 2. CREATE SIMILAR FUNCTION FOR HOT SELL
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_hot_sell_sessions();

CREATE OR REPLACE FUNCTION get_all_hot_sell_sessions()
RETURNS TABLE (
  id TEXT,
  config_id TEXT,
  current_pool DECIMAL(10,2),
  base_price DECIMAL(10,2),
  participants_count INTEGER,
  max_participants INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  timer_duration INTEGER,
  winner_user_id UUID,
  prize_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::TEXT,
    s.config_id::TEXT,
    s.current_pool,
    s.base_price,
    s.participants_count,
    s.max_participants,
    s.status::TEXT,
    s.timer_started_at,
    s.timer_duration,
    s.winner_user_id,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.hot_sell_participants p
        WHERE p.session_id = s.id::TEXT
      ),
      '[]'::json
    ) as participants
  FROM public.hot_sell_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

-- ============================================================================
-- 3. TEST THE FUNCTIONS
-- ============================================================================

SELECT '=== TEST get_all_winner_takes_all_sessions() ===' as info;
SELECT * FROM get_all_winner_takes_all_sessions();

SELECT '=== TEST get_all_hot_sell_sessions() ===' as info;
SELECT * FROM get_all_hot_sell_sessions();

-- ============================================================================
-- 4. COUNT ACTIVE SESSIONS
-- ============================================================================

SELECT 'Winner Takes All Active Sessions:' as info, COUNT(*) as total 
FROM public.winner_takes_all_sessions WHERE status = 'active';

SELECT 'Hot Sell Active Sessions:' as info, COUNT(*) as total 
FROM public.hot_sell_sessions WHERE status = 'active';

-- ============================================================================
-- RESULT: Functions should now return all active sessions with participants
-- ============================================================================

