-- ============================================================================
-- 🔍 DIAGNOSE WTA: Check actual database values
-- ============================================================================

-- Check 1: What's in sessions?
SELECT '📋 SESSIONS DATA:' as info;
SELECT 
    id::TEXT as session_id,
    config_id,
    status,
    participants_count,
    prize_pool,
    base_price,
    timer_started_at,
    updated_at
FROM winner_takes_all_sessions
ORDER BY config_id;

-- Check 2: What's in participants?
SELECT '📋 PARTICIPANTS DATA:' as info;
SELECT 
    p.session_id::TEXT,
    s.config_id,
    p.user_id::TEXT,
    p.username,
    p.score,
    p.joined_at
FROM winner_takes_all_participants p
JOIN winner_takes_all_sessions s ON p.session_id = s.id
ORDER BY p.joined_at DESC;

-- Check 3: What does get_all_sessions return?
SELECT '📋 FUNCTION OUTPUT:' as info;
SELECT 
    id,
    config_id,
    current_pot,
    base_price,
    participants_count,
    status
FROM get_all_winner_takes_all_sessions();

-- Check 4: Is prize_pool column being updated?
-- Let's manually check a session
SELECT '📋 RAW SESSION CHECK:' as info;
SELECT * FROM winner_takes_all_sessions LIMIT 1;

-- Check 5: Count participants per session
SELECT '📋 PARTICIPANT COUNTS:' as info;
SELECT 
    s.config_id,
    s.participants_count as session_count,
    COUNT(p.id) as actual_count,
    s.prize_pool
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_participants p ON p.session_id = s.id
GROUP BY s.id, s.config_id, s.participants_count, s.prize_pool
ORDER BY s.config_id;

SELECT '
============================================
📊 DIAGNOSIS COMPLETE
============================================
Check if:
1. participants exist in participants table
2. prize_pool in sessions matches participant count
3. function returns correct current_pot
============================================
' as done;

