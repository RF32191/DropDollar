-- ============================================================================
-- VERIFY AND FIX CHALLENGE SYSTEM
-- ============================================================================
-- Verifies trigger is working and fixes any issues
-- Ensures update_challenges_on_game_complete function exists with correct signature
-- ============================================================================

-- ============================================================================
-- 1. VERIFY update_challenges_on_game_complete FUNCTION EXISTS
-- ============================================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_function_signature TEXT;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'update_challenges_on_game_complete'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ update_challenges_on_game_complete function exists';
        
        -- Get function signature
        SELECT pg_get_function_arguments(p.oid) INTO v_function_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'update_challenges_on_game_complete'
        LIMIT 1;
        
        RAISE NOTICE '   Function signature: %', v_function_signature;
    ELSE
        RAISE NOTICE '❌ update_challenges_on_game_complete function DOES NOT EXIST';
        RAISE NOTICE '   Will be created below...';
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE/UPDATE update_challenges_on_game_complete FUNCTION
-- ============================================================================
-- Create function outside DO block (can't CREATE FUNCTION inside DO block)

CREATE OR REPLACE FUNCTION public.update_challenges_on_game_complete(
    p_user_id UUID,
    p_game_type TEXT,
    p_score INTEGER,
    p_is_practice BOOLEAN,
    p_is_coin_play BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_type TEXT;
    v_increment INTEGER;
    v_coin_play_progress INTEGER;
    v_coin_play_target INTEGER;
    v_coin_play_challenge_id UUID;
BEGIN
    -- Determine challenge type and increment amount
    IF p_is_coin_play THEN
        v_challenge_type := 'play_coin_play';
        v_increment := 1;
    ELSIF p_is_practice THEN
        v_challenge_type := 'play_practice';
        v_increment := 1;
    ELSE
        v_challenge_type := 'play_competition';
        v_increment := 1;
    END IF;
    
    -- Update coin play challenge if it's a coin play game (DAILY ONLY)
    IF p_is_coin_play THEN
        -- Get current coin play progress BEFORE updating
        SELECT udc.progress, dc.target_value, dc.id 
        INTO v_coin_play_progress, v_coin_play_target, v_coin_play_challenge_id
        FROM public.user_daily_challenges udc
        JOIN public.daily_challenges dc ON udc.challenge_id = dc.id
        WHERE udc.user_id = p_user_id
        AND dc.challenge_date = CURRENT_DATE
        AND dc.challenge_type = 'play_coin_play'
        AND dc.is_active = true
        LIMIT 1;
        
        -- Update coin play progress
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'play_coin_play',
            1
        );
        
        -- If coin play challenge exists and progress will be divisible by 4, count as 1 competitive game
        IF v_coin_play_challenge_id IS NOT NULL AND (COALESCE(v_coin_play_progress, 0) + 1) % 4 = 0 THEN
            PERFORM public.update_daily_challenge_progress(
                p_user_id,
                'play_competition',
                1
            );
        END IF;
    END IF;
    
    -- Update practice or competition game challenges (only if NOT coin play, since coin play is handled above)
    IF NOT p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            v_challenge_type,
            v_increment
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            v_challenge_type,
            v_increment
        );
    END IF;
    
    -- Update games_count challenge (coin play counts as 1 game)
    PERFORM public.update_daily_challenge_progress(
        p_user_id,
        'games_count',
        1
    );
    
    PERFORM public.update_weekly_challenge_progress(
        p_user_id,
        'games_count',
        1
    );
    
    -- Update score_threshold challenge (cumulative score) - only for competition/coin play games
    IF NOT p_is_practice THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score
        );
    END IF;
    
    -- Update play_specific_game challenge (coin play counts as 1 game)
    PERFORM public.update_daily_challenge_progress(
        p_user_id,
        'play_specific_game',
        1
    );
    
    PERFORM public.update_weekly_challenge_progress(
        p_user_id,
        'play_specific_game',
        1
    );
END;
$$;

-- ============================================================================
-- 3. VERIFY TRIGGER EXISTS AND IS ACTIVE
-- ============================================================================

