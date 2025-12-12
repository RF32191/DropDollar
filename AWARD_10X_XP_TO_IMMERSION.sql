-- ============================================================================
-- AWARD 10X XP TO ImmersionProductions USER FOR TESTING
-- ============================================================================

-- Find the user ID for ImmersionProductions
DO $$
DECLARE
    v_user_id UUID;
    v_current_xp INTEGER;
    v_current_level INTEGER;
    v_xp_to_award INTEGER := 1000; -- 10X XP (100 games worth)
BEGIN
    -- Find user by username
    SELECT id INTO v_user_id
    FROM public.users
    WHERE username = 'ImmersionProductions'
    OR email LIKE '%immersion%'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ User ImmersionProductions not found';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found user: %', v_user_id;
    
    -- Get current XP
    SELECT total_xp, current_level INTO v_current_xp, v_current_level
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    IF v_current_xp IS NULL THEN
        -- Create XP record if it doesn't exist
        INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
        VALUES (v_user_id, 0, 1, 100, 0);
        v_current_xp := 0;
        v_current_level := 1;
    END IF;
    
    RAISE NOTICE '📊 Current XP: %, Level: %', v_current_xp, v_current_level;
    
    -- Award 10X XP (1000 XP = 100 practice games or 50 competition games)
    PERFORM public.award_xp(
        v_user_id,
        v_xp_to_award,
        'admin_adjustment',
        NULL,
        '10X XP test award for level up testing'
    );
    
    -- Get new XP
    SELECT total_xp, current_level INTO v_current_xp, v_current_level
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    RAISE NOTICE '🎉 New XP: %, New Level: %', v_current_xp, v_current_level;
    RAISE NOTICE '✅ Awarded % XP to ImmersionProductions', v_xp_to_award;
END $$;

SELECT '✅ XP awarded! Check the NOTICE messages above for details.' as status;

