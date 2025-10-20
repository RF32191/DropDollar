-- Clear Winner Takes It All completed games for retesting
-- This script clears completed games while preserving the new database structure

-- 1. Clear completed Winner Takes It All sessions from shared sessions table
DELETE FROM public.winner_takes_all_shared_sessions 
WHERE status = 'completed';

-- 2. Clear Winner Takes It All scores from game_history table
DELETE FROM public.game_history 
WHERE tournament_type = 'winner_takes_all';

-- 3. Clear Winner Takes It All scores from competitions table
DELETE FROM public.competitions 
WHERE tournament_type = 'winner_takes_all';

-- 4. Reset any Winner Takes It All sessions that are still active but have participants
UPDATE public.winner_takes_all_shared_sessions 
SET 
    current_pot = 0,
    participants_count = 0,
    status = 'waiting',
    timer_started_at = NULL,
    participants = '[]'::jsonb
WHERE status IN ('active', 'waiting');

-- 5. Optional: Clear all Winner Takes It All sessions (uncomment if you want to start completely fresh)
-- DELETE FROM public.winner_takes_all_shared_sessions;

-- 6. Show what was cleared (for verification)
SELECT 
    'Cleared completed sessions' as action,
    COUNT(*) as count
FROM public.winner_takes_all_shared_sessions 
WHERE status = 'completed'

UNION ALL

SELECT 
    'Cleared game_history records' as action,
    COUNT(*) as count
FROM public.game_history 
WHERE tournament_type = 'winner_takes_all'

UNION ALL

SELECT 
    'Cleared competitions records' as action,
    COUNT(*) as count
FROM public.competitions 
WHERE tournament_type = 'winner_takes_all';

-- 7. Show remaining active sessions (for verification)
SELECT 
    'Remaining active sessions' as status,
    COUNT(*) as count
FROM public.winner_takes_all_shared_sessions 
WHERE status IN ('waiting', 'active');
