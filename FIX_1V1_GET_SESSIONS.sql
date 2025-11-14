-- ============================================================================
-- FIX get_all_1v1_sessions FUNCTION
-- ============================================================================
-- Remove username from participants table (doesn't exist)
-- Join with users table to get username
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_1v1_sessions();

CREATE OR REPLACE FUNCTION public.get_all_1v1_sessions()
RETURNS TABLE (
    id TEXT,
    config_id TEXT,
    current_pot NUMERIC,
    prize_pool NUMERIC,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    loser_user_id TEXT,
    winner_prize NUMERIC,
    loser_prize NUMERIC,
    platform_fee NUMERIC,
    completed_at TIMESTAMPTZ,
    rng_seed INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sess.id::TEXT,
        sess.config_id::TEXT,
        COALESCE(sess.current_pot, 0)::NUMERIC,
        COALESCE(sess.prize_pool, 0)::NUMERIC,
        COALESCE(sess.participants_count, 0)::INTEGER,
        sess.status::TEXT,
        sess.timer_started_at,
        COALESCE(sess.timer_duration, 7200)::INTEGER,
        sess.winner_user_id::TEXT,
        sess.loser_user_id::TEXT,
        COALESCE(sess.winner_prize, 0)::NUMERIC,
        COALESCE(sess.loser_prize, 0)::NUMERIC,
        COALESCE(sess.platform_fee, 0)::NUMERIC,
        sess.completed_at,
        COALESCE(sess.rng_seed, 1)::INTEGER,
        sess.created_at,
        sess.updated_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', part.id::TEXT,
                    'user_id', part.user_id::TEXT,
                    'username', COALESCE(u.username, 'Anonymous'),
                    'score', part.score,
                    'accuracy', part.accuracy,
                    'joined_at', part.joined_at,
                    'completed_at', part.completed_at
                )
            ) FILTER (WHERE part.id IS NOT NULL),
            '[]'::jsonb
        ) as participants
    FROM public.one_v_one_sessions sess
    LEFT JOIN public.one_v_one_participants part ON part.session_id = sess.id
    LEFT JOIN public.users u ON u.id = part.user_id
    WHERE sess.status IN ('waiting', 'active')
    GROUP BY 
        sess.id,
        sess.config_id,
        sess.current_pot,
        sess.prize_pool,
        sess.participants_count,
        sess.status,
        sess.timer_started_at,
        sess.timer_duration,
        sess.winner_user_id,
        sess.loser_user_id,
        sess.winner_prize,
        sess.loser_prize,
        sess.platform_fee,
        sess.completed_at,
        sess.rng_seed,
        sess.created_at,
        sess.updated_at
    ORDER BY sess.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

SELECT '✅ get_all_1v1_sessions() function fixed - now joins with users table for username' as status;

-- Test the function
SELECT '📊 TESTING get_all_1v1_sessions():' as info;
SELECT * FROM get_all_1v1_sessions();

