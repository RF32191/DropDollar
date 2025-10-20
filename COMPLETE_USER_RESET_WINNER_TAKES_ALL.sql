-- Complete User Reset for Winner Takes It All
-- This script clears ALL Winner Takes It All data including user completion states
-- Use this when you need to test freely without any "COMPLETED" restrictions

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

-- 7. Clear any Winner Takes It All data from winner_takes_all_sessions (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'winner_takes_all_sessions' 
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.winner_takes_all_sessions;
        RAISE NOTICE 'Cleared winner_takes_all_sessions table';
    ELSE
        RAISE NOTICE 'winner_takes_all_sessions table does not exist - skipping';
    END IF;
END $$;

-- 8. Clear any Winner Takes It All data from winner_takes_all_participants (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'winner_takes_all_participants' 
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.winner_takes_all_participants;
        RAISE NOTICE 'Cleared winner_takes_all_participants table';
    ELSE
        RAISE NOTICE 'winner_takes_all_participants table does not exist - skipping';
    END IF;
END $$;

-- 9. Clear any Winner Takes It All data from winner_takes_all_configs (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'winner_takes_all_configs' 
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.winner_takes_all_configs;
        RAISE NOTICE 'Cleared winner_takes_all_configs table';
    ELSE
        RAISE NOTICE 'winner_takes_all_configs table does not exist - skipping';
    END IF;
END $$;

-- 10. Show verification of what was cleared
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

-- 11. Show final status
SELECT 
    'Complete Reset Complete' as status,
    'All users can now test freely - no COMPLETED restrictions' as message;

-- 12. Additional notice about localStorage
SELECT 
    'IMPORTANT' as notice,
    'Users may need to clear browser localStorage or refresh page to see reset' as instruction;
