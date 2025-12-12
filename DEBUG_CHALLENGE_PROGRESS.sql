-- ============================================================================
-- DEBUG CHALLENGE PROGRESS SYSTEM
-- ============================================================================
-- Run this to check if challenges are updating correctly
-- ============================================================================

-- Check if trigger exists and is attached
SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_update_challenges_on_game_history'
            AND tgrelid = 'public.game_history'::regclass
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check if update functions exist
SELECT 
    'Function: update_challenges_on_game_complete' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'update_challenges_on_game_complete'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Function: update_daily_challenge_progress' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'update_daily_challenge_progress'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Function: update_weekly_challenge_progress' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'update_weekly_challenge_progress'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check recent game_history entries
SELECT 
    'Recent Games' as check_type,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_practice = false) as competition_games,
    MAX(created_at) as last_game_time
FROM public.game_history
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check if challenges exist for today
SELECT 
    'Today''s Challenges' as check_type,
    COUNT(*) as total_challenges,
    COUNT(DISTINCT challenge_type) as unique_types,
    STRING_AGG(challenge_type, ', ') as challenge_types
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true;

-- Check user challenge progress for a specific user (replace with your user ID)
-- SELECT 
--     'User Progress' as check_type,
--     dc.challenge_name,
--     dc.challenge_description,
--     dc.target_value,
--     COALESCE(udc.progress, 0) as current_progress,
--     COALESCE(udc.is_completed, false) as is_completed
-- FROM public.daily_challenges dc
-- LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id
-- WHERE dc.challenge_date = CURRENT_DATE
-- AND dc.is_active = true
-- AND udc.user_id = 'YOUR_USER_ID_HERE'::UUID
-- ORDER BY dc.challenge_type;

-- Check if XP is being awarded
SELECT 
    'XP Transactions (Last 24h)' as check_type,
    COUNT(*) as total_transactions,
    SUM(xp_amount) as total_xp_awarded,
    COUNT(*) FILTER (WHERE transaction_type = 'practice_game') as practice_xp,
    COUNT(*) FILTER (WHERE transaction_type = 'competition_game') as competition_xp
FROM public.xp_transactions
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Test challenge progress update function (replace with your user ID)
-- SELECT public.update_daily_challenge_progress(
--     'YOUR_USER_ID_HERE'::UUID,
--     'play_practice',
--     1
-- ) as test_result;

SELECT '✅ Debug checks complete! Review the results above.' as status;

