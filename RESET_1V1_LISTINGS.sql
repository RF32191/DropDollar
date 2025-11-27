-- ============================================
-- 🔄 RESET ALL 1V1 LISTINGS
-- ============================================

-- Clear all participants
DELETE FROM one_v_one_participants;

-- Reset all sessions to waiting
UPDATE one_v_one_sessions SET
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    loser_user_id = NULL,
    winner_prize = 0,
    loser_prize = 0,
    platform_fee = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Verify
SELECT id::TEXT, status, participants_count, current_pot 
FROM one_v_one_sessions;

SELECT '✅ All 1v1 listings reset!' as done;

