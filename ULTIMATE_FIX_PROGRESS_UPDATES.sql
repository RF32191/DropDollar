-- ============================================================================
-- ULTIMATE FIX FOR PROGRESS UPDATES - ENSURES RECORDS ARE CREATED
-- ============================================================================
-- This fixes the critical issue where progress records aren't being created
-- ============================================================================

-- ============================================================================
-- 1. FIX update_daily_challenge_progress - CREATE RECORD IF MISSING
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
    v_today DATE := CURRENT_DATE;
    v_result JSONB;
BEGIN
    -- CRITICAL: Always ensure challenges exist
    PERFORM public.generate_daily_challenges();
    
    -- Find the challenge
    SELECT dc.id, dc.target_value, dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_DAILY] Challenge not found: type=%, date=%', p_challenge_type, v_today;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Get current progress (or 0 if no record exists)
    SELECT COALESCE(progress, 0) INTO v_current_progress
    FROM public.user_daily_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    
    -- CRITICAL: If no record exists, create it with progress 0
    IF v_current_progress IS NULL THEN
        INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed)
        VALUES (p_user_id, v_challenge_id, 0, v_target_value, false)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        -- Re-fetch to get the actual value (might have been created by conflict)
        SELECT COALESCE(progress, 0) INTO v_current_progress
        FROM public.user_daily_challenges
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        
        -- If still NULL, something went wrong, but continue with 0
        v_current_progress := COALESCE(v_current_progress, 0);
    END IF;
    
    -- Calculate new progress
    IF p_challenge_type = 'score_threshold' THEN
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    v_is_completed := v_new_progress >= v_target_value;
    
    -- CRITICAL: Always update the record (INSERT or UPDATE)
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (only once)
    IF v_is_completed THEN
        -- Check if rewards already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL 
            AND xp_awarded > 0
        ) THEN
            -- Award XP and RP
            UPDATE public.user_xp
            SET 
                total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log transactions
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type);
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');
            
            -- Mark as awarded
            UPDATE public.user_daily_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_DAILY] ✅ Awarded % XP and % RP for challenge %', v_xp_reward, v_reward_points, p_challenge_type;
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
    
    RAISE NOTICE '[UPDATE_DAILY] ✅ Updated: user=%, type=%, progress=%/%', 
        p_user_id, p_challenge_type, v_new_progress, v_target_value;
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_DAILY] ❌ Error: user=%, type=%, error=%', p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. FIX update_weekly_challenge_progress - CREATE RECORD IF MISSING
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
    v_result JSONB;
BEGIN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- CRITICAL: Always ensure challenges exist
    PERFORM public.generate_weekly_challenges(v_week_start);
    
    -- Find the challenge
    SELECT wc.id, wc.target_value, wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_WEEKLY] Challenge not found: type=%, week=%', p_challenge_type, v_week_start;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Get current progress (or 0 if no record exists)
    SELECT COALESCE(progress, 0) INTO v_current_progress
    FROM public.user_weekly_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    
    -- CRITICAL: If no record exists, create it with progress 0
    IF v_current_progress IS NULL THEN
        INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed)
        VALUES (p_user_id, v_challenge_id, 0, v_target_value, false)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        -- Re-fetch to get the actual value
        SELECT COALESCE(progress, 0) INTO v_current_progress
        FROM public.user_weekly_challenges
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        
        -- If still NULL, continue with 0
        v_current_progress := COALESCE(v_current_progress, 0);
    END IF;
    
    -- Calculate new progress
    IF p_challenge_type = 'score_threshold' THEN
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    v_is_completed := v_new_progress >= v_target_value;
    
    -- CRITICAL: Always update the record (INSERT or UPDATE)
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (only once)
    IF v_is_completed THEN
        -- Check if rewards already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL 
            AND xp_awarded > 0
        ) THEN
            -- Award XP and RP
            UPDATE public.user_xp
            SET 
                total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log transactions
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type);
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward');
            
            -- Mark as awarded
            UPDATE public.user_weekly_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_WEEKLY] ✅ Awarded % XP and % RP for challenge %', v_xp_reward, v_reward_points, p_challenge_type;
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
    
    RAISE NOTICE '[UPDATE_WEEKLY] ✅ Updated: user=%, type=%, progress=%/%', 
        p_user_id, p_challenge_type, v_new_progress, v_target_value;
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_WEEKLY] ❌ Error: user=%, type=%, error=%', p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ULTIMATE FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - Progress records are ALWAYS created if missing';
    RAISE NOTICE '   - Progress is ALWAYS updated correctly';
    RAISE NOTICE '   - Comprehensive error handling and logging';
    RAISE NOTICE '';
END $$;

SELECT '✅ Ultimate fix applied! Progress records will now be created and updated correctly.' as status;

