-- ============================================================================
-- 🧹 CLEAN WTA: Remove fake games, over $5000, and FULLY reset
-- ============================================================================

-- Step 1: Show what we have before cleaning
SELECT '📋 BEFORE CLEANUP - CONFIGS:' as step;
SELECT id, game_type, entry_fee, prize_pool FROM winner_takes_all_configs;

SELECT '📋 BEFORE CLEANUP - SESSIONS:' as step;
SELECT id, config_id, status, timer_duration, current_pot FROM winner_takes_all_sessions;

-- Step 2: Delete ALL participants first
DELETE FROM winner_takes_all_participants;

-- Step 3: Delete ALL sessions (we'll recreate clean ones)
DELETE FROM winner_takes_all_sessions;

-- Step 4: Delete the bad configs (crypto games, over $5000)
DELETE FROM winner_takes_all_configs
WHERE LOWER(game_type) LIKE '%crypto%'
   OR entry_fee > 5000
   OR prize_pool > 5000;

-- Step 5: Update remaining configs to 2 minute duration
UPDATE winner_takes_all_configs SET
    game_duration = 120  -- 2 MINUTES
WHERE game_duration IS NOT NULL OR game_duration IS NULL;

-- Step 6: Recreate one clean session per config with 2 minute timer
INSERT INTO winner_takes_all_sessions (
    id, config_id, status, participants_count, current_pot, prize_pool,
    timer_started_at, timer_duration, winner_user_id, winner_prize,
    platform_fee, rng_seed, created_at, updated_at, completed_at
)
SELECT 
    gen_random_uuid(),
    c.id,
    'waiting',
    0,
    0,
    0,
    NULL,
    120,  -- 2 MINUTES
    NULL,
    0,
    0,
    floor(random() * 99999 + 1)::integer,
    NOW(),
    NOW(),
    NULL
FROM winner_takes_all_configs c;

-- Step 7: Verify cleanup
SELECT '✅ AFTER CLEANUP - CONFIGS:' as step;
SELECT id, game_type, entry_fee, prize_pool, game_duration FROM winner_takes_all_configs;

SELECT '✅ AFTER CLEANUP - SESSIONS:' as step;
SELECT id, config_id, status, participants_count, timer_duration, current_pot FROM winner_takes_all_sessions;

SELECT '
============================================
✅ WTA FULLY CLEANED!
============================================
- Removed "crypto" games
- Removed anything over $5000
- All participants cleared
- All sessions deleted and recreated
- Timer set to 120 seconds (2 minutes)
============================================
' as done;
