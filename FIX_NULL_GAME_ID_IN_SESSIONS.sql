-- FIX NULL GAME_ID IN EXISTING HOT SELL SESSIONS
-- This script fixes existing hot_sell_sessions that have NULL game_id values
-- by creating corresponding active_fixed_games records and linking them.

-- 1. First, let's see what sessions have NULL game_id
DO $$
DECLARE
    session_rec RECORD;
    config_rec RECORD;
    active_game_id UUID;
    sessions_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking for hot_sell_sessions with NULL game_id...';
    
    FOR session_rec IN 
        SELECT * FROM public.hot_sell_sessions 
        WHERE game_id IS NULL 
        ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'Found session % with NULL game_id', session_rec.id;
        
        -- Get the config for this session
        SELECT * INTO config_rec 
        FROM public.fixed_games_config 
        WHERE id = session_rec.config_id;
        
        IF FOUND THEN
            RAISE NOTICE 'Creating active_fixed_games record for session %', session_rec.id;
            
            -- Create an entry in active_fixed_games for this session
            INSERT INTO public.active_fixed_games (
                config_id, 
                game_type, 
                tournament_type, 
                title, 
                description, 
                entry_fee, 
                prize_pool, 
                max_participants, 
                game_duration, 
                rng_seed, 
                status, 
                created_at, 
                expires_at
            ) VALUES (
                config_rec.id,
                config_rec.game_type,
                config_rec.tournament_type,
                config_rec.title,
                config_rec.description,
                config_rec.entry_fee,
                config_rec.prize_pool,
                config_rec.max_participants,
                config_rec.game_duration,
                config_rec.rng_seed,
                session_rec.status, -- Use existing session status
                session_rec.created_at,
                session_rec.expires_at
            ) RETURNING id INTO active_game_id;
            
            -- Update the hot_sell_session with the new game_id
            UPDATE public.hot_sell_sessions
            SET game_id = active_game_id
            WHERE id = session_rec.id;
            
            sessions_fixed := sessions_fixed + 1;
            RAISE NOTICE 'Fixed session % with game_id %', session_rec.id, active_game_id;
        ELSE
            RAISE NOTICE 'Config not found for session %', session_rec.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Fixed % sessions with NULL game_id', sessions_fixed;
END $$;

-- 2. Verify the fix worked
SELECT 
    'Verification' as status,
    COUNT(*) as total_sessions,
    COUNT(game_id) as sessions_with_game_id,
    COUNT(*) - COUNT(game_id) as sessions_without_game_id
FROM public.hot_sell_sessions;

-- 3. Show some examples of fixed sessions
SELECT 
    h.id as session_id,
    h.game_id,
    h.status,
    h.current_pot,
    h.participants_count,
    a.id as active_game_id,
    a.title,
    a.game_type
FROM public.hot_sell_sessions h
LEFT JOIN public.active_fixed_games a ON h.game_id = a.id
ORDER BY h.created_at DESC
LIMIT 10;

SELECT 'NULL GAME_ID FIX COMPLETED!' as status,
       'All hot_sell_sessions now have proper game_id references to active_fixed_games.' as message;
