-- ============================================================================
-- CREATE MISSING GET FUNCTIONS ONLY
-- ============================================================================
-- This ONLY creates the get_all functions that pages are calling
-- Does NOT modify anything else
-- ============================================================================

-- Drop and recreate get_all_winner_takes_all_sessions
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
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

-- Drop and recreate get_all_hot_sell_sessions
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
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

-- Verify functions were created
DO $$
BEGIN
    RAISE NOTICE '✅ Functions created successfully:';
    RAISE NOTICE '  - get_all_winner_takes_all_sessions()';
    RAISE NOTICE '  - get_all_hot_sell_sessions()';
END $$;

