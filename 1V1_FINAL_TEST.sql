-- ============================================================================
-- 1V1 FINAL VERIFICATION & TEST
-- ============================================================================
-- Run this to verify everything is set up correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY DATABASE SETUP
-- ============================================================================

SELECT '📊 1. Checking configs...' as status;
SELECT COUNT(*) as config_count, string_agg(id, ', ') as config_ids
FROM one_v_one_configs;

SELECT '📊 2. Checking sessions...' as status;
SELECT id, config_id, status, participants_count, current_pot, prize_pool, timer_started_at
FROM one_v_one_sessions
WHERE status IN ('waiting', 'active')
LIMIT 5;

SELECT '📊 3. Checking participants...' as status;
SELECT COUNT(*) as participant_count FROM one_v_one_participants;

-- ============================================================================
-- STEP 2: TEST get_all_1v1_sessions FUNCTION
-- ============================================================================

SELECT '📊 4. Testing get_all_1v1_sessions()...' as status;
SELECT 
    id, 
    config_id, 
    status, 
    participants_count,
    jsonb_array_length(participants) as participants_in_json,
    participants
FROM get_all_1v1_sessions()
LIMIT 3;

-- ============================================================================
-- STEP 3: VERIFY FUNCTION EXISTS
-- ============================================================================

SELECT '📊 5. Checking functions...' as status;
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_all_1v1_sessions', 'join_1v1_session', 'update_1v1_score', 'process_1v1_payout', 'auto_start_1v1_timer')
ORDER BY p.proname;

-- ============================================================================
-- STEP 4: CHECK PERMISSIONS
-- ============================================================================

SELECT '📊 6. Checking function permissions...' as status;
SELECT 
    p.proname as function_name,
    array_agg(DISTINCT a.rolname) as granted_to
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_proc_acl pa ON p.oid = pa.objoid
LEFT JOIN pg_authid a ON pa.grantee = a.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_all_1v1_sessions', 'join_1v1_session', 'update_1v1_score', 'process_1v1_payout')
GROUP BY p.proname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '
✅ 1V1 VERIFICATION COMPLETE!

What to Check:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Config count > 0 ✓
2. Sessions exist with status ''waiting'' ✓
3. get_all_1v1_sessions returns data with participants ✓
4. All 4 functions exist ✓
5. Functions granted to authenticated/anon ✓

If all checks pass:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Refresh your 1v1 page (hard refresh: Cmd+Shift+R)
2. Join a game with 2 accounts
3. Complete both games
4. Scoreboard should auto-expand with 10-second countdown
5. After countdown, payout processes automatically
6. Session resets for next players

Scoreboard Features:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 🏆 Click to expand/collapse
- 👑 Shows winner with crown
- 🥈 Shows loser with silver medal
- Displays usernames and scores
- Shows accuracy percentage
- 10-second payout countdown when both players done
- Automatic payout to winner (50%) and loser (35%)

Debugging:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If scoreboard not showing:
1. Open browser console (F12)
2. Look for "[1v1]" log messages
3. Check participants data has scores
4. Verify session.participants is an array

If timer not starting:
1. Check both players have completed (score !== null)
2. Look for "BOTH PLAYERS DONE!" in console
3. Verify no session errors

Ready to test! 🚀
' as summary;

