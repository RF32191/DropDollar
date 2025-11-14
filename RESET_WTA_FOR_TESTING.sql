-- ============================================================================
-- RESET ALL WTA SESSIONS FOR TESTING
-- ============================================================================
-- This script clears all participants and resets all sessions to fresh state
-- Safe to run anytime you want to start fresh testing
-- ============================================================================

-- Step 1: Delete all participants
DELETE FROM winner_takes_all_participants;

SELECT '✅ Step 1: Cleared all participants' as status;

-- Step 2: Reset all sessions to waiting state
UPDATE winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    updated_at = NOW()
WHERE status IN ('waiting', 'active', 'completed');

SELECT '✅ Step 2: Reset all sessions to waiting state' as status;

-- Step 3: Verify the reset
SELECT 
    '🔍 VERIFICATION:' as info,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting_sessions,
    COUNT(*) FILTER (WHERE participants_count = 0) as empty_sessions,
    COUNT(*) FILTER (WHERE timer_started_at IS NULL) as no_timer_sessions
FROM winner_takes_all_sessions;

-- Step 4: Show current state of all sessions
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at,
    winner_user_id
FROM winner_takes_all_sessions
ORDER BY config_id;

SELECT '
✅ WTA SESSIONS RESET COMPLETE!

What was cleared:
- ✅ All participants removed
- ✅ All sessions reset to "waiting"
- ✅ All participant counts set to 0
- ✅ All prize pools set to 0
- ✅ All timers cleared
- ✅ All winner data cleared

Ready for fresh testing!

Next Steps:
1. Join sessions to test timer logic
2. Timer should start when participants_count reaches max_participants
3. Check Supabase logs for timer debugging messages

To see configs and their thresholds:
SELECT id, title, entry_fee, max_participants, timer_duration 
FROM winner_takes_all_configs 
ORDER BY entry_fee;
' as summary;

