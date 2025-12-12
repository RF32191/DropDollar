-- ============================================================================
-- VERIFY TRIGGER IS FIRING AND UPDATING PROGRESS
-- ============================================================================
-- Run this to check if the trigger is actually firing and updating progress
-- ============================================================================

-- 1. Check if trigger exists
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

-- 2. Check recent game history (last hour)
SELECT 
    'Recent Games' as check_type,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_practice = false) as competition_games,
    MAX(created_at) as last_game_time
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

-- 4. Check user challenge progress (Replace USER_ID_HERE with your user ID)
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

-- 5. Check recent XP transactions (should see XP being awarded)
SELECT 
    'Recent XP (Last Hour)' as check_type,
    COUNT(*) as total_transactions,
    SUM(xp_amount) as total_xp_awarded,
    COUNT(*) FILTER (WHERE transaction_type = 'practice_game') as practice_xp_count
FROM public.xp_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 6. Test manual update (Replace USER_ID_HERE with your user ID)
-- SELECT 
--     'Manual Test' as check_type,
--     public.test_challenge_progress_update('USER_ID_HERE'::UUID, 'play_practice', 1) as result;

SELECT '✅ Verification complete! Check results above.' as status;

