-- ============================================================================
-- DIAGNOSE WHY CHALLENGE PROGRESS ISN'T UPDATING
-- ============================================================================
-- Run this to check what's happening with challenge updates
-- ============================================================================

-- ============================================================================
-- 1. CHECK IF TRIGGER EXISTS AND IS ATTACHED
-- ============================================================================

SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_update_challenges_on_game_history'
            AND tgrelid = 'public.game_history'::regclass
        ) THEN '✅ EXISTS AND ATTACHED'
        ELSE '❌ MISSING OR NOT ATTACHED'
    END as status;

-- ============================================================================
-- 2. CHECK RECENT GAME HISTORY ENTRIES
-- ============================================================================

SELECT 
    'Recent Games (Last Hour)' as check_type,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_practice = false) as competition_games,
    MAX(created_at) as last_game_time
FROM public.game_history
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- 3. CHECK IF CHALLENGES EXIST FOR TODAY
-- ============================================================================

SELECT 
    'Today''s Challenges' as check_type,
    COUNT(*) as total_challenges,
    STRING_AGG(challenge_type, ', ') as challenge_types,
    challenge_date
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true
GROUP BY challenge_date;

-- ============================================================================
-- 4. CHECK IF USER HAS CHALLENGE PROGRESS RECORDS
-- ============================================================================

-- Replace USER_ID_HERE with your actual user ID
-- SELECT 
--     'User Challenge Progress' as check_type,
--     dc.challenge_name,
--     dc.challenge_type,
--     dc.target_value,
--     COALESCE(udc.progress, 0) as current_progress,
--     COALESCE(udc.is_completed, false) as is_completed,
--     udc.updated_at as last_updated
-- FROM public.daily_challenges dc
-- LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id
-- WHERE dc.challenge_date = CURRENT_DATE
-- AND dc.is_active = true
-- AND udc.user_id = 'USER_ID_HERE'::UUID
-- ORDER BY dc.challenge_type;

-- ============================================================================
-- 5. CHECK IF TRIGGER FUNCTION EXISTS
-- ============================================================================

SELECT 
    'Trigger Function' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'trigger_update_challenges_on_game_history'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- ============================================================================
-- 6. CHECK IF UPDATE FUNCTIONS EXIST
-- ============================================================================

SELECT 
    'Update Functions' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_daily_challenge_progress') 
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_weekly_challenge_progress')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_challenges_on_game_complete')
        THEN '✅ ALL EXIST'
        ELSE '❌ SOME MISSING'
    END as status;

-- ============================================================================
-- 7. TEST MANUAL UPDATE (Replace USER_ID_HERE with your user ID)
-- ============================================================================

-- Uncomment and replace USER_ID_HERE to test manual update
-- SELECT 
--     'Manual Test' as check_type,
--     public.test_challenge_update('USER_ID_HERE'::UUID, 'play_practice', 1) as result;

-- ============================================================================
-- 8. CHECK RECENT XP TRANSACTIONS (Should see XP being awarded)
-- ============================================================================

SELECT 
    'Recent XP Transactions (Last Hour)' as check_type,
    COUNT(*) as total_transactions,
    SUM(xp_amount) as total_xp_awarded,
    COUNT(*) FILTER (WHERE transaction_type = 'practice_game') as practice_xp_count,
    COUNT(*) FILTER (WHERE transaction_type = 'competition_game') as competition_xp_count
FROM public.xp_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '✅ Diagnostic checks complete! Review the results above.' as status;
SELECT '📊 Next steps:' as info;
SELECT '   1. If trigger is missing, run FINAL_FIX_CHALLENGE_UPDATES.sql' as step1;
SELECT '   2. If challenges don''t exist, they will be auto-generated' as step2;
SELECT '   3. If XP is being awarded but challenges aren''t updating, check logs' as step3;
SELECT '   4. Test manual update with: SELECT public.test_challenge_update(''USER_ID'', ''play_practice'', 1);' as step4;

