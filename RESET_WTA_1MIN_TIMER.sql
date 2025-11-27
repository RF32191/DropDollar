-- ============================================================================
-- 🔧 RESET WTA & SET 1 MINUTE TIMER FOR TESTING
-- ============================================================================

-- Step 1: Clear all participants
DELETE FROM winner_takes_all_participants;

-- Step 2: Reset all sessions with 1 minute timer (60 seconds)
UPDATE winner_takes_all_sessions SET
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    timer_duration = 60,  -- 1 minute instead of 7200 (2 hours)
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Step 3: Also update configs if they have timer_duration
UPDATE winner_takes_all_configs SET
    game_duration = 60  -- 1 minute
WHERE game_duration IS NOT NULL;

-- Verify
SELECT '✅ WTA RESET WITH 1 MINUTE TIMER:' as status;
SELECT id, status, participants_count, timer_duration, current_pot 
FROM winner_takes_all_sessions;

SELECT '
============================================
✅ WTA RESET COMPLETE!
============================================
- All participants cleared
- All sessions reset to waiting
- Timer set to 60 seconds (1 minute)
============================================
' as done;

