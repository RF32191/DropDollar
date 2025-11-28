-- ============================================================================
-- 🔧 FIX WTA: Create Sessions for Each Config
-- ============================================================================

-- Step 1: Check what configs exist
SELECT '📋 EXISTING CONFIGS:' as info;
SELECT id, game_type, base_price, entry_fee FROM winner_takes_all_configs LIMIT 20;

-- Step 2: Check what sessions exist
SELECT '📋 EXISTING SESSIONS:' as info;
SELECT id, config_id, status FROM winner_takes_all_sessions LIMIT 20;

-- Step 3: Clear old data
DELETE FROM winner_takes_all_participants;
DELETE FROM winner_takes_all_sessions;

-- Step 4: Create a session for EACH config
INSERT INTO winner_takes_all_sessions (
    id,
    config_id,
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
    updated_at,
    completed_at
)
SELECT 
    gen_random_uuid(),
    c.id,
    'waiting',
    0,
    0,
    COALESCE(c.base_price, c.entry_fee, 1),
    NULL,
    60,  -- 1 minute timer
    NULL,
    0,
    0,
    floor(random() * 99999 + 1)::integer,
    NOW(),
    NOW(),
    NULL
FROM winner_takes_all_configs c
WHERE c.is_active = true OR c.is_active IS NULL;

-- Step 5: Verify sessions created
SELECT '✅ SESSIONS CREATED:' as info;
SELECT 
    s.id::TEXT as session_id,
    s.config_id,
    s.status,
    s.base_price,
    s.timer_duration
FROM winner_takes_all_sessions s
ORDER BY s.config_id;

-- Step 6: Count
SELECT 
    (SELECT COUNT(*) FROM winner_takes_all_configs) as total_configs,
    (SELECT COUNT(*) FROM winner_takes_all_sessions) as total_sessions;

SELECT '
============================================
✅ SESSIONS CREATED FOR ALL CONFIGS!
============================================
Each config now has a waiting session.
Timer: 60 seconds (1 minute)
============================================
' as done;

