-- ============================================================================
-- FIX HOT SELL SESSIONS TO INCLUDE USERNAMES IN PARTICIPANTS
-- ============================================================================
-- This updates get_all_hot_sell_sessions to include usernames with each participant
-- ============================================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_all_hot_sell_sessions();

CREATE OR REPLACE FUNCTION get_all_hot_sell_sessions()
RETURNS TABLE (
  id UUID,
  config_id TEXT,
  current_pot NUMERIC,
  base_price NUMERIC,
  max_participants INTEGER,
  participants_count INTEGER,
  status TEXT,
  first_place_user_id UUID,
  second_place_user_id UUID,
  third_place_user_id UUID,
  first_place_prize NUMERIC,
  second_place_prize NUMERIC,
  third_place_prize NUMERIC,
  platform_fee NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  participants JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.config_id,
    s.current_pot,
    s.base_price,
    s.max_participants,
    COALESCE(s.participants_count, 0) as participants_count,
    s.status,
    s.first_place_user_id,
    s.second_place_user_id,
    s.third_place_user_id,
    s.first_place_prize,
    s.second_place_prize,
    s.third_place_prize,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    s.completed_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'user_id', p.user_id,
          'username', COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'),
          'score', p.score,
          'accuracy', p.accuracy,
          'joined_at', p.joined_at,
          'completed_at', p.completed_at
        )
      )
      FROM hot_sell_participants p
      LEFT JOIN users u ON p.user_id::text = u.id::text
      WHERE p.session_id = s.id),
      '[]'::jsonb
    ) as participants
  FROM hot_sell_sessions s
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_hot_sell_sessions() TO authenticated, anon, service_role;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ HOT SELL SESSIONS FUNCTION UPDATED WITH USERNAMES!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ The get_all_hot_sell_sessions() function now includes:';
    RAISE NOTICE '✅   - username field in participants array';
    RAISE NOTICE '✅   - Fallback to email prefix if no username';
    RAISE NOTICE '✅   - Fallback to "Player" if no email';
    RAISE NOTICE '✅ ============================================================';
END $$;

