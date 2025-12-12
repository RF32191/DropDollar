-- ============================================================================
-- CRITICAL FIX FOR CHALLENGE PROGRESS UPDATES
-- ============================================================================
-- This fixes the issue where progress bars don't update
-- Problem: Challenges might not exist or date mismatch
-- Solution: Ensure challenges exist and update functions find them correctly
-- ============================================================================

-- ============================================================================
-- 1. FIX update_daily_challenge_progress TO ENSURE IT FINDS CHALLENGES
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
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
    v_user_timezone TEXT;
    v_today DATE;
    v_challenge_exists BOOLEAN;
BEGIN
    -- Get user timezone (default to UTC)
    SELECT COALESCE(timezone, 'UTC') INTO v_user_timezone
    FROM public.users
    WHERE id = p_user_id;
    
    -- Calculate today's date in user's timezone
    v_today := (NOW() AT TIME ZONE v_user_timezone)::DATE;
    
    -- CRITICAL: Ensure challenges exist for today BEFORE trying to find them
    -- Generate challenges if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
    ) THEN
        RAISE NOTICE '[UPDATE_DAILY] No challenges found for %, generating...', v_today;
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Find today's challenge of this type
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, try to generate it and return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_DAILY] Challenge not found: type=%, date=%, user=%', p_challenge_type, v_today, p_user_id;
        
        -- Try generating challenges again
        PERFORM public.generate_daily_challenges();
        
        -- Try finding again
        SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
        INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
        FROM public.daily_challenges dc
        LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
        WHERE dc.challenge_date = v_today
        AND dc.challenge_type = p_challenge_type
        AND dc.is_active = true
        LIMIT 1;
        
        -- If still not found, return error
        IF v_challenge_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Challenge not found after generation',
                'challenge_type', p_challenge_type,
                'date', v_today,
                'user_timezone', v_user_timezone
            );
        END IF;
    END IF;
    
    -- Calculate new progress
    IF p_challenge_type = 'score_threshold' THEN
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    -- Check if completed
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Create or update user challenge progress
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = v_new_progress,
        is_completed = v_is_completed,
        updated_at = NOW();
    
    RAISE NOTICE '[UPDATE_DAILY] ✅ Updated challenge % for user %: progress %/% (was %)', 
        p_challenge_type, p_user_id, v_new_progress, v_target_value, v_current_progress;
    
    -- Award rewards if completed (and not already awarded)
    IF v_is_completed THEN
        -- Check if already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id
            AND challenge_id = v_challenge_id
            AND xp_awarded IS NOT NULL
        ) THEN
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
            
            -- Mark as awarded
            UPDATE public.user_daily_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_DAILY] ✅ Awarded rewards: % XP, % RP', v_xp_reward, v_reward_points;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_DAILY] ❌ Error updating daily challenge progress: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 2. FIX update_weekly_challenge_progress TO ENSURE IT FINDS CHALLENGES
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
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
    v_user_timezone TEXT;
BEGIN
    -- Get user timezone (default to UTC)
    SELECT COALESCE(timezone, 'UTC') INTO v_user_timezone
    FROM public.users
    WHERE id = p_user_id;
    
    -- Calculate Monday of current week in user's timezone
    v_week_start := DATE_TRUNC('week', (NOW() AT TIME ZONE v_user_timezone)::DATE)::DATE;
    
    -- CRITICAL: Ensure challenges exist for this week BEFORE trying to find them
    IF NOT EXISTS (
        SELECT 1 FROM public.weekly_challenges 
        WHERE week_start_date = v_week_start 
        AND is_active = true
    ) THEN
        RAISE NOTICE '[UPDATE_WEEKLY] No challenges found for week %, generating...', v_week_start;
        PERFORM public.generate_weekly_challenges(v_week_start);
    END IF;
    
    -- Find this week's challenge of this type
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, try to generate it and return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_WEEKLY] Challenge not found: type=%, week=%, user=%', p_challenge_type, v_week_start, p_user_id;
        
        -- Try generating challenges again
        PERFORM public.generate_weekly_challenges(v_week_start);
        
        -- Try finding again
        SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points
        INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
        FROM public.weekly_challenges wc
        LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
        WHERE wc.week_start_date = v_week_start
        AND wc.challenge_type = p_challenge_type
        AND wc.is_active = true
        LIMIT 1;
        
        -- If still not found, return error
        IF v_challenge_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Challenge not found after generation',
                'challenge_type', p_challenge_type,
                'week_start', v_week_start,
                'user_timezone', v_user_timezone
            );
        END IF;
    END IF;
    
    -- Calculate new progress
    IF p_challenge_type = 'score_threshold' THEN
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    -- Check if completed
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Create or update user challenge progress
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = v_new_progress,
        is_completed = v_is_completed,
        updated_at = NOW();
    
    RAISE NOTICE '[UPDATE_WEEKLY] ✅ Updated challenge % for user %: progress %/% (was %)', 
        p_challenge_type, p_user_id, v_new_progress, v_target_value, v_current_progress;
    
    -- Award rewards if completed (and not already awarded)
    IF v_is_completed THEN
        -- Check if already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id
            AND challenge_id = v_challenge_id
            AND xp_awarded IS NOT NULL
        ) THEN
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
            
            -- Mark as awarded
            UPDATE public.user_weekly_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_WEEKLY] ✅ Awarded rewards: % XP, % RP', v_xp_reward, v_reward_points;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_WEEKLY] ❌ Error updating weekly challenge progress: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 3. ENSURE generate_daily_challenges USES CURRENT_DATE (not timezone)
-- ============================================================================

-- The generate_daily_challenges function should use CURRENT_DATE (server date)
-- because challenges are generated once per day for all users
-- The update functions will match them using the user's timezone

-- ============================================================================
-- 4. CREATE TEST FUNCTION TO MANUALLY UPDATE PROGRESS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_challenge_update(
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
    -- Test daily challenge update
    v_daily_result := public.update_daily_challenge_progress(
        p_user_id,
        p_challenge_type,
        p_increment
    );
    
    -- Test weekly challenge update
    v_weekly_result := public.update_weekly_challenge_progress(
        p_user_id,
        p_challenge_type,
        p_increment
    );
    
    RETURN jsonb_build_object(
        'daily', v_daily_result,
        'weekly', v_weekly_result
    );
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CRITICAL CHALLENGE PROGRESS FIX';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 WHAT WAS FIXED:';
    RAISE NOTICE '   1. update_daily_challenge_progress now ensures challenges exist';
    RAISE NOTICE '   2. update_weekly_challenge_progress now ensures challenges exist';
    RAISE NOTICE '   3. Both functions generate challenges if missing';
    RAISE NOTICE '   4. Enhanced logging to track what happens';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TO TEST:';
    RAISE NOTICE '   SELECT public.test_challenge_update(''YOUR_USER_ID'', ''play_practice'', 1);';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHECK LOGS:';
    RAISE NOTICE '   - Look for [UPDATE_DAILY] and [UPDATE_WEEKLY] messages';
    RAISE NOTICE '   - Should see "✅ Updated challenge" messages';
    RAISE NOTICE '';
END $$;

SELECT '✅ Critical challenge progress fix applied! Challenges will be auto-generated if missing.' as status;

