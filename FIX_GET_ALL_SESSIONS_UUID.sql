-- ============================================================================
-- FIX GET_ALL_SESSIONS FUNCTIONS - TEXT = UUID ERROR
-- ============================================================================
-- This fixes the "operator does not exist: text = uuid" error in session listing
-- ============================================================================

-- ============================================================================
-- Fix get_all_hot_sell_sessions function
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_hot_sell_sessions() CASCADE;

CREATE OR REPLACE FUNCTION get_all_hot_sell_sessions()
RETURNS TABLE (
  id TEXT,
  config_id TEXT,
  current_pool NUMERIC,
  base_price NUMERIC,
  participants_count INTEGER,
  status TEXT,
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
    s.created_at,
    s.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id::TEXT,
            'user_id', p.user_id::TEXT,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.hot_sell_participants p
        WHERE p.session_id = s.id  -- UUID = UUID comparison (correct!)
      ),
      '[]'::json
    ) as participants
  FROM public.hot_sell_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_hot_sell_sessions() TO authenticated, anon;

-- ============================================================================
-- Fix get_all_winner_takes_all_sessions function
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION get_all_winner_takes_all_sessions()
RETURNS TABLE (
  id TEXT,
  config_id TEXT,
  current_pool NUMERIC,
  base_price NUMERIC,
  participants_count INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  timer_duration INTEGER,
  winner_user_id TEXT,
  prize_amount NUMERIC,
  platform_fee NUMERIC,
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
    s.winner_user_id::TEXT,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id::TEXT,
            'user_id', p.user_id::TEXT,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.winner_takes_all_participants p
        WHERE p.session_id = s.id  -- UUID = UUID comparison (correct!)
      ),
      '[]'::json
    ) as participants
  FROM public.winner_takes_all_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_winner_takes_all_sessions() TO authenticated, anon;

-- ============================================================================
-- Fix get_all_1v1_sessions function
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_1v1_sessions() CASCADE;

CREATE OR REPLACE FUNCTION get_all_1v1_sessions()
RETURNS TABLE (
  id UUID,
  config_id TEXT,
  current_pool NUMERIC,
  prize_pool NUMERIC,
  participants_count INTEGER,
  max_participants INTEGER,
  status TEXT,
  winner_user_id TEXT,
  prize_amount NUMERIC,
  platform_fee NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.config_id::TEXT,
    s.current_pool,
    s.prize_pool,
    s.participants_count,
    s.max_participants,
    s.status::TEXT,
    s.winner_user_id::TEXT,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    s.completed_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id::TEXT,
            'user_id', p.user_id::TEXT,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.one_v_one_participants p
        WHERE p.session_id = s.id  -- UUID = UUID comparison (correct!)
      ),
      '[]'::json
    ) as participants
  FROM public.one_v_one_sessions s
  WHERE s.status IN ('waiting', 'active')
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_1v1_sessions() TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test Hot Sell sessions
SELECT 'Hot Sell Sessions' as test, COUNT(*) as count 
FROM get_all_hot_sell_sessions();

-- Test Winner Takes All sessions
SELECT 'Winner Takes All Sessions' as test, COUNT(*) as count 
FROM get_all_winner_takes_all_sessions();

-- Test 1v1 sessions
SELECT '1v1 Sessions' as test, COUNT(*) as count 
FROM get_all_1v1_sessions();

-- Show function signatures
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
  'get_all_hot_sell_sessions',
  'get_all_winner_takes_all_sessions',
  'get_all_1v1_sessions'
)
ORDER BY proname;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ get_all_hot_sell_sessions: Fixed UUID comparisons
-- ✅ get_all_winner_takes_all_sessions: Fixed UUID comparisons
-- ✅ get_all_1v1_sessions: Fixed UUID comparisons
-- ✅ All participant queries use UUID = UUID (correct!)
-- ✅ No more TEXT = UUID errors!
-- ============================================================================

SELECT '✅ All get_all_sessions functions fixed!' as status;

