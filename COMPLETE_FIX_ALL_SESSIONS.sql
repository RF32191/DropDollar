-- ============================================================================
-- COMPLETE FIX - ALL SESSIONS AND FUNCTIONS
-- ============================================================================
-- Run this ONE file to fix everything
-- ============================================================================

-- PART 1: Create get_all_winner_takes_all_sessions function
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

-- PART 2: Create get_all_hot_sell_sessions function
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

-- PART 3: Delete old sessions with wrong status or orphaned configs
DELETE FROM winner_takes_all_sessions WHERE status = 'completed';
DELETE FROM hot_sell_sessions WHERE status = 'completed';

-- PART 4: Create Winner Takes All sessions for EVERY config
DO $$
DECLARE
    config_record RECORD;
    existing_session UUID;
BEGIN
    FOR config_record IN SELECT id, base_price FROM winner_takes_all_configs
    LOOP
        -- Check if session exists
        SELECT id INTO existing_session 
        FROM winner_takes_all_sessions 
        WHERE config_id = config_record.id 
        AND status IN ('waiting', 'active')
        LIMIT 1;
        
        -- If no session exists, create one
        IF existing_session IS NULL THEN
            INSERT INTO winner_takes_all_sessions (
                config_id,
                current_pot,
                base_price,
                participants_count,
                status,
                created_at,
                updated_at
            ) VALUES (
                config_record.id,
                0,
                config_record.base_price,
                0,
                'waiting',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Created WTA session for config: %', config_record.id;
        END IF;
    END LOOP;
END $$;

-- PART 5: Create Hot Sell sessions for EVERY config
DO $$
DECLARE
    config_record RECORD;
    existing_session UUID;
BEGIN
    FOR config_record IN SELECT id, base_price, max_participants FROM hot_sell_configs
    LOOP
        -- Check if session exists
        SELECT id INTO existing_session 
        FROM hot_sell_sessions 
        WHERE config_id = config_record.id 
        AND status IN ('waiting', 'active')
        LIMIT 1;
        
        -- If no session exists, create one
        IF existing_session IS NULL THEN
            INSERT INTO hot_sell_sessions (
                config_id,
                current_pot,
                base_price,
                max_participants,
                status,
                created_at,
                updated_at
            ) VALUES (
                config_record.id,
                0,
                config_record.base_price,
                config_record.max_participants,
                'waiting',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Created Hot Sell session for config: %', config_record.id;
        END IF;
    END LOOP;
END $$;

-- PART 6: Verify everything
DO $$
DECLARE
    wta_configs_count INTEGER;
    wta_sessions_count INTEGER;
    hs_configs_count INTEGER;
    hs_sessions_count INTEGER;
    functions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO wta_configs_count FROM winner_takes_all_configs;
    SELECT COUNT(*) INTO wta_sessions_count FROM winner_takes_all_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO hs_configs_count FROM hot_sell_configs;
    SELECT COUNT(*) INTO hs_sessions_count FROM hot_sell_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO functions_count FROM pg_proc WHERE proname IN ('get_all_winner_takes_all_sessions', 'get_all_hot_sell_sessions');
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ COMPLETE FIX FINISHED';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'WINNER TAKES ALL:';
    RAISE NOTICE '  Configs: %', wta_configs_count;
    RAISE NOTICE '  Active Sessions: %', wta_sessions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'HOT SELL:';
    RAISE NOTICE '  Configs: %', hs_configs_count;
    RAISE NOTICE '  Active Sessions: %', hs_sessions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCTIONS: % created', functions_count;
    RAISE NOTICE '';
    
    IF wta_configs_count = wta_sessions_count AND hs_configs_count = hs_sessions_count AND functions_count = 2 THEN
        RAISE NOTICE '✅ SUCCESS - All sessions and functions created!';
        RAISE NOTICE '   Reload your pages - they should work now!';
    ELSE
        RAISE WARNING 'Some sessions may be missing!';
        RAISE NOTICE '   WTA missing: %', wta_configs_count - wta_sessions_count;
        RAISE NOTICE '   Hot Sell missing: %', hs_configs_count - hs_sessions_count;
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- Show created sessions
SELECT 'WINNER TAKES ALL SESSIONS' as type, config_id, status, current_pot, participants_count 
FROM winner_takes_all_sessions 
WHERE status IN ('waiting', 'active')
ORDER BY config_id;

SELECT 'HOT SELL SESSIONS' as type, config_id, status, current_pot 
FROM hot_sell_sessions 
WHERE status IN ('waiting', 'active')
ORDER BY config_id;

