-- ============================================================================
-- WTA COMPLETE TESTING WORKFLOW
-- Fix "session expired" issue and reset for testing
-- ============================================================================

-- ============================================================================
-- PART 1: FIX SESSION EXPIRY ISSUES
-- ============================================================================

-- Check your current session/auth status
SELECT 
    '🔐 AUTH CHECK:' as check_type,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ Not authenticated - Please log in'
        ELSE '✅ Authenticated'
    END as auth_status;

-- If you see "Not authenticated", you need to:
-- 1. Log out of your application
-- 2. Log back in
-- 3. Try joining WTA again

-- ============================================================================
-- PART 2: RESET ALL WTA SESSIONS
-- ============================================================================

-- Delete all participants
DELETE FROM winner_takes_all_participants;

-- Reset all sessions
UPDATE winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    updated_at = NOW();

SELECT '✅ All sessions reset for testing' as status;

-- ============================================================================
-- PART 3: VERIFY CONFIGS ARE SET UP CORRECTLY
-- ============================================================================

SELECT 
    '📋 CONFIG CHECK:' as check_type,
    id,
    title,
    entry_fee,
    max_participants,
    timer_duration,
    CASE 
        WHEN max_participants IS NULL THEN '❌ Missing max_participants'
        ELSE '✅ Configured'
    END as config_status
FROM winner_takes_all_configs
ORDER BY entry_fee;

-- ============================================================================
-- PART 4: VERIFY SESSIONS ARE READY
-- ============================================================================

SELECT 
    '🎮 SESSION CHECK:' as check_type,
    s.config_id,
    s.status,
    s.participants_count,
    c.max_participants as threshold,
    s.prize_pool,
    s.timer_started_at,
    CASE 
        WHEN s.status = 'waiting' 
        AND s.participants_count = 0 
        AND s.prize_pool = 0 
        AND s.timer_started_at IS NULL 
        THEN '✅ Ready for testing'
        ELSE '⚠️ Needs reset'
    END as session_status
FROM winner_takes_all_sessions s
LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
ORDER BY s.config_id;

-- ============================================================================
-- PART 5: CHECK USER TOKEN BALANCE
-- ============================================================================

-- Replace 'YOUR-USER-ID' with your actual user ID
-- (You can find this in Supabase Auth dashboard or by running: SELECT auth.uid();)

-- SELECT 
--     '💰 TOKEN CHECK:' as check_type,
--     username,
--     purchased_tokens,
--     won_tokens,
--     purchased_tokens + won_tokens as total_tokens,
--     CASE 
--         WHEN purchased_tokens + won_tokens >= 1 THEN '✅ Can join $1 session'
--         WHEN purchased_tokens + won_tokens >= 5 THEN '✅ Can join $5 session'
--         WHEN purchased_tokens + won_tokens >= 10 THEN '✅ Can join $10 session'
--         ELSE '❌ Insufficient tokens'
--     END as can_play
-- FROM users
-- WHERE id = 'YOUR-USER-ID'::UUID;

-- ============================================================================
-- PART 6: MANUAL TOKEN ADD (FOR TESTING ONLY)
-- ============================================================================

-- If you need to add tokens for testing, uncomment and run:
-- UPDATE users
-- SET purchased_tokens = purchased_tokens + 1000
-- WHERE id = auth.uid();

-- ============================================================================
-- SUMMARY & NEXT STEPS
-- ============================================================================

SELECT '
✅ WTA TESTING ENVIRONMENT READY!

What to check:
1. ✅ Authentication status (should be logged in)
2. ✅ All sessions reset to "waiting"
3. ✅ All configs have max_participants set
4. ✅ User has sufficient tokens

Testing Steps:
1. Log out and log back in (to fix session expiry)
2. Navigate to Winner Takes All page
3. Join a session (e.g., $1 session)
4. Keep joining until progress bar hits 100%
5. Timer should start automatically
6. Check Supabase logs for timer messages

Expected Timer Behavior:
- $1-$5 sessions: Timer starts at 10th player
- $10-$25 sessions: Timer starts at 8th player
- $50-$100 sessions: Timer starts at 6th player
- $250-$500 sessions: Timer starts at 5th player
- $1000+ sessions: Timer starts at 3rd player

Troubleshooting:
- If "session expired": Log out and log back in
- If timer not starting: Check Supabase logs for timer debugging
- If insufficient tokens: Add tokens using PART 6 above
- If configs missing: Run COMPLETE_WTA_SETUP_WITH_TIMER.sql

Files to use:
1. COMPLETE_WTA_SETUP_WITH_TIMER.sql - Initial setup
2. FIX_WTA_COMPLETE_ALL_ERRORS.sql - All functions and fixes
3. FIX_WTA_TIMER_LOGIC.sql - Enhanced timer with logging
4. RESET_ALL_WTA_SESSIONS.sql - Reset for testing
5. DEBUG_WTA_TIMER.sql - Diagnose timer issues
' as instructions;

