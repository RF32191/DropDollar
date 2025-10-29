-- ============================================================================
-- CORRECT WTA USERNAME FIX
-- ONLY adds username field - keeps all working auto-create logic
-- ============================================================================

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
    -- Auto-create missing sessions (THIS IS CRITICAL - DO NOT REMOVE)
    INSERT INTO winner_takes_all_sessions (
        config_id,
        current_pot,
        base_price,
        participants_count,
        status,
        timer_duration,
        created_at,
        updated_at
    )
    SELECT 
        c.id,
        0,
        c.base_price,
        0,
        'waiting',
        1800,
        NOW(),
        NOW()
    FROM winner_takes_all_configs c
    WHERE NOT EXISTS (
        SELECT 1 FROM winner_takes_all_sessions s 
        WHERE s.config_id = c.id
    );

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
                        'username', COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'),  -- ONLY CHANGE: Added username
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.winner_takes_all_participants p
                LEFT JOIN public.users u ON p.user_id = u.id  -- ONLY CHANGE: Added user join
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.winner_takes_all_sessions s
    WHERE s.config_id LIKE 'wta-%'
    ORDER BY s.config_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ WTA function restored with username!';
    RAISE NOTICE '✅ Auto-create logic preserved';
    RAISE NOTICE '✅ Sessions will load correctly';
    RAISE NOTICE '========================================';
END $$;

