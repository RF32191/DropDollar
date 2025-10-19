-- Test script for Winner Takes It All SQL functions
-- Run this in Supabase SQL editor to verify functions are working

-- Test 1: Check if tables exist
SELECT 
    'Tables Check' as test_category,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('winner_takes_all_sessions', 'winner_takes_all_participants');

-- Test 2: Check if functions exist
SELECT 
    'Functions Check' as test_category,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%winner_takes_all%';

-- Test 3: Check if we have any Winner Takes It All configs
SELECT 
    'Configs Check' as test_category,
    COUNT(*) as config_count,
    STRING_AGG(title, ', ') as config_titles
FROM public.fixed_games_config 
WHERE tournament_type = 'winner_takes_all';

-- Test 4: Show all Winner Takes It All configs
SELECT 
    'All Winner Takes It All Configs' as test_category,
    id,
    title,
    game_type,
    tournament_type,
    prize_pool,
    entry_fee,
    max_participants
FROM public.fixed_games_config 
WHERE tournament_type = 'winner_takes_all'
ORDER BY prize_pool;

-- Test 5: Test get_all_winner_takes_all_sessions function
SELECT 
    'Sessions Function Test' as test_category,
    public.get_all_winner_takes_all_sessions() as sessions_result;

-- Test 6: Check current user authentication
SELECT 
    'Authentication Check' as test_category,
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- Test 7: Test create_winner_takes_all_session function (if we have a config)
DO $$
DECLARE
    config_id UUID;
    session_id UUID;
    config_count INTEGER;
BEGIN
    -- Count Winner Takes It All configs
    SELECT COUNT(*) INTO config_count 
    FROM public.fixed_games_config 
    WHERE tournament_type = 'winner_takes_all';
    
    RAISE NOTICE 'Found % Winner Takes It All configurations', config_count;
    
    IF config_count > 0 THEN
        -- Get first Winner Takes It All config
        SELECT id INTO config_id 
        FROM public.fixed_games_config 
        WHERE tournament_type = 'winner_takes_all'
        ORDER BY prize_pool
        LIMIT 1;
        
        RAISE NOTICE 'Testing with config: %', config_id;
        
        -- Test creating a session
        SELECT public.create_winner_takes_all_session(config_id) INTO session_id;
        RAISE NOTICE '✅ Created test session: %', session_id;
        
        -- Test getting the session
        PERFORM public.get_winner_takes_all_session(session_id);
        RAISE NOTICE '✅ Successfully retrieved session: %', session_id;
        
        -- Clean up test session
        DELETE FROM public.winner_takes_all_sessions WHERE id = session_id;
        RAISE NOTICE '✅ Cleaned up test session: %', session_id;
        
        RAISE NOTICE '🎉 All Winner Takes It All functions are working correctly!';
    ELSE
        RAISE NOTICE '❌ No Winner Takes It All configs found. Run FIX_WINNER_TAKES_ALL_POLICIES_AND_CONFIGS.sql first.';
    END IF;
END $$;
