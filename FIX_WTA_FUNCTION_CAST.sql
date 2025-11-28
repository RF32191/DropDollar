-- ============================================================================
-- 🔧 FIX WTA: Function UUID Cast Issue
-- ============================================================================

-- Check column types first
SELECT '📋 SESSION ID TYPE:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'id';

SELECT '📋 PARTICIPANT SESSION_ID TYPE:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_participants' AND column_name = 'session_id';

-- Drop and recreate function with proper casting
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id TEXT, config_id TEXT, current_pot NUMERIC, base_price NUMERIC,
    participants_count INTEGER, max_participants INTEGER, status TEXT,
    timer_started_at TIMESTAMPTZ, timer_duration INTEGER, winner_user_id TEXT,
    winner_prize NUMERIC, platform_fee NUMERIC, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, rng_seed INTEGER, participants JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::TEXT, 
        s.config_id::TEXT, 
        COALESCE(s.prize_pool, 0)::NUMERIC as current_pot,
        COALESCE(s.base_price, 1)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER, 
        COALESCE(s.max_participants, 1000)::INTEGER, 
        s.status::TEXT,
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
            FROM winner_takes_all_participants p 
            -- CAST BOTH SIDES TO TEXT
            WHERE p.session_id::TEXT = s.id::TEXT
        ), '[]'::jsonb)
    FROM winner_takes_all_sessions s 
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;

-- Now run the session creation
DELETE FROM winner_takes_all_participants;
DELETE FROM winner_takes_all_sessions;

INSERT INTO winner_takes_all_sessions (
    id, config_id, status, participants_count, prize_pool, base_price,
    timer_started_at, timer_duration, winner_user_id, winner_prize,
    platform_fee_amount, rng_seed, created_at, updated_at
)
SELECT 
    gen_random_uuid(), c.id, 'waiting', 0, 0, COALESCE(c.base_price, c.entry_fee, 2),
    NULL, 60, NULL, 0, 0, floor(random() * 99999 + 1)::integer, NOW(), NOW()
FROM winner_takes_all_configs c;

-- Verify
SELECT '✅ SESSIONS CREATED:' as info;
SELECT id::TEXT, config_id, status, timer_duration FROM winner_takes_all_sessions;

-- Test function
SELECT '✅ FUNCTION TEST:' as info;
SELECT id, config_id, status FROM get_all_winner_takes_all_sessions() LIMIT 5;

SELECT '✅ DONE - Function fixed with ::TEXT cast on both sides' as result;

