-- ============================================================================
-- EMERGENCY WTA SESSION FIX
-- Create sessions manually and fix the function
-- ============================================================================

-- STEP 1: Check what we have
DO $$
DECLARE
    config_count INTEGER;
    session_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO config_count FROM winner_takes_all_configs;
    SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CURRENT STATE:';
    RAISE NOTICE 'Configs: %', config_count;
    RAISE NOTICE 'Sessions: %', session_count;
    RAISE NOTICE '========================================';
END $$;

-- STEP 2: Delete any broken sessions
DELETE FROM winner_takes_all_participants;
DELETE FROM winner_takes_all_sessions;

-- STEP 3: Create fresh sessions for ALL configs
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
    id,
    0,
    base_price,
    0,
    'waiting',
    1800,
    NOW(),
    NOW()
FROM winner_takes_all_configs
WHERE id LIKE 'wta-%'
ORDER BY base_price;

-- STEP 4: Verify sessions were created
DO $$
DECLARE
    new_session_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO new_session_count FROM winner_takes_all_sessions;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SESSIONS CREATED: %', new_session_count;
    RAISE NOTICE '========================================';
END $$;

-- STEP 5: Show what was created
SELECT 
    'CREATED SESSIONS' as status,
    config_id,
    id as session_id,
    current_pot,
    base_price,
    participants_count,
    status,
    created_at
FROM winner_takes_all_sessions
ORDER BY base_price
LIMIT 20;

-- STEP 6: Recreate the get function with auto-create
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
    -- Auto-create missing sessions
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
    WHERE c.id LIKE 'wta-%'
    AND NOT EXISTS (
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
                        'username', COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'),
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.winner_takes_all_participants p
                LEFT JOIN public.users u ON p.user_id = u.id
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

-- STEP 7: Test the function
SELECT 
    'FUNCTION TEST' as test,
    config_id,
    current_pot,
    participants_count,
    status
FROM public.get_all_winner_takes_all_sessions()
LIMIT 10;

-- STEP 8: Final verification
DO $$
DECLARE
    final_config_count INTEGER;
    final_session_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_config_count FROM winner_takes_all_configs WHERE id LIKE 'wta-%';
    SELECT COUNT(*) INTO final_session_count FROM winner_takes_all_sessions WHERE config_id LIKE 'wta-%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ EMERGENCY FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'WTA Configs: %', final_config_count;
    RAISE NOTICE 'WTA Sessions: %', final_session_count;
    
    IF final_config_count = final_session_count THEN
        RAISE NOTICE '✅ PERFECT MATCH - All configs have sessions!';
    ELSE
        RAISE NOTICE '⚠️ MISMATCH - Some configs missing sessions!';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 REFRESH YOUR WINNER TAKES ALL PAGE!';
    RAISE NOTICE '========================================';
END $$;

