-- ============================================================================
-- MANUAL TIMER START - IMMEDIATE FIX
-- ============================================================================
-- This manually starts the timer for any session that reached threshold
-- ============================================================================

-- Find sessions that should have timer but don't
SELECT 
    '❌ SESSIONS THAT SHOULD HAVE TIMER:' as status,
    s.id,
    s.config_id,
    s.participants_count,
    c.max_participants,
    s.timer_started_at
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
AND s.participants_count >= COALESCE(c.max_participants, 5)
AND s.timer_started_at IS NULL;

-- MANUALLY START THE TIMER for sessions at threshold
UPDATE winner_takes_all_sessions s
SET 
    status = 'active',
    timer_started_at = NOW(),
    timer_duration = 60,
    updated_at = NOW()
FROM winner_takes_all_configs c
WHERE s.config_id = c.id
AND s.status IN ('waiting', 'active')
AND s.participants_count >= COALESCE(c.max_participants, 5)
AND s.timer_started_at IS NULL;

SELECT '✅ Timer manually started for sessions at threshold' as status;

-- Verify it worked
SELECT 
    '✅ VERIFICATION:' as status,
    s.config_id,
    s.status,
    s.participants_count,
    s.timer_started_at,
    s.timer_duration,
    CASE 
        WHEN s.timer_started_at IS NOT NULL THEN '✅ Timer is running'
        ELSE '❌ Timer still null'
    END as timer_status
FROM winner_takes_all_sessions s
WHERE s.status IN ('waiting', 'active')
ORDER BY s.participants_count DESC;

SELECT '
✅ MANUAL TIMER START COMPLETE!

If you see "✅ Timer is running" above, the timer should now be working.

Refresh your WTA page and check if countdown appears!

If timer STILL doesnt show:
1. Check browser console for errors
2. The frontend might not be checking timer_started_at correctly
3. Need to check the React component code

Next: Check if timer displays in UI now!
' as instructions;