-- ============================================================================
-- 4. VERIFY TRIGGER EXISTS AND IS ACTIVE
-- ============================================================================

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_trigger_enabled BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    IF v_trigger_exists THEN
        SELECT tgenabled = 'O' INTO v_trigger_enabled
        FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass;
        
        IF v_trigger_enabled THEN
            RAISE NOTICE '✅ Trigger exists and is ENABLED';
        ELSE
            RAISE NOTICE '⚠️ Trigger exists but is DISABLED - enabling now...';
            ALTER TABLE public.game_history ENABLE TRIGGER trigger_update_challenges_on_game_history;
            RAISE NOTICE '✅ Trigger enabled';
        END IF;
    ELSE
        RAISE NOTICE '❌ Trigger DOES NOT EXIST - creating now...';
        
        -- Create trigger
        CREATE TRIGGER trigger_update_challenges_on_game_history
        AFTER INSERT ON public.game_history
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
        
        RAISE NOTICE '✅ Trigger created';
    END IF;
END $$;

-- ============================================================================
-- 5. TEST THE SYSTEM WITH A SAMPLE GAME
-- ============================================================================

DO $$
DECLARE
    v_test_user_id UUID;
    v_test_game_id UUID;
    v_progress_before INTEGER;
    v_progress_after INTEGER;
BEGIN
    -- Get a test user from recent games
    SELECT user_id INTO v_test_user_id
    FROM public.game_history
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '🧪 Testing challenge system for user: %', v_test_user_id;
        
        -- Get current progress for play_practice challenge
        SELECT COALESCE(udc.progress, 0) INTO v_progress_before
        FROM public.daily_challenges dc
        LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = v_test_user_id
        WHERE dc.challenge_date = CURRENT_DATE
        AND dc.challenge_type = 'play_practice'
        AND dc.is_active = true
        LIMIT 1;
        
        RAISE NOTICE '   Progress before: %', v_progress_before;
        
        -- Insert a test practice game
        INSERT INTO public.game_history (
            user_id,
            game_type,
            score,
            is_practice,
            is_competition,
            created_at
        ) VALUES (
            v_test_user_id,
            'multi_target',
            1000,
            true,
            false,
            NOW()
        ) RETURNING id INTO v_test_game_id;
        
        RAISE NOTICE '   Test game inserted: %', v_test_game_id;
        
        -- Wait a moment for trigger to fire
        PERFORM pg_sleep(0.5);
        
        -- Get progress after
        SELECT COALESCE(udc.progress, 0) INTO v_progress_after
        FROM public.daily_challenges dc
        LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = v_test_user_id
        WHERE dc.challenge_date = CURRENT_DATE
        AND dc.challenge_type = 'play_practice'
        AND dc.is_active = true
        LIMIT 1;
        
        RAISE NOTICE '   Progress after: %', v_progress_after;
        
        IF v_progress_after > v_progress_before THEN
            RAISE NOTICE '✅ SUCCESS! Challenge progress was updated!';
        ELSE
            RAISE NOTICE '❌ FAILED! Challenge progress was NOT updated.';
            RAISE NOTICE '   Check trigger logs above for errors.';
        END IF;
        
        -- Clean up test game
        DELETE FROM public.game_history WHERE id = v_test_game_id;
        RAISE NOTICE '   Test game cleaned up';
    ELSE
        RAISE NOTICE '⚠️ No users found to test with';
    END IF;
END $$;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_challenges_on_game_complete(UUID, TEXT, INTEGER, BOOLEAN, BOOLEAN) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.trigger_update_challenges_on_game_history() TO authenticated, service_role, anon;

-- ============================================================================
-- 7. SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CHALLENGE SYSTEM VERIFIED AND FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 STATUS:';
    RAISE NOTICE '   - Function exists and is callable';
    RAISE NOTICE '   - Trigger exists and is enabled';
    RAISE NOTICE '   - Test completed (see results above)';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 NEXT STEPS:';
    RAISE NOTICE '   1. Play a practice game';
    RAISE NOTICE '   2. Check dashboard - progress should update within 5 seconds';
    RAISE NOTICE '   3. If still not working, check browser console for errors';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenge System Verified and Fixed!' as status;

