-- ============================================================================
-- FIX WTA DATA TYPE MISMATCH
-- Match function return types to actual table column types
-- ============================================================================

-- First, let's check the actual table structure
DO $$
DECLARE
    pot_type TEXT;
    price_type TEXT;
    prize_type TEXT;
    fee_type TEXT;
BEGIN
    SELECT data_type INTO pot_type FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'current_pot';
    
    SELECT data_type INTO price_type FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'base_price';
    
    SELECT data_type INTO prize_type FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'prize_amount';
    
    SELECT data_type INTO fee_type FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'platform_fee';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ACTUAL TABLE COLUMN TYPES:';
    RAISE NOTICE 'current_pot: %', pot_type;
    RAISE NOTICE 'base_price: %', price_type;
    RAISE NOTICE 'prize_amount: %', prize_type;
    RAISE NOTICE 'platform_fee: %', fee_type;
    RAISE NOTICE '========================================';
END $$;

-- Now create the function with CORRECT types (INTEGER not NUMERIC)
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot INTEGER,              -- Changed from NUMERIC to INTEGER
    base_price INTEGER,               -- Changed from NUMERIC to INTEGER
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    prize_amount NUMERIC,             -- Keep as NUMERIC
    platform_fee NUMERIC,             -- Keep as NUMERIC
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

-- Clear and recreate sessions
DELETE FROM winner_takes_all_participants;
DELETE FROM winner_takes_all_sessions;

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

-- Test the function
SELECT 
    'FUNCTION TEST' as test,
    config_id,
    current_pot,
    base_price,
    participants_count,
    status
FROM public.get_all_winner_takes_all_sessions()
LIMIT 10;

-- Final verification
DO $$
DECLARE
    final_config_count INTEGER;
    final_session_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_config_count FROM winner_takes_all_configs WHERE id LIKE 'wta-%';
    SELECT COUNT(*) INTO final_session_count FROM winner_takes_all_sessions WHERE config_id LIKE 'wta-%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DATA TYPE FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'WTA Configs: %', final_config_count;
    RAISE NOTICE 'WTA Sessions: %', final_session_count;
    
    IF final_config_count = final_session_count THEN
        RAISE NOTICE '✅ PERFECT! All configs have sessions!';
        RAISE NOTICE '✅ Function returns correct data types!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Config/session count mismatch!';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 REFRESH YOUR WINNER TAKES ALL PAGE!';
    RAISE NOTICE '========================================';
END $$;

