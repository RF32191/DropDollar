-- ============================================================================
-- RESET IMMERSIONPRODUCTIONS DAILY AND WEEKLY CHALLENGES
-- ============================================================================
-- This resets all challenge progress for ImmersionProductions user
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_daily_count INTEGER;
    v_weekly_count INTEGER;
BEGIN
    -- Find the user
    SELECT id INTO v_user_id
    FROM public.users
    WHERE username = 'ImmersionProductions' OR email LIKE '%immersion%';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ImmersionProductions not found.';
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', 'ImmersionProductions', v_user_id;
    
    -- Delete all daily challenge progress
    DELETE FROM public.user_daily_challenges
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_daily_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % daily challenge progress records', v_daily_count;
    
    -- Delete all weekly challenge progress
    DELETE FROM public.user_weekly_challenges
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_weekly_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % weekly challenge progress records', v_weekly_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ RESET COMPLETE';
    RAISE NOTICE '   - Daily challenges: % records deleted', v_daily_count;
    RAISE NOTICE '   - Weekly challenges: % records deleted', v_weekly_count;
    RAISE NOTICE '';
    RAISE NOTICE 'User can now start fresh with all challenges!';
    
END $$;

SELECT '✅ ImmersionProductions challenges reset!' as status;

