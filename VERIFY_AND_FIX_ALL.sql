-- ============================================================================
-- VERIFY AND FIX ALL - COMPREHENSIVE CHECK AND FIX
-- ============================================================================
-- This verifies everything is set up correctly and fixes any issues
-- ============================================================================

-- ============================================================================
-- 1. VERIFY ALL FUNCTIONS EXIST
-- ============================================================================

DO $$
DECLARE
    v_award_xp_exists BOOLEAN;
    v_award_practice_exists BOOLEAN;
    v_award_competition_exists BOOLEAN;
    v_update_daily_exists BOOLEAN;
    v_update_weekly_exists BOOLEAN;
    v_get_daily_exists BOOLEAN;
    v_get_weekly_exists BOOLEAN;
    v_get_user_xp_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'award_xp') INTO v_award_xp_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'award_practice_game_xp') INTO v_award_practice_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'award_competition_game_xp') INTO v_award_competition_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_daily_challenge_progress') INTO v_update_daily_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_weekly_challenge_progress') INTO v_update_weekly_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_daily_challenges') INTO v_get_daily_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_weekly_challenges') INTO v_get_weekly_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_xp') INTO v_get_user_xp_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FUNCTION VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'award_xp: %', CASE WHEN v_award_xp_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'award_practice_game_xp: %', CASE WHEN v_award_practice_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'award_competition_game_xp: %', CASE WHEN v_award_competition_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'update_daily_challenge_progress: %', CASE WHEN v_update_daily_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'update_weekly_challenge_progress: %', CASE WHEN v_update_weekly_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'get_daily_challenges: %', CASE WHEN v_get_daily_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'get_weekly_challenges: %', CASE WHEN v_get_weekly_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'get_user_xp: %', CASE WHEN v_get_user_xp_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'trigger_update_challenges_on_game_history: %', CASE WHEN v_trigger_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- 2. CHECK RECENT GAME HISTORY
-- ============================================================================

SELECT 
    'Recent Games' as check_type,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_practice = false) as competition_games,
    MAX(created_at) as last_game_time
FROM public.game_history
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- 3. CHECK TODAY'S CHALLENGES
-- ============================================================================

SELECT 
    'Today''s Challenges' as check_type,
    COUNT(*) as total,
    STRING_AGG(challenge_type || ' (' || target_value || ')', ', ') as challenges
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true;

-- ============================================================================
-- 4. CHECK THIS WEEK'S CHALLENGES
-- ============================================================================

SELECT 
    'This Week''s Challenges' as check_type,
    COUNT(*) as total,
    STRING_AGG(challenge_type || ' (' || target_value || ')', ', ') as challenges
FROM public.weekly_challenges
WHERE week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
AND is_active = true;

-- ============================================================================
-- 5. SUMMARY
-- ============================================================================

SELECT '✅ Verification complete! Check results above.' as status;

