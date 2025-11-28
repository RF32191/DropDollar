-- ============================================================================
-- 🔧 FIX WTA: Return current_pool not current_pot
-- ============================================================================
-- Frontend expects: current_pool
-- SQL was returning: current_pot
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id TEXT, 
    config_id TEXT, 
    current_pool NUMERIC,  -- Changed from current_pot to current_pool!
    base_price NUMERIC,
    participants_count INTEGER, 
    max_participants INTEGER, 
    status TEXT,
    timer_started_at TIMESTAMPTZ, 
    timer_duration INTEGER, 
    winner_user_id TEXT,
    winner_prize NUMERIC, 
    platform_fee NUMERIC, 
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ, 
    completed_at TIMESTAMPTZ, 
    rng_seed INTEGER, 
    participants JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::TEXT, 
        s.config_id::TEXT, 
        COALESCE(s.prize_pool, 0)::NUMERIC as current_pool,  -- Now named current_pool!
        COALESCE(s.base_price, 2)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER, 
        1000::INTEGER as max_participants, 
        COALESCE(s.status, 'waiting')::TEXT,
        s.timer_started_at, 
        COALESCE(s.timer_duration, 60)::INTEGER,
        s.winner_user_id::TEXT, 
        COALESCE(s.winner_prize, 0)::NUMERIC, 
        COALESCE(s.platform_fee_amount, 0)::NUMERIC,
        s.created_at, 
        s.updated_at, 
        s.completed_at, 
        COALESCE(s.rng_seed, 1)::INTEGER,
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id::TEXT, 
                'user_id', p.user_id::TEXT, 
                'username', COALESCE(p.username, 'Player'),
                'score', p.score, 
                'accuracy', p.accuracy, 
                'joined_at', p.joined_at, 
                'completed_at', p.completed_at
            ) ORDER BY COALESCE(p.score, 0) DESC)
            FROM winner_takes_all_participants p WHERE p.session_id = s.id
        ), '[]'::jsonb) as participants
    FROM winner_takes_all_sessions s 
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;

-- Test
SELECT '✅ FUNCTION NOW RETURNS current_pool:' as info;
SELECT id, config_id, current_pool, participants_count 
FROM get_all_winner_takes_all_sessions()
WHERE participants_count > 0;

SELECT '
============================================
✅ COLUMN NAME FIXED!
============================================
Function now returns: current_pool
Frontend expects: current_pool ✓
============================================
' as done;

