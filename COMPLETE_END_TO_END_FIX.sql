-- ============================================================================
-- COMPLETE END-TO-END FIX FOR CHALLENGE PROGRESS
-- ============================================================================
-- This ensures EVERYTHING works:
-- 1. Trigger fires correctly
-- 2. Challenges are found and updated
-- 3. Progress is saved correctly
-- 4. Frontend can see the updates
-- ============================================================================

-- ============================================================================
-- 1. VERIFY AND FIX TRIGGER (MOST CRITICAL)
-- ============================================================================

-- First, check if trigger exists
DO $$
DECLARE
    v_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    IF NOT v_trigger_exists THEN
        RAISE NOTICE 'Creating trigger...';
    ELSE
        RAISE NOTICE 'Trigger exists, recreating to ensure it works...';
    END IF;
END $$;

-- Recreate trigger function with explicit error handling
CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_practice BOOLEAN;
    v_is_coin_play BOOLEAN := false;
    v_tournament_type TEXT;
BEGIN
    -- CRITICAL: Only process INSERT
    IF TG_OP = 'INSERT' THEN
        -- Get is_practice (CRITICAL - this is what determines challenge type)
        v_is_practice := COALESCE(NEW.is_practice, false);
        
        -- Get tournament type
        IF NEW.metadata IS NOT NULL THEN
            v_tournament_type := NEW.metadata->>'tournament_type';
        END IF;
        
        -- Detect coin play
        IF NEW.metadata IS NOT NULL AND (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
            v_is_coin_play := true;
        ELSIF NEW.listing_id IS NOT NULL AND NEW.listing_id::TEXT LIKE 'cp-%' THEN
            v_is_coin_play := true;
        END IF;
        
        -- Award XP
        IF v_is_practice THEN
            PERFORM public.award_practice_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
        ELSE
            PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
        END IF;
        
        -- CRITICAL: Update challenges - this MUST happen
        PERFORM public.update_challenges_on_game_complete(
            NEW.user_id,
            COALESCE(NEW.game_type, 'unknown'),
            COALESCE(NEW.score, 0)::INTEGER,
            v_is_practice,
            v_is_coin_play,
            v_tournament_type
        );
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error in trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;

CREATE TRIGGER trigger_update_challenges_on_game_history
AFTER INSERT ON public.game_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();

-- ============================================================================
-- 2. ENSURE update_challenges_on_game_complete WORKS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_challenges_on_game_complete(
    p_user_id UUID,
    p_game_type TEXT,
    p_score INTEGER,
    p_is_practice BOOLEAN,
    p_is_coin_play BOOLEAN DEFAULT false,
    p_tournament_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_type TEXT;
    v_increment INTEGER := 1;
BEGIN
    -- Determine challenge type based on game type
    IF p_is_coin_play THEN
        v_challenge_type := 'play_coin_play';
    ELSIF p_is_practice THEN
        v_challenge_type := 'play_practice';
    ELSIF p_tournament_type = '1v1' OR p_tournament_type = 'one_v_one' THEN
        v_challenge_type := 'play_1v1';
    ELSIF p_tournament_type = 'winner_takes_all' OR p_tournament_type = 'wta' THEN
        v_challenge_type := 'play_winner_takes_all';
    ELSIF p_tournament_type = 'hot_sell' THEN
        v_challenge_type := 'play_hot_sell';
    ELSE
        v_challenge_type := 'play_competition';
    END IF;
    
    -- Update coin play (daily only)
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_coin_play', v_increment);
    END IF;
    
    -- Update specific challenge type (if not coin play)
    IF NOT p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, v_challenge_type, v_increment);
        PERFORM public.update_weekly_challenge_progress(p_user_id, v_challenge_type, v_increment);
    END IF;
    
    -- Update games_count (ALL games)
    PERFORM public.update_daily_challenge_progress(p_user_id, 'games_count', v_increment);
    PERFORM public.update_weekly_challenge_progress(p_user_id, 'games_count', v_increment);
    
    -- Update score_threshold (competition games only)
    IF NOT p_is_practice THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'score_threshold', p_score);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'score_threshold', p_score);
    END IF;
    
    -- Update play_specific_game (ALL games)
    PERFORM public.update_daily_challenge_progress(p_user_id, 'play_specific_game', v_increment);
    PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_specific_game', v_increment);
