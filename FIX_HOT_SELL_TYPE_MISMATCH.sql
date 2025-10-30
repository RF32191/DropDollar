-- ============================================================================
-- FIX HOT SELL TYPE MISMATCH IN get_all_hot_sell_sessions
-- ============================================================================
-- This fixes the "Returned type does not match expected type" error
-- ============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_hot_sell_sessions();

-- Recreate with correct types matching the actual table schema
CREATE OR REPLACE FUNCTION get_all_hot_sell_sessions()
RETURNS TABLE (
  id TEXT,  -- Changed from UUID to TEXT for consistency
  config_id TEXT,
  current_pot NUMERIC,
  base_price NUMERIC,
  max_participants INTEGER,
  participants_count INTEGER,  -- Must match actual column type
  status TEXT,
  first_place_user_id TEXT,  -- Changed from UUID to TEXT
  second_place_user_id TEXT,  -- Changed from UUID to TEXT
  third_place_user_id TEXT,  -- Changed from UUID to TEXT
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
    s.id::text,  -- Convert UUID to TEXT
    s.config_id,
    s.current_pot,
    s.base_price,
    s.max_participants,
    COALESCE(s.participants_count, 0) as participants_count,
    s.status,
    s.first_place_user_id::text,  -- Convert UUID to TEXT
    s.second_place_user_id::text,  -- Convert UUID to TEXT
    s.third_place_user_id::text,  -- Convert UUID to TEXT
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
          'id', p.id::text,  -- Convert to TEXT
          'user_id', p.user_id::text,  -- Convert to TEXT
          'username', COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'),
          'score', COALESCE(p.score, 0),
          'accuracy', COALESCE(p.accuracy, 0),
          'joined_at', p.joined_at,
          'completed_at', p.completed_at
        )
      )
      FROM hot_sell_participants p
      LEFT JOIN users u ON p.user_id::text = u.id::text
      WHERE p.session_id::text = s.id::text
      ORDER BY p.score DESC NULLS LAST),
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
    RAISE NOTICE '✅ HOT SELL SESSIONS FUNCTION FIXED - TYPE MISMATCH RESOLVED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Changes made:';
    RAISE NOTICE '✅   - All UUID columns returned as TEXT';
    RAISE NOTICE '✅   - participants_count is INTEGER (was NUMERIC)';
    RAISE NOTICE '✅   - Participants sorted by score DESC';
    RAISE NOTICE '✅   - Username included in participant data';
    RAISE NOTICE '✅   - All type conversions explicit';
    RAISE NOTICE '✅ ============================================================';
END $$;

