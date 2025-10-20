-- Clear all Winner Takes It All sessions for testing
-- This will reset all tournaments back to zero tokens and participants

-- Delete all existing sessions
DELETE FROM public.winner_takes_all_shared_sessions;

-- Verify the table is empty
SELECT COUNT(*) as remaining_sessions FROM public.winner_takes_all_shared_sessions;

COMMIT;
