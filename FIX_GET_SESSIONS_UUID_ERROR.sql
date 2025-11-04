-- ============================================================================
-- FIX GET_ALL_SESSIONS FUNCTIONS (UUID COMPARISON ERROR)
-- ============================================================================
-- Fixed: participant WHERE clause to use UUID comparison
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
        WHERE p.session_id = s.id  -- FIXED: UUID = UUID (removed ::TEXT)
      ),
      '[]'::json
    ) as participants
  FROM public.winner_takes_all_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

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
        WHERE p.session_id = s.id  -- FIXED: UUID = UUID (removed ::TEXT)
      ),
      '[]'::json
    ) as participants
  FROM public.hot_sell_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

-- ============================================================================
-- TEST THE FUNCTIONS
-- ============================================================================

SELECT 'Winner Takes All Sessions:' as test, COUNT(*) as count FROM get_all_winner_takes_all_sessions();
SELECT 'Hot Sell Sessions:' as test, COUNT(*) as count FROM get_all_hot_sell_sessions();

-- ============================================================================
-- RESULT: Functions now use UUID = UUID comparison (no casting errors)
-- ============================================================================

