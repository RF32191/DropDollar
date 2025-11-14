-- ============================================================================
-- DIAGNOSE WHY TIMER ISN'T STARTING
-- ============================================================================

-- Check 1: What configs exist and their settings
SELECT 
    '🔍 CHECK 1: CONFIGS' as check_name,
    id,
    entry_fee,
    max_participants,
    timer_duration,
    CASE 
        WHEN max_participants IS NULL THEN '❌ NULL max_participants'
        WHEN timer_duration IS NULL THEN '❌ NULL timer_duration'
        ELSE '✅ Configured'
    END as status
FROM winner_takes_all_configs
ORDER BY entry_fee
LIMIT 10;

-- Check 2: Current session states
SELECT 
    '🔍 CHECK 2: SESSIONS' as check_name,
    s.id,
    s.config_id,
    s.status,
    s.participants_count,
    c.max_participants as threshold,
    s.timer_started_at,
    s.prize_pool,
    CASE 
        WHEN s.participants_count >= c.max_participants AND s.timer_started_at IS NULL 
        THEN '❌ SHOULD HAVE STARTED!'
        WHEN s.participants_count >= c.max_participants AND s.timer_started_at IS NOT NULL 
        THEN '✅ Timer running'
        ELSE format('⏳ Waiting (%s/%s)', s.participants_count, c.max_participants)
    END as timer_status
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY s.participants_count DESC;

-- Check 3: Count participants per session
SELECT 
    '🔍 CHECK 3: ACTUAL PARTICIPANTS' as check_name,
    s.config_id,
    COUNT(p.id) as actual_participant_count,
    s.participants_count as stored_count,
    c.max_participants as threshold,
    CASE 
        WHEN COUNT(p.id) != s.participants_count THEN '❌ COUNT MISMATCH!'
        ELSE '✅ Counts match'
    END as count_status
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_participants p ON p.session_id = s.id
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
GROUP BY s.config_id, s.participants_count, c.max_participants
ORDER BY s.config_id;

-- Check 4: Test the join function query logic
SELECT 
    '🔍 CHECK 4: JOIN LOGIC TEST' as check_name,
    s.id as session_id,
    s.config_id,
    COALESCE(s.participants_count, 0) as current_count,
    COALESCE(c.max_participants, 5) as max_count,
    COALESCE(s.participants_count, 0) + 1 as count_after_join,
    (COALESCE(s.participants_count, 0) + 1) >= COALESCE(c.max_participants, 5) as should_start_timer,
    s.timer_started_at IS NULL as timer_not_started,
    CASE 
        WHEN (COALESCE(s.participants_count, 0) + 1) >= COALESCE(c.max_participants, 5) 
             AND s.timer_started_at IS NULL 
        THEN '✅ NEXT JOIN WILL START TIMER'
        WHEN (COALESCE(s.participants_count, 0) + 1) >= COALESCE(c.max_participants, 5) 
             AND s.timer_started_at IS NOT NULL
        THEN '✅ Timer already running'
        ELSE format('⏳ Need %s more joins', COALESCE(c.max_participants, 5) - COALESCE(s.participants_count, 0))
    END as next_join_prediction
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY s.participants_count DESC
LIMIT 5;

-- Check 5: Show recent participants
SELECT 
    '🔍 CHECK 5: RECENT JOINS' as check_name,
    p.username,
    s.config_id,
    p.joined_at,
    s.participants_count as count_after_join,
    s.timer_started_at
FROM winner_takes_all_participants p
JOIN winner_takes_all_sessions s ON p.session_id = s.id
ORDER BY p.joined_at DESC
LIMIT 10;

SELECT '
🔍 DIAGNOSIS COMPLETE

Look at the checks above and identify:

❌ Problem Indicators:
- "NULL max_participants" in Check 1
- "SHOULD HAVE STARTED" in Check 2
- "COUNT MISMATCH" in Check 3

✅ What Should Happen:
- max_participants should be 5 for all configs
- Timer starts when participants_count reaches 5
- stored_count should match actual_participant_count

Next Steps:
1. If max_participants is NULL → Run fix script
2. If counts mismatch → Database inconsistency
3. If timer should have started → Function not executing properly

Run FIX script if you see any ❌ indicators!
' as summary;

