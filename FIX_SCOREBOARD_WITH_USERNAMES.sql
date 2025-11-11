-- ============================================================================
-- FIX SCOREBOARD TO SHOW USERNAMES
-- ============================================================================
-- Updates get_all_hot_sell_sessions to include username from public.users
-- ============================================================================

BEGIN;

SELECT '🔧 Fixing scoreboard to show usernames...' as step;

-- Update get_all_hot_sell_sessions to include username
CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        s.id,
        s.config_id,
        s.prize_pool,
        s.base_price,
        s.participants_count,
        s.max_participants,
        s.status,
        s.rng_seed,
        s.first_place_user_id,
        s.second_place_user_id,
        s.third_place_user_id,
        s.created_at,
        s.updated_at,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', p.id,
              'user_id', p.user_id,
              'score', p.score,
              'accuracy', p.accuracy,
              'joined_at', p.joined_at,
              'completed_at', p.completed_at,
              'username', COALESCE(u.username, 'Anonymous Player')
            )
            ORDER BY p.joined_at ASC
          ), '[]'::json)
          FROM public.hot_sell_participants p
          LEFT JOIN public.users u ON u.id = p.user_id
          WHERE p.session_id = s.id
        ) as participants
      FROM public.hot_sell_sessions s
      WHERE s.status IN ('active', 'waiting', 'completed')
      ORDER BY s.created_at DESC
      LIMIT 100
    ) t
  );
END;
$$;

SELECT '✅ get_all_hot_sell_sessions updated with usernames' as result;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

SELECT '✅ Permissions granted' as result;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 SCOREBOARD FIX COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ Usernames will now appear in scoreboard' as status;
SELECT '✅ Scoreboard dropdown will populate correctly' as status;
SELECT '🎉 ================================' as message;

