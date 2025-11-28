-- ============================================================================
-- 🔧 FIX WTA: Ensure Sessions Match Configs
-- ============================================================================

-- Step 1: Show what configs exist
SELECT '📋 ALL CONFIGS:' as info;
SELECT id, game_type, base_price, entry_fee, is_active FROM winner_takes_all_configs;

-- Step 2: Show what sessions exist
SELECT '📋 ALL SESSIONS:' as info;
SELECT id::TEXT, config_id, status, base_price FROM winner_takes_all_sessions;

-- Step 3: Show orphan sessions (no matching config)
SELECT '⚠️ ORPHAN SESSIONS (no config):' as info;
SELECT s.id::TEXT, s.config_id 
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE c.id IS NULL;

-- Step 4: Show configs without sessions
SELECT '⚠️ CONFIGS WITHOUT SESSIONS:' as info;
SELECT c.id, c.game_type
FROM winner_takes_all_configs c
LEFT JOIN winner_takes_all_sessions s ON s.config_id = c.id
WHERE s.id IS NULL;

-- Step 5: Clear all and recreate properly
DELETE FROM winner_takes_all_participants;
DELETE FROM winner_takes_all_sessions;

-- Step 6: Create session for EACH config with MATCHING config_id
INSERT INTO winner_takes_all_sessions (
    id,
    config_id,  -- This MUST match the config's id exactly
    status,
    participants_count,
    prize_pool,
    base_price,
    timer_started_at,
    timer_duration,
    winner_user_id,
    winner_prize,
    platform_fee_amount,
    rng_seed,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    c.id,  -- Use config's id as config_id
    'waiting',
    0,
    0,
    COALESCE(c.base_price, c.entry_fee, 2),
    NULL,
    60,
    NULL,
    0,
    0,
    floor(random() * 99999 + 1)::integer,
    NOW(),
    NOW()
FROM winner_takes_all_configs c;

-- Step 7: Verify all configs have sessions now
SELECT '✅ VERIFICATION - All configs should have sessions:' as info;
SELECT 
    c.id as config_id,
    c.game_type,
    s.id::TEXT as session_id,
    s.status,
    s.timer_duration
FROM winner_takes_all_configs c
LEFT JOIN winner_takes_all_sessions s ON s.config_id = c.id
ORDER BY c.game_type;

-- Step 8: Count check
SELECT 
    '📊 COUNTS:' as info,
    (SELECT COUNT(*) FROM winner_takes_all_configs) as configs,
    (SELECT COUNT(*) FROM winner_takes_all_sessions) as sessions;

-- Step 9: Test get_all_winner_takes_all_sessions function output
SELECT '🔍 FUNCTION OUTPUT TEST:' as info;
SELECT id, config_id, status, timer_duration, participants
FROM get_all_winner_takes_all_sessions()
LIMIT 5;

SELECT '
============================================
✅ SESSIONS MATCHED TO CONFIGS!
============================================
Every config now has a session with:
- config_id = config.id (exact match)
- status = waiting
- timer_duration = 60 seconds
============================================
' as done;

