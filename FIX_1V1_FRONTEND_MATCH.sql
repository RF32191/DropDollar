-- ============================================================================
-- FIX 1V1 SESSIONS TO MATCH FRONTEND INTERFACE
-- ============================================================================
-- Frontend expects: max_participants, prize_amount, platform_fee
-- We were returning: winner_prize, loser_prize, etc.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_1v1_sessions();

CREATE OR REPLACE FUNCTION public.get_all_1v1_sessions()
RETURNS TABLE (
    id TEXT,
    config_id TEXT,
    current_pool NUMERIC,
    prize_pool NUMERIC,
    participants_count INTEGER,
    max_participants INTEGER,  -- Frontend expects this
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    prize_amount NUMERIC,  -- Frontend expects this (not winner_prize)
    platform_fee NUMERIC,  -- Frontend expects this
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rng_seed INTEGER,
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
        2::INTEGER as max_participants,  -- 1v1 always has max 2 players
        sess.status::TEXT,
        sess.timer_started_at,
        COALESCE(sess.timer_duration, 7200)::INTEGER,
        sess.winner_user_id::TEXT,
        COALESCE(sess.winner_prize, 0)::NUMERIC as prize_amount,  -- Map winner_prize to prize_amount
        COALESCE(sess.platform_fee, 0)::NUMERIC,
        sess.created_at,
        sess.updated_at,
        sess.completed_at,
        COALESCE(sess.rng_seed, 1)::INTEGER,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', part.id::TEXT,
                    'user_id', part.user_id::TEXT,
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
        sess.winner_prize,
        sess.platform_fee,
        sess.created_at,
        sess.updated_at,
        sess.completed_at,
        sess.rng_seed
    ORDER BY sess.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

SELECT '✅ get_all_1v1_sessions() fixed to match frontend interface' as status;

-- Test the function
SELECT '📊 TESTING get_all_1v1_sessions():' as info;
SELECT id, config_id, status, participants_count, max_participants, current_pool, prize_pool
FROM get_all_1v1_sessions();

SELECT '
✅ Function now returns fields frontend expects:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- max_participants (always 2 for 1v1)
- prize_amount (mapped from winner_prize)
- platform_fee
- No more winner_prize, loser_prize fields

Refresh your 1v1 page now! 🚀
' as summary;

