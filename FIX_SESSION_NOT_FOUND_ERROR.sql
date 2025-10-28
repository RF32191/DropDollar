-- ============================================================================
-- FIX SESSION NOT FOUND ERROR - COMPLETE FIX
-- ============================================================================
-- This does ONLY what's needed to fix "Session not found" errors
-- Creates the get functions AND ensures sessions exist
-- ============================================================================

-- STEP 1: Create the get_all_winner_takes_all_sessions function
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot NUMERIC,
    base_price NUMERIC,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
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
        s.id,
        s.config_id,
        s.current_pot,
        s.base_price,
        s.participants_count,
        s.status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 1800) as timer_duration,
        s.winner_user_id,
        s.prize_amount,
        s.platform_fee,
        s.created_at,
        s.updated_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'user_id', p.user_id,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.winner_takes_all_participants p
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.winner_takes_all_sessions s
    WHERE s.status IN ('waiting', 'active')
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

-- STEP 2: Create the get_all_hot_sell_sessions function
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot NUMERIC,
    base_price NUMERIC,
    max_participants INTEGER,
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        s.current_pot,
        s.base_price,
        s.max_participants,
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
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'user_id', p.user_id,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at
                    )
                )
                FROM public.hot_sell_participants p
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.hot_sell_sessions s
    WHERE s.status IN ('waiting', 'active')
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

-- STEP 3: Create Winner Takes All sessions (one per config)
INSERT INTO winner_takes_all_sessions (
    config_id,
    current_pot,
    base_price,
    participants_count,
    status,
    created_at,
    updated_at
)
SELECT 
    c.id,
    0,
    c.base_price,
    0,
    'waiting',
    NOW(),
    NOW()
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
    SELECT 1 FROM winner_takes_all_sessions s 
    WHERE s.config_id = c.id 
    AND s.status IN ('waiting', 'active')
);

-- STEP 4: Create Hot Sell sessions (one per config)
INSERT INTO hot_sell_sessions (
    config_id,
    current_pot,
    base_price,
    max_participants,
    status,
    created_at,
    updated_at
)
SELECT 
    c.id,
    0,
    c.base_price,
    c.max_participants,
    'waiting',
    NOW(),
    NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
    SELECT 1 FROM hot_sell_sessions s 
    WHERE s.config_id = c.id 
    AND s.status IN ('waiting', 'active')
);

-- STEP 5: Verify everything worked
DO $$
DECLARE
    wta_sessions_count INTEGER;
    hs_sessions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO wta_sessions_count FROM winner_takes_all_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO hs_sessions_count FROM hot_sell_sessions WHERE status IN ('waiting', 'active');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ SESSION FIX COMPLETE';
    RAISE NOTICE '  Winner Takes All active sessions: %', wta_sessions_count;
    RAISE NOTICE '  Hot Sell active sessions: %', hs_sessions_count;
    RAISE NOTICE '  Functions created: get_all_winner_takes_all_sessions, get_all_hot_sell_sessions';
    RAISE NOTICE '';
    
    IF wta_sessions_count > 0 AND hs_sessions_count > 0 THEN
        RAISE NOTICE '✅ PAGES SHOULD NOW LOAD WITHOUT "SESSION NOT FOUND" ERRORS';
    ELSE
        RAISE WARNING 'Sessions were not created - check if configs exist in winner_takes_all_configs and hot_sell_configs tables';
    END IF;
END $$;

