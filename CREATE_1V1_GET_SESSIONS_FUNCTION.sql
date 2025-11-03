-- ============================================================================
-- CREATE get_all_1v1_sessions FUNCTION
-- ============================================================================
-- This function returns all 1v1 sessions with participant details
-- Required by the 1v1 tournaments page
-- ============================================================================

-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS get_all_1v1_sessions();

-- Create the function (Mixed types: id=UUID, config_id=TEXT, winner_user_id=UUID)
CREATE OR REPLACE FUNCTION get_all_1v1_sessions()
RETURNS TABLE (
  id UUID,
  config_id TEXT,
  current_pool DECIMAL(10,2),
  prize_pool DECIMAL(10,2),
  participants_count INTEGER,
  max_participants INTEGER,
  status TEXT,
  winner_user_id UUID,
  prize_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
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
    s.status,
    s.winner_user_id,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    s.completed_at,
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
        FROM public.one_v_one_participants p
        WHERE p.session_id = s.id
      ),
      '[]'::json
    ) as participants
  FROM public.one_v_one_sessions s
  ORDER BY s.created_at DESC;
END;
$$;

-- Test the function
SELECT * FROM get_all_1v1_sessions() LIMIT 5;

-- Verify it works
DO $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count FROM get_all_1v1_sessions();
  RAISE NOTICE '✅ Function created! Found % sessions', session_count;
END $$;

