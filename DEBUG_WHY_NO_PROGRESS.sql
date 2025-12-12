-- ============================================================================
-- DEBUG WHY PROGRESS ISN'T UPDATING
-- ============================================================================
-- Run this to find out why challenge progress isn't updating
-- ============================================================================

-- 1. Check if trigger exists and is attached
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

-- 2. Check recent game history entries (last hour)
SELECT 
    'Recent Games' as check_type,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_practice = false) as competition_games,
    MAX(created_at) as last_game_time,
    MIN(created_at) as first_game_time
FROM public.game_history
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 3. Check if challenges exist for today
SELECT 
    'Today''s Challenges' as check_type,
    COUNT(*) as total_challenges,
    STRING_AGG(challenge_type, ', ') as challenge_types
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true;

-- 4. Check if user has any challenge progress records
-- Replace USER_ID_HERE with your actual user ID
-- SELECT 
--     'User Progress' as check_type,
--     dc.challenge_name,
--     dc.challenge_type,
--     dc.target_value,
--     COALESCE(udc.progress, 0) as current_progress,
--     udc.updated_at as last_updated
-- FROM public.daily_challenges dc
-- LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id
-- WHERE dc.challenge_date = CURRENT_DATE
-- AND dc.is_active = true
-- AND (udc.user_id = 'USER_ID_HERE'::UUID OR udc.user_id IS NULL)
-- ORDER BY dc.challenge_type;

-- 5. Test manual update (Replace USER_ID_HERE with your user ID)
-- SELECT 
--     'Manual Test' as check_type,
--     public.update_daily_challenge_progress('USER_ID_HERE'::UUID, 'play_practice', 1) as result;

-- 6. Check if functions exist
SELECT 
    'Functions' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_daily_challenge_progress')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_weekly_challenge_progress')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_challenges_on_game_complete')
        THEN '✅ ALL EXIST'
        ELSE '❌ SOME MISSING'
    END as status;

-- 7. Check recent XP transactions (should see XP being awarded)
SELECT 
    'Recent XP (Last Hour)' as check_type,
    COUNT(*) as total_transactions,
    SUM(xp_amount) as total_xp_awarded
FROM public.xp_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';

SELECT '✅ Diagnostic complete! Review results above.' as status;

