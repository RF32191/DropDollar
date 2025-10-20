-- Complete Reset for Winner Takes It All - Clears Everything
-- This script completely resets all Winner Takes It All data for fresh testing

-- 1. Clear ALL Winner Takes It All sessions (complete reset)
DELETE FROM public.winner_takes_all_shared_sessions;

-- 2. Clear ALL Winner Takes It All scores from game_history table
-- Note: Only clear if tournament_type column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.game_history WHERE tournament_type = 'winner_takes_all';
    ELSE
        -- If no tournament_type column, clear all game_history (be careful!)
        -- DELETE FROM public.game_history; -- Uncomment if you want to clear all game history
        RAISE NOTICE 'game_history table does not have tournament_type column - skipping';
    END IF;
END $$;

-- 3. Clear ALL Winner Takes It All scores from competitions table
-- Note: Only clear if tournament_type column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitions' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.competitions WHERE tournament_type = 'winner_takes_all';
    ELSE
        RAISE NOTICE 'competitions table does not have tournament_type column - skipping';
    END IF;
END $$;

-- 4. Clear ALL Winner Takes It All scores from fixed_game_participants table
-- Note: Only clear if tournament_type column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fixed_game_participants' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.fixed_game_participants WHERE tournament_type = 'winner_takes_all';
    ELSE
        RAISE NOTICE 'fixed_game_participants table does not have tournament_type column - skipping';
    END IF;
END $$;

-- 5. Reset any Winner Takes It All sessions in hot_sell_sessions table
-- Note: Only clear if tournament_type column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_sell_sessions' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        UPDATE public.hot_sell_sessions 
        SET 
            current_pot = 0,
            participants_count = 0,
            status = 'waiting',
            timer_started_at = NULL
        WHERE tournament_type = 'winner_takes_all';
    ELSE
        RAISE NOTICE 'hot_sell_sessions table does not have tournament_type column - skipping';
    END IF;
END $$;

-- 6. Clear any Winner Takes It All participant data from hot_sell_participants
-- Note: Only clear if tournament_type column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_sell_participants' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.hot_sell_participants WHERE tournament_type = 'winner_takes_all';
    ELSE
        RAISE NOTICE 'hot_sell_participants table does not have tournament_type column - skipping';
    END IF;
END $$;

-- 7. Show verification of what was cleared
SELECT 
    'Cleared ALL shared sessions' as action,
    COUNT(*) as count
FROM public.winner_takes_all_shared_sessions

UNION ALL

SELECT 
    'Remaining game_history records' as action,
    COUNT(*) as count
FROM public.game_history

UNION ALL

SELECT 
    'Remaining competitions records' as action,
    COUNT(*) as count
FROM public.competitions;

-- 8. Show final status
SELECT 
    'Final Status - Winner Takes It All sessions cleared' as status,
    'Ready for fresh testing' as message;
