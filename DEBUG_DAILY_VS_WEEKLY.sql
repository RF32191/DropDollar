-- ============================================================================
-- DEBUG DAILY VS WEEKLY - FIND WHY DAILY ISN'T UPDATING
-- ============================================================================

-- 1. Check if daily challenges exist for today
SELECT 
    'Daily Challenges Today' as check_type,
    COUNT(*) as total,
    STRING_AGG(challenge_type || ' (' || target_value || ')', ', ') as challenges
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true;

-- 2. Check if weekly challenges exist for this week
SELECT 
    'Weekly Challenges This Week' as check_type,
    COUNT(*) as total,
    STRING_AGG(challenge_type || ' (' || target_value || ')', ', ') as challenges
FROM public.weekly_challenges
WHERE week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
AND is_active = true;

-- 3. Check a specific user's daily progress (Replace USER_ID_HERE)
-- SELECT 
--     'User Daily Progress' as check_type,
--     dc.challenge_type,
--     dc.challenge_name,
--     dc.target_value,
--     COALESCE(udc.progress, 0) as current_progress,
--     udc.updated_at as last_updated,
--     CASE WHEN udc.id IS NULL THEN 'NO RECORD' ELSE 'HAS RECORD' END as record_status
-- FROM public.daily_challenges dc
-- LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = 'USER_ID_HERE'::UUID
-- WHERE dc.challenge_date = CURRENT_DATE
-- AND dc.is_active = true
-- ORDER BY dc.challenge_type;

-- 4. Check a specific user's weekly progress (Replace USER_ID_HERE)
-- SELECT 
--     'User Weekly Progress' as check_type,
--     wc.challenge_type,
--     wc.challenge_name,
--     wc.target_value,
--     COALESCE(uwc.progress, 0) as current_progress,
--     uwc.updated_at as last_updated,
--     CASE WHEN uwc.id IS NULL THEN 'NO RECORD' ELSE 'HAS RECORD' END as record_status
-- FROM public.weekly_challenges wc
-- LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = 'USER_ID_HERE'::UUID
-- WHERE wc.week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
-- AND wc.is_active = true
-- ORDER BY wc.challenge_type;

-- 5. Test update_daily_challenge_progress directly (Replace USER_ID_HERE)
-- SELECT 
--     'Test Daily Update' as check_type,
--     public.update_daily_challenge_progress('USER_ID_HERE'::UUID, 'play_practice', 1) as result;

-- 6. Test update_weekly_challenge_progress directly (Replace USER_ID_HERE)
-- SELECT 
--     'Test Weekly Update' as check_type,
--     public.update_weekly_challenge_progress('USER_ID_HERE'::UUID, 'play_practice', 1) as result;

-- 7. Check recent updates to user_daily_challenges
SELECT 
    'Recent Daily Updates' as check_type,
    COUNT(*) as total_updates,
    MAX(updated_at) as last_update
FROM public.user_daily_challenges
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- 8. Check recent updates to user_weekly_challenges
SELECT 
    'Recent Weekly Updates' as check_type,
    COUNT(*) as total_updates,
    MAX(updated_at) as last_update
FROM public.user_weekly_challenges
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- 9. Compare function signatures
SELECT 
    'Function Comparison' as check_type,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname IN ('update_daily_challenge_progress', 'update_weekly_challenge_progress')
ORDER BY p.proname;

SELECT '✅ Debug complete! Review results above.' as status;

