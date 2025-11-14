-- ============================================================================
-- DEBUG WTA TIMER - Check why timer didn't start
-- ============================================================================

-- Check 1: Verify max_participants is set in configs
SELECT 
    '🔍 CHECK 1: Config max_participants' as check_name,
    c.id,
    c.title,
    c.entry_fee,
    c.max_participants,
    c.timer_duration
FROM winner_takes_all_configs c
ORDER BY c.entry_fee;

-- Check 2: Check session status and timer
SELECT 
    '🔍 CHECK 2: Session Status & Timer' as check_name,
    s.config_id,
    s.status,
    s.participants_count,
    c.max_participants,
    s.timer_started_at,
    s.prize_pool,
    CASE 
        WHEN s.participants_count >= c.max_participants THEN '✅ Should start timer'
        ELSE '⏳ Waiting for more players'
    END as timer_status
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY s.config_id;

-- Check 3: Count participants per session
SELECT 
    '🔍 CHECK 3: Actual Participant Count' as check_name,
    p.session_id,
    s.config_id,
    COUNT(*) as actual_participants,
    s.participants_count as stored_count,
    c.max_participants as threshold
FROM winner_takes_all_participants p
JOIN winner_takes_all_sessions s ON p.session_id = s.id
JOIN winner_takes_all_configs c ON s.config_id = c.id
GROUP BY p.session_id, s.config_id, s.participants_count, c.max_participants
ORDER BY s.config_id;

-- Check 4: Show all participants with usernames
SELECT 
    '🔍 CHECK 4: Participant Details' as check_name,
    s.config_id,
    p.username,
    p.joined_at,
    s.timer_started_at
FROM winner_takes_all_participants p
JOIN winner_takes_all_sessions s ON p.session_id = s.id
ORDER BY s.config_id, p.joined_at;

-- Check 5: Find the specific session with issues
SELECT 
    '🔍 CHECK 5: Problem Session Details' as check_name,
    s.id,
    s.config_id,
    s.status,
    s.participants_count,
    c.max_participants,
    s.timer_started_at IS NULL as timer_not_started,
    s.prize_pool,
    s.base_price,
    CASE 
        WHEN s.participants_count >= c.max_participants AND s.timer_started_at IS NULL 
        THEN '❌ TIMER SHOULD HAVE STARTED!'
        WHEN s.participants_count >= c.max_participants AND s.timer_started_at IS NOT NULL 
        THEN '✅ Timer running'
        ELSE '⏳ Waiting for threshold'
    END as diagnosis
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY s.participants_count DESC;

SELECT '
🔍 DIAGNOSIS COMPLETE

If you see "❌ TIMER SHOULD HAVE STARTED!" above, run this manual fix:

-- Manual Timer Start (replace SESSION_ID with the actual UUID)
UPDATE winner_takes_all_sessions
SET 
    status = ''active'',
    timer_started_at = NOW(),
    updated_at = NOW()
WHERE id = ''SESSION_ID''::UUID
AND timer_started_at IS NULL
AND participants_count >= (
    SELECT max_participants 
    FROM winner_takes_all_configs 
    WHERE id = winner_takes_all_sessions.config_id
);

Then check if the wta_join_v2 function needs to be updated.
' as next_steps;

