-- ============================================================================
-- 🧹 CLEAN WTA: Remove fake games, over $5000, and FULLY reset
-- ============================================================================

-- Step 1: Show what we have before cleaning
SELECT '📋 BEFORE CLEANUP - CONFIGS:' as step;
SELECT id, game_type, entry_fee, prize_pool FROM winner_takes_all_configs;

SELECT '📋 BEFORE CLEANUP - SESSIONS:' as step;
SELECT id, config_id, status, timer_duration, current_pot FROM winner_takes_all_sessions;

-- Step 2: Delete participants for configs we're removing
DELETE FROM winner_takes_all_participants
WHERE session_id IN (
    SELECT s.id FROM winner_takes_all_sessions s
    JOIN winner_takes_all_configs c ON s.config_id = c.id
    WHERE LOWER(c.game_type) LIKE '%crypto%'
       OR c.entry_fee > 5000
       OR c.prize_pool > 5000
);

-- Step 3: Delete sessions for configs we're removing
DELETE FROM winner_takes_all_sessions
WHERE config_id IN (
    SELECT id FROM winner_takes_all_configs
    WHERE LOWER(game_type) LIKE '%crypto%'
       OR entry_fee > 5000
       OR prize_pool > 5000
);

-- Step 4: Delete the bad configs
DELETE FROM winner_takes_all_configs
WHERE LOWER(game_type) LIKE '%crypto%'
   OR entry_fee > 5000
   OR prize_pool > 5000;

-- Step 5: Clear ALL remaining participants
DELETE FROM winner_takes_all_participants;

-- Step 6: FULLY reset ALL remaining sessions - 2 MINUTES timer
UPDATE winner_takes_all_sessions SET
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    timer_duration = 120,  -- 2 MINUTES
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Step 7: Update configs to 2 minute duration
UPDATE winner_takes_all_configs SET
    game_duration = 120  -- 2 MINUTES
WHERE game_duration IS NOT NULL;

-- Step 8: Verify cleanup
SELECT '✅ AFTER CLEANUP - CONFIGS:' as step;
SELECT id, game_type, entry_fee, prize_pool, game_duration FROM winner_takes_all_configs;

SELECT '✅ AFTER CLEANUP - SESSIONS:' as step;
SELECT id, status, participants_count, timer_duration, current_pot FROM winner_takes_all_sessions;

SELECT '
============================================
✅ WTA FULLY CLEANED!
============================================
- Removed "crypto" games
- Removed anything over $5000
- All participants cleared
- All sessions reset to WAITING
- Timer set to 120 seconds (2 minutes)
============================================
' as done;

