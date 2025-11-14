-- ============================================================================
-- RESET ALL WINNER TAKES ALL SESSIONS FOR TESTING
-- ============================================================================

DO $$
DECLARE
    participant_count INTEGER;
    session_count INTEGER;
BEGIN
    RAISE NOTICE '🔄 Starting Winner Takes All reset...';
    RAISE NOTICE '';
    
    -- Count before deletion
    SELECT COUNT(*) INTO participant_count FROM winner_takes_all_participants;
    SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions;
    
    RAISE NOTICE '📊 Current State:';
    RAISE NOTICE '  - Participants: %', participant_count;
    RAISE NOTICE '  - Sessions: %', session_count;
    RAISE NOTICE '';
    
    -- Delete all participants
    DELETE FROM winner_takes_all_participants;
    RAISE NOTICE '✅ Cleared % participants', participant_count;
    
    -- Reset all sessions to waiting state
    UPDATE winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_prize = NULL,
        platform_fee_amount = NULL,
        completed_at = NULL,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Reset % sessions to "waiting" state', session_count;
    
    -- Show reset results
    RAISE NOTICE '';
    RAISE NOTICE '📊 Reset Complete:';
    RAISE NOTICE '  - All participants removed';
    RAISE NOTICE '  - All sessions reset to "waiting"';
    RAISE NOTICE '  - Timers cleared';
    RAISE NOTICE '  - Prize pools reset to $0';
    RAISE NOTICE '  - Participant counts reset to 0';
    RAISE NOTICE '';
    RAISE NOTICE '✅ READY FOR TESTING!';
END $$;

-- Verify reset
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at,
    CASE 
        WHEN status = 'waiting' AND participants_count = 0 AND prize_pool = 0 THEN '✅ Ready'
        ELSE '⚠️ Check status'
    END as ready_status
FROM winner_takes_all_sessions
ORDER BY config_id;

SELECT '
✅ ALL WINNER TAKES ALL SESSIONS RESET!

What was reset:
- All participants removed
- All sessions set to "waiting"
- All timers cleared
- All prize pools = $0
- All participant counts = 0

Next Steps:
1. Join a session
2. Timer will start when progress bar hits 100%
3. Extra players can join after timer starts
4. Winner gets 85% of final prize pool

Ready to test!
' as summary;

