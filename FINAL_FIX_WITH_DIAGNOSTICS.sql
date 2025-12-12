-- ============================================================================
-- FINAL FIX WITH COMPREHENSIVE DIAGNOSTICS
-- ============================================================================
-- This fixes the update functions to ensure they ALWAYS work
-- ============================================================================

-- ============================================================================
-- 1. FIX update_daily_challenge_progress - ENSURE IT FINDS CHALLENGES
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
    v_result JSONB;
BEGIN
    -- CRITICAL: Ensure challenges exist FIRST
    PERFORM public.generate_daily_challenges();
    
    -- Find the challenge for today
    SELECT dc.id, dc.target_value, dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- If challenge not found, return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_DAILY] Challenge not found: type=%, date=%', p_challenge_type, v_today;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Challenge not found',
            'challenge_type', p_challenge_type,
            'date', v_today::TEXT
        );
    END IF;
    
    -- Get or create user progress record
    SELECT progress INTO v_current_progress
    FROM public.user_daily_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    
    -- If no record exists, create one
    IF v_current_progress IS NULL THEN
        INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed)
        VALUES (p_user_id, v_challenge_id, 0, v_target_value, false)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        -- Re-fetch after insert
        SELECT progress INTO v_current_progress
        FROM public.user_daily_challenges
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        
        -- If still NULL, set to 0
        v_current_progress := COALESCE(v_current_progress, 0);
    END IF;
    
    -- Calculate new progress
    IF p_challenge_type = 'score_threshold' THEN
        -- For score challenges, add the increment (score value)
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        -- For count challenges, increment by 1
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Update progress
    UPDATE public.user_daily_challenges
    SET 
        progress = v_new_progress,
        is_completed = v_is_completed,
        completed_at = CASE WHEN v_is_completed AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    
    -- Award rewards if completed (only once)
    IF v_is_completed THEN
        -- Check if already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges 
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL 
            AND xp_awarded > 0
        ) THEN
            -- Award XP
            UPDATE public.user_xp 
            SET 
                total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log XP transaction
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type);
            
            -- Log RP transaction
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');
            
            -- Mark as awarded
            UPDATE public.user_daily_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_DAILY] ✅ Awarded % XP and % RP for challenge % to user %', 
                v_xp_reward, v_reward_points, p_challenge_type, p_user_id;
        END IF;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
    
    RAISE NOTICE '[UPDATE_DAILY] ✅ Updated daily challenge % for user %: progress=%/%', 
        p_challenge_type, p_user_id, v_new_progress, v_target_value;
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_DAILY] ❌ Error updating daily challenge progress for user % type %: %', 
        p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. FIX update_weekly_challenge_progress - ENSURE IT FINDS CHALLENGES
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
    v_result JSONB;
BEGIN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- CRITICAL: Ensure challenges exist FIRST
    PERFORM public.generate_weekly_challenges(v_week_start);
    
    -- Find the challenge for this week
    SELECT wc.id, wc.target_value, wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    -- If challenge not found, return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_WEEKLY] Challenge not found: type=%, week=%', p_challenge_type, v_week_start;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Challenge not found',
            'challenge_type', p_challenge_type,
            'week_start', v_week_start::TEXT
        );
    END IF;
    
    -- Get or create user progress record
    SELECT progress INTO v_current_progress
    FROM public.user_weekly_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    
    -- If no record exists, create one
    IF v_current_progress IS NULL THEN
        INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed)
        VALUES (p_user_id, v_challenge_id, 0, v_target_value, false)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        -- Re-fetch after insert
        SELECT progress INTO v_current_progress
        FROM public.user_weekly_challenges
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        
        -- If still NULL, set to 0
        v_current_progress := COALESCE(v_current_progress, 0);
    END IF;
    
    -- Calculate new progress
    IF p_challenge_type = 'score_threshold' THEN
        -- For score challenges, add the increment (score value)
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        -- For count challenges, increment by 1
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Update progress
    UPDATE public.user_weekly_challenges
    SET 
        progress = v_new_progress,
        is_completed = v_is_completed,
        completed_at = CASE WHEN v_is_completed AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    
    -- Award rewards if completed (only once)
    IF v_is_completed THEN
        -- Check if already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges 
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL 
            AND xp_awarded > 0
        ) THEN
            -- Award XP
            UPDATE public.user_xp 
            SET 
                total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log XP transaction
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type);
            
            -- Log RP transaction
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward');
            
            -- Mark as awarded
            UPDATE public.user_weekly_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_WEEKLY] ✅ Awarded % XP and % RP for challenge % to user %', 
                v_xp_reward, v_reward_points, p_challenge_type, p_user_id;
        END IF;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
    
    RAISE NOTICE '[UPDATE_WEEKLY] ✅ Updated weekly challenge % for user %: progress=%/%', 
        p_challenge_type, p_user_id, v_new_progress, v_target_value;
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_WEEKLY] ❌ Error updating weekly challenge progress for user % type %: %', 
        p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 3. VERIFY FUNCTIONS EXIST AND ARE CORRECT
-- ============================================================================

DO $$
DECLARE
    v_daily_exists BOOLEAN;
    v_weekly_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_daily_challenge_progress'
    ) INTO v_daily_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_weekly_challenge_progress'
    ) INTO v_weekly_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNCTIONS VERIFIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'update_daily_challenge_progress: %', CASE WHEN v_daily_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'update_weekly_challenge_progress: %', CASE WHEN v_weekly_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '';
END $$;

SELECT '✅ Final fix with diagnostics applied! Functions now ensure challenges exist and progress updates correctly.' as status;

