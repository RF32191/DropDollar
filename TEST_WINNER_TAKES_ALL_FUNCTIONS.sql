-- Test script for Winner Takes It All SQL functions
-- Run this in Supabase SQL editor to verify functions are working

-- Test 1: Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('winner_takes_all_sessions', 'winner_takes_all_participants');

-- Test 2: Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%winner_takes_all%';

-- Test 3: Check if we have any Winner Takes It All configs
SELECT 
    id,
    title,
    game_type,
    tournament_type,
    prize_pool
FROM public.fixed_games_config 
WHERE title LIKE '%Winner Takes It All%'
LIMIT 5;

-- Test 4: Test get_all_winner_takes_all_sessions function
SELECT public.get_all_winner_takes_all_sessions();

-- Test 5: Check current user authentication
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- Test 6: Test create_winner_takes_all_session function (if we have a config)
-- This will only work if you have Winner Takes It All configs
DO $$
DECLARE
    config_id UUID;
    session_id UUID;
BEGIN
    -- Get first Winner Takes It All config
    SELECT id INTO config_id 
    FROM public.fixed_games_config 
    WHERE title LIKE '%Winner Takes It All%'
    LIMIT 1;
    
    IF config_id IS NOT NULL THEN
        -- Test creating a session
        SELECT public.create_winner_takes_all_session(config_id) INTO session_id;
        RAISE NOTICE 'Created test session: %', session_id;
        
        -- Test getting the session
        PERFORM public.get_winner_takes_all_session(session_id);
        RAISE NOTICE 'Successfully retrieved session: %', session_id;
        
        -- Clean up test session
        DELETE FROM public.winner_takes_all_sessions WHERE id = session_id;
        RAISE NOTICE 'Cleaned up test session: %', session_id;
    ELSE
        RAISE NOTICE 'No Winner Takes It All configs found to test with';
    END IF;
END $$;
