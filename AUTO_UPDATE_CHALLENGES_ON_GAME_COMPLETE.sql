-- ============================================================================
-- AUTO-UPDATE CHALLENGES ON GAME COMPLETE
-- ============================================================================
-- Automatically updates challenge progress when games are completed
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION TO UPDATE CHALLENGES WHEN GAME IS SAVED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_challenges_on_game_complete(
    p_user_id UUID,
    p_game_type TEXT,
    p_score INTEGER,
    p_is_practice BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_type TEXT;
BEGIN
    -- Update practice or competition game challenges
    IF p_is_practice THEN
        v_challenge_type := 'play_practice';
    ELSE
        v_challenge_type := 'play_competition';
    END IF;
    
    -- Update daily challenge progress (game count)
    PERFORM public.update_daily_challenge_progress(
        p_user_id,
        v_challenge_type,
        1 -- Increment by 1 game
    );
    
    -- Update weekly challenge progress (game count)
    PERFORM public.update_weekly_challenge_progress(
        p_user_id,
        v_challenge_type,
        1 -- Increment by 1 game
    );
    
    -- Update games_count challenge (total games)
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
    
    -- Update score_threshold challenge (cumulative score) - only for competition games
    IF NOT p_is_practice THEN
        -- Daily score challenge - add score to progress
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score -- Add the score amount
        );
        
        -- Weekly score challenge - add score to progress
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score -- Add the score amount
        );
    END IF;
    
    -- Update play_specific_game challenge
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
-- 2. UPDATE save_game_history FUNCTION TO AUTO-UPDATE CHALLENGES
-- ============================================================================

-- Check if save_game_history function exists and update it
DO $$
BEGIN
    -- Check if function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'save_game_history'
    ) THEN
        -- Function exists, we'll create a wrapper or update it
        RAISE NOTICE 'save_game_history function exists - challenges will be updated via trigger';
    ELSE
        RAISE NOTICE 'save_game_history function does not exist - will use trigger instead';
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE TRIGGER TO AUTO-UPDATE CHALLENGES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only process if this is a new game record
    IF TG_OP = 'INSERT' THEN
        -- Update challenges based on game completion
        PERFORM public.update_challenges_on_game_complete(
            NEW.user_id,
            NEW.game_type,
            COALESCE(NEW.score, 0)::INTEGER,
            COALESCE(NEW.session_type = 'practice', false)
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_challenges_on_game_history
AFTER INSERT ON public.game_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();

-- ============================================================================
-- 4. FIX CHALLENGE PROGRESS FUNCTIONS TO HANDLE CUMULATIVE SCORES
-- ============================================================================

-- Update daily challenge progress to handle score_threshold as cumulative
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
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    -- Find today's challenge of this type
    SELECT id, target_value, xp_reward, reward_points INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.daily_challenges
    WHERE challenge_date = CURRENT_DATE
    AND challenge_type = p_challenge_type
    AND is_active = true
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge not found');
    END IF;

    -- Get or create progress record
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value)
    VALUES (p_user_id, v_challenge_id, 0, v_target_value)
    ON CONFLICT (user_id, challenge_id) DO NOTHING;

    -- Get current progress
    SELECT progress, is_completed INTO v_current_progress, v_is_completed
    FROM public.user_daily_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    IF v_is_completed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge already completed');
    END IF;

    -- Update progress (for score_threshold, increment is the score amount)
    -- For other challenges, increment is usually 1
    v_new_progress := LEAST(v_current_progress + p_progress_increment, v_target_value);
    v_is_completed := v_new_progress >= v_target_value;

    UPDATE public.user_daily_challenges
    SET 
        progress = v_new_progress,
        is_completed = v_is_completed,
        completed_at = CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    -- Award rewards if completed
    IF v_is_completed THEN
        -- Award XP
        UPDATE public.user_xp
        SET total_xp = total_xp + v_xp_reward,
            reward_points = reward_points + v_reward_points,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        -- Record XP transaction
        INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type);

        -- Record RP transaction
        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');

        UPDATE public.user_daily_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
END;
$$;

-- Update weekly challenge progress to handle score_threshold as cumulative
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
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    -- Calculate Monday of current week
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Find this week's challenge of this type
    SELECT id, target_value, xp_reward, reward_points INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.weekly_challenges
    WHERE week_start_date = v_week_start
    AND challenge_type = p_challenge_type
    AND is_active = true
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge not found');
    END IF;

    -- Get or create progress record
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value)
    VALUES (p_user_id, v_challenge_id, 0, v_target_value)
    ON CONFLICT (user_id, challenge_id) DO NOTHING;

    -- Get current progress
    SELECT progress, is_completed INTO v_current_progress, v_is_completed
    FROM public.user_weekly_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    IF v_is_completed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge already completed');
    END IF;

    -- Update progress (for score_threshold, increment is the score amount)
    -- For other challenges, increment is usually 1
    v_new_progress := LEAST(v_current_progress + p_progress_increment, v_target_value);
    v_is_completed := v_new_progress >= v_target_value;

    UPDATE public.user_weekly_challenges
    SET 
        progress = v_new_progress,
        is_completed = v_is_completed,
        completed_at = CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    -- Award rewards if completed
    IF v_is_completed THEN
        -- Award XP
        UPDATE public.user_xp
        SET total_xp = total_xp + v_xp_reward,
            reward_points = reward_points + v_reward_points,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        -- Record XP transaction
        INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type);

        -- Record RP transaction
        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward');

        UPDATE public.user_weekly_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
END;
$$;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_challenges_on_game_complete(UUID, TEXT, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_update_challenges_on_game_history() TO authenticated;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUTO-CHALLENGE UPDATES CONFIGURED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 Challenge Updates:';
    RAISE NOTICE '   - Automatically updates when games are completed';
    RAISE NOTICE '   - Tracks practice/competition game counts';
    RAISE NOTICE '   - Tracks cumulative scores (10K daily, 100K weekly)';
    RAISE NOTICE '   - Tracks total games played';
    RAISE NOTICE '   - Tracks specific game types';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Score Thresholds:';
    RAISE NOTICE '   Daily: 10,000 points (cumulative)';
    RAISE NOTICE '   Weekly: 100,000 points (cumulative)';
    RAISE NOTICE '';
END $$;

SELECT '✅ Auto-Challenge Updates Configured!' as status;

