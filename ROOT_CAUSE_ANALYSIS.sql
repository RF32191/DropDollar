-- ============================================================================
-- ROOT CAUSE ANALYSIS - FIND WHY PROGRESS ISN'T UPDATING
-- ============================================================================
-- This will check every step of the process to find the issue
-- ============================================================================

-- 1. Check if user_daily_challenges table exists and has correct structure
SELECT 
    'user_daily_challenges table' as check_type,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_daily_challenges') as table_exists,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_daily_challenges' AND column_name = 'progress') as has_progress_column,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_daily_challenges' AND column_name = 'user_id') as has_user_id_column,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_daily_challenges' AND column_name = 'challenge_id') as has_challenge_id_column;

-- 2. Check if user_weekly_challenges table exists and has correct structure
SELECT 
    'user_weekly_challenges table' as check_type,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_weekly_challenges') as table_exists,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_weekly_challenges' AND column_name = 'progress') as has_progress_column,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_weekly_challenges' AND column_name = 'user_id') as has_user_id_column,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_weekly_challenges' AND column_name = 'challenge_id') as has_challenge_id_column;

-- 3. Check if there are any user challenge records at all
SELECT 
    'User Challenge Records' as check_type,
    (SELECT COUNT(*) FROM public.user_daily_challenges) as daily_records,
    (SELECT COUNT(*) FROM public.user_weekly_challenges) as weekly_records,
    (SELECT COUNT(*) FROM public.user_daily_challenges WHERE updated_at > NOW() - INTERVAL '1 hour') as recent_daily_updates,
    (SELECT COUNT(*) FROM public.user_weekly_challenges WHERE updated_at > NOW() - INTERVAL '1 hour') as recent_weekly_updates;

-- 4. Check if challenges exist for today
SELECT 
    'Today''s Challenges' as check_type,
    COUNT(*) as total_challenges,
    STRING_AGG(challenge_type || ' (' || target_value || ')', ', ') as challenge_details
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true;

-- 5. Check a specific user's progress (Replace USER_ID_HERE)
-- SELECT 
--     'User Progress Check' as check_type,
--     dc.challenge_name,
--     dc.challenge_type,
--     dc.target_value,
--     COALESCE(udc.progress, 0) as current_progress,
--     udc.updated_at as last_updated,
--     CASE WHEN udc.id IS NULL THEN 'NO RECORD' ELSE 'HAS RECORD' END as record_status
-- FROM public.daily_challenges dc
-- LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = 'USER_ID_HERE'::UUID
-- WHERE dc.challenge_date = CURRENT_DATE
-- AND dc.is_active = true
-- ORDER BY dc.challenge_type;

-- 6. Test the update function directly (Replace USER_ID_HERE)
-- SELECT 
--     'Direct Function Test' as check_type,
--     public.update_daily_challenge_progress('USER_ID_HERE'::UUID, 'play_practice', 1) as result;

-- 7. Check if trigger is actually firing
SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_update_challenges_on_game_history'
            AND tgrelid = 'public.game_history'::regclass
        ) THEN '✅ ATTACHED'
        ELSE '❌ NOT ATTACHED'
    END as trigger_status;

-- 8. Check recent game history entries
SELECT 
    'Recent Games' as check_type,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_practice = false) as competition_games,
    MAX(created_at) as last_game_time
FROM public.game_history
WHERE created_at > NOW() - INTERVAL '1 hour';

SELECT '✅ Root cause analysis complete! Review results above.' as status;

