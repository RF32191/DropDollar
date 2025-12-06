-- ============================================================================
-- DEBUG COIN PLAY - CHECK WHAT'S IN THE DATABASE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DEBUGGING COIN PLAY SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- Check if tables exist
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 Checking tables...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coin_play_configs') THEN
        RAISE NOTICE '✅ coin_play_configs table exists';
    ELSE
        RAISE NOTICE '❌ coin_play_configs table MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coin_play_sessions') THEN
        RAISE NOTICE '✅ coin_play_sessions table exists';
    ELSE
        RAISE NOTICE '❌ coin_play_sessions table MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coin_play_participants') THEN
        RAISE NOTICE '✅ coin_play_participants table exists';
    ELSE
        RAISE NOTICE '❌ coin_play_participants table MISSING';
    END IF;
END $$;

-- Check configs
DO $$
DECLARE
    v_config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_config_count FROM public.coin_play_configs;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎮 Coin Play Configs:';
    RAISE NOTICE '   Total configs: %', v_config_count;
    
    IF v_config_count = 0 THEN
        RAISE NOTICE '   ❌ NO CONFIGS FOUND! Run CREATE_COIN_PLAY_SYSTEM.sql';
    END IF;
END $$;

-- Show configs by game
SELECT 
    game_type,
    COUNT(*) as config_count,
    MIN(prize_pool) as min_prize,
    MAX(prize_pool) as max_prize
FROM public.coin_play_configs
GROUP BY game_type
ORDER BY game_type;

-- Check sessions
DO $$
DECLARE
    v_session_count INTEGER;
    v_waiting_count INTEGER;
    v_active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_session_count FROM public.coin_play_sessions;
    SELECT COUNT(*) INTO v_waiting_count FROM public.coin_play_sessions WHERE status = 'waiting';
    SELECT COUNT(*) INTO v_active_count FROM public.coin_play_sessions WHERE status = 'active';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Coin Play Sessions:';
    RAISE NOTICE '   Total sessions: %', v_session_count;
    RAISE NOTICE '   Waiting: %', v_waiting_count;
    RAISE NOTICE '   Active: %', v_active_count;
    
    IF v_session_count = 0 THEN
        RAISE NOTICE '   ❌ NO SESSIONS FOUND! Creating them now...';
    END IF;
END $$;

-- Show sample sessions
SELECT 
    s.id,
    s.config_id,
    c.game_type,
    c.prize_pool,
    s.status,
    s.participants_count,
    c.max_participants
FROM public.coin_play_sessions s
JOIN public.coin_play_configs c ON s.config_id = c.id
LIMIT 10;

-- Test the RPC function
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing get_coin_play_sessions() RPC function...';
END $$;

SELECT 
    id,
    config_id,
    game_type,
    entry_fee,
    prize_pool,
    max_participants,
    participants_count,
    status
FROM get_coin_play_sessions()
LIMIT 5;

DO $$
DECLARE
    v_rpc_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rpc_count FROM get_coin_play_sessions();
    
    RAISE NOTICE '';
    RAISE NOTICE '📡 RPC Function Results:';
    RAISE NOTICE '   Sessions returned: %', v_rpc_count;
    
    IF v_rpc_count = 0 THEN
        RAISE NOTICE '   ❌ RPC RETURNING EMPTY! This is the problem.';
    ELSE
        RAISE NOTICE '   ✅ RPC working correctly!';
    END IF;
END $$;

-- Check RLS policies
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Checking RLS policies...';
END $$;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename LIKE 'coin_play%'
ORDER BY tablename, policyname;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DEBUG COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 If configs = 0: Run CREATE_COIN_PLAY_SYSTEM.sql';
    RAISE NOTICE '💡 If sessions = 0: Run the INSERT below';
    RAISE NOTICE '💡 If RPC returns 0: Check RLS policies';
    RAISE NOTICE '';
END $$;

-- Quick fix: Create sessions if missing
INSERT INTO public.coin_play_sessions (config_id, status, prize_pool, timer_duration)
SELECT 
    id,
    'waiting',
    0,
    120
FROM public.coin_play_configs
WHERE id NOT IN (SELECT config_id FROM public.coin_play_sessions WHERE status IN ('waiting', 'active'))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    v_created INTEGER;
BEGIN
    GET DIAGNOSTICS v_created = ROW_COUNT;
    
    IF v_created > 0 THEN
        RAISE NOTICE '✅ Created % new waiting sessions', v_created;
    ELSE
        RAISE NOTICE 'ℹ️  All sessions already exist';
    END IF;
END $$;