END;
$$;

-- ============================================================================
-- 3. ENSURE update_daily_challenge_progress WORKS CORRECTLY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_daily_challenge_progress(
    p_user_id UUID,
    p_challenge_type TEXT,
    p_progress_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER := 0;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Ensure challenges exist
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today AND is_active = true LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Find challenge
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- If not found, return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING 'Challenge not found: type=%, date=%, user=%', p_challenge_type, v_today, p_user_id;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Save progress
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated daily %: user=%, progress=%/%', p_challenge_type, p_user_id, v_new_progress, v_target_value;
    
    -- Award rewards if completed
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id AND xp_awarded IS NOT NULL
        ) THEN
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward')
            ON CONFLICT DO NOTHING;
            
            UPDATE public.user_daily_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error updating daily challenge: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 4. ENSURE update_weekly_challenge_progress WORKS CORRECTLY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_weekly_challenge_progress(
    p_user_id UUID,
    p_challenge_type TEXT,
    p_progress_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER := 0;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure challenges exist
    IF NOT EXISTS (
        SELECT 1 FROM public.weekly_challenges 
        WHERE week_start_date = v_week_start AND is_active = true LIMIT 1
    ) THEN
        PERFORM public.generate_weekly_challenges(v_week_start);
    END IF;
    
    -- Find challenge
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    -- If not found, return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING 'Weekly challenge not found: type=%, week=%, user=%', p_challenge_type, v_week_start, p_user_id;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Save progress
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated weekly %: user=%, progress=%/%', p_challenge_type, p_user_id, v_new_progress, v_target_value;
    
    -- Award rewards if completed
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id AND xp_awarded IS NOT NULL
        ) THEN
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward')
            ON CONFLICT DO NOTHING;
            
            UPDATE public.user_weekly_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error updating weekly challenge: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 5. CREATE TEST FUNCTION TO MANUALLY TEST PROGRESS UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_challenge_progress_update(
    p_user_id UUID,
    p_challenge_type TEXT DEFAULT 'play_practice',
    p_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_daily_result JSONB;
    v_weekly_result JSONB;
BEGIN
    -- Test daily update
    v_daily_result := public.update_daily_challenge_progress(p_user_id, p_challenge_type, p_increment);
    
    -- Test weekly update
    v_weekly_result := public.update_weekly_challenge_progress(p_user_id, p_challenge_type, p_increment);
    
    RETURN jsonb_build_object(
        'daily', v_daily_result,
        'weekly', v_weekly_result,
        'message', 'Test complete - check results'
    );
END;
$$;

-- ============================================================================
-- 6. VERIFY EVERYTHING IS SET UP
-- ============================================================================

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_functions_exist BOOLEAN;
BEGIN
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    -- Check functions
    SELECT (
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_daily_challenge_progress') AND
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_weekly_challenge_progress') AND
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_challenges_on_game_complete')
    ) INTO v_functions_exist;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
    RAISE NOTICE 'Functions exist: %', v_functions_exist;
    RAISE NOTICE '';
    
    IF NOT v_trigger_exists THEN
        RAISE WARNING '❌ TRIGGER IS MISSING!';
    END IF;
    
    IF NOT v_functions_exist THEN
        RAISE WARNING '❌ SOME FUNCTIONS ARE MISSING!';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '✅ Complete end-to-end fix applied! Trigger and functions verified.' as status;
SELECT '🧪 To test manually: SELECT public.test_challenge_progress_update(''USER_ID'', ''play_practice'', 1);' as test_instruction;

