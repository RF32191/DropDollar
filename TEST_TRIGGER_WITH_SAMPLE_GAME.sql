-- ============================================================================
-- TEST TRIGGER WITH SAMPLE GAME INSERT
-- ============================================================================
-- This will insert a test game and verify the trigger fires
-- Replace USER_ID_HERE with your actual user ID
-- ============================================================================

-- Test: Insert a practice game and check if challenges update
DO $$
DECLARE
    v_user_id UUID := 'USER_ID_HERE'::UUID; -- Replace with your user ID
    v_game_id UUID;
    v_daily_progress_before INTEGER;
    v_daily_progress_after INTEGER;
    v_weekly_progress_before INTEGER;
    v_weekly_progress_after INTEGER;
BEGIN
    -- Get current progress before
    SELECT COALESCE(udc.progress, 0) INTO v_daily_progress_before
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = v_user_id
    WHERE dc.challenge_date = CURRENT_DATE
    AND dc.challenge_type = 'play_practice'
    AND dc.is_active = true
    LIMIT 1;
    
    SELECT COALESCE(uwc.progress, 0) INTO v_weekly_progress_before
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = v_user_id
    WHERE wc.week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
    AND wc.challenge_type = 'play_practice'
    AND wc.is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Progress before: Daily=%, Weekly=%', v_daily_progress_before, v_weekly_progress_before;
    
    -- Insert test game (practice game)
    INSERT INTO public.game_history (
        user_id,
        game_type,
        score,
        accuracy,
        is_practice,
        is_competition,
        created_at
    ) VALUES (
        v_user_id,
        'multi_target',
        1000,
        85.5,
        true,  -- CRITICAL: is_practice = true
        false,
        NOW()
    ) RETURNING id INTO v_game_id;
    
    RAISE NOTICE 'Test game inserted with ID: %', v_game_id;
    
    -- Wait a moment for trigger to complete
    PERFORM pg_sleep(1);
    
    -- Get progress after
    SELECT COALESCE(udc.progress, 0) INTO v_daily_progress_after
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = v_user_id
    WHERE dc.challenge_date = CURRENT_DATE
    AND dc.challenge_type = 'play_practice'
    AND dc.is_active = true
    LIMIT 1;
    
    SELECT COALESCE(uwc.progress, 0) INTO v_weekly_progress_after
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = v_user_id
    WHERE wc.week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
    AND wc.challenge_type = 'play_practice'
    AND wc.is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Progress after: Daily=%, Weekly=%', v_daily_progress_after, v_weekly_progress_after;
    
    -- Check if progress increased
    IF v_daily_progress_after > v_daily_progress_before THEN
        RAISE NOTICE '✅ SUCCESS: Daily progress increased from % to %', v_daily_progress_before, v_daily_progress_after;
    ELSE
        RAISE WARNING '❌ FAILED: Daily progress did not increase (was %, now %)', v_daily_progress_before, v_daily_progress_after;
    END IF;
    
    IF v_weekly_progress_after > v_weekly_progress_before THEN
        RAISE NOTICE '✅ SUCCESS: Weekly progress increased from % to %', v_weekly_progress_before, v_weekly_progress_after;
    ELSE
        RAISE WARNING '❌ FAILED: Weekly progress did not increase (was %, now %)', v_weekly_progress_before, v_weekly_progress_after;
    END IF;
    
    -- Clean up test game
    DELETE FROM public.game_history WHERE id = v_game_id;
    RAISE NOTICE 'Test game cleaned up';
END $$;

SELECT '✅ Test complete! Check Supabase logs for results.' as status;

