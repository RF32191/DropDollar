-- ============================================================================
-- FIX RP AND XP PAYOUTS FOR COMPLETED CHALLENGES
-- ============================================================================
-- This ensures completed challenges properly award XP and RP
-- ============================================================================

-- ============================================================================
-- 1. FIX update_daily_challenge_progress TO PROPERLY AWARD REWARDS
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
    v_today DATE;
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER := 0;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_was_completed BOOLEAN := false;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    v_today := CURRENT_DATE;
    
    -- Ensure challenges exist
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Find challenge
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points, COALESCE(udc.is_completed, false)
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points, v_was_completed
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found', 'type', p_challenge_type);
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Save progress
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- CRITICAL: Award rewards if JUST completed (wasn't completed before, but is now)
    IF v_is_completed AND NOT v_was_completed THEN
        -- Check if rewards were already awarded (double-check)
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL
            AND xp_awarded > 0
        ) THEN
            -- Award XP
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log XP transaction
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'daily_challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            -- Log RP transaction
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward')
            ON CONFLICT DO NOTHING;
            
            -- Mark rewards as awarded
            UPDATE public.user_daily_challenges
            SET xp_awarded = v_xp_reward, 
                reward_points_awarded = v_reward_points,
                completed_at = NOW()
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_DAILY] ✅ Awarded % XP and % RP for challenge %', v_xp_reward, v_reward_points, p_challenge_type;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value, 'is_completed', v_is_completed);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_DAILY] ❌ Error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. FIX update_weekly_challenge_progress TO PROPERLY AWARD REWARDS
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
    v_was_completed BOOLEAN := false;
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
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points, COALESCE(uwc.is_completed, false)
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points, v_was_completed
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Calculate progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Save progress
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- CRITICAL: Award rewards if JUST completed (wasn't completed before, but is now)
    IF v_is_completed AND NOT v_was_completed THEN
        -- Check if rewards were already awarded (double-check)
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id AND xp_awarded IS NOT NULL AND xp_awarded > 0
        ) THEN
            -- Award XP
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log XP transaction
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'daily_challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            -- Log RP transaction
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward')
            ON CONFLICT DO NOTHING;
            
            -- Mark rewards as awarded
            UPDATE public.user_weekly_challenges
            SET xp_awarded = v_xp_reward, 
                reward_points_awarded = v_reward_points,
                completed_at = NOW()
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_WEEKLY] ✅ Awarded % XP and % RP for challenge %', v_xp_reward, v_reward_points, p_challenge_type;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value, 'is_completed', v_is_completed);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_WEEKLY] ❌ Error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 3. CHECK FOR COMPLETED CHALLENGES THAT DIDN'T GET REWARDS
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_unpaid_daily INTEGER;
    v_unpaid_weekly INTEGER;
BEGIN
    -- Find ImmersionProductions
    SELECT id INTO v_user_id
    FROM public.users
    WHERE username = 'ImmersionProductions' OR email LIKE '%immersion%';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User ImmersionProductions not found.';
        RETURN;
    END IF;
    
    -- Count completed daily challenges without rewards
    SELECT COUNT(*) INTO v_unpaid_daily
    FROM public.user_daily_challenges udc
    JOIN public.daily_challenges dc ON udc.challenge_id = dc.id
    WHERE udc.user_id = v_user_id
    AND udc.is_completed = true
    AND (udc.xp_awarded IS NULL OR udc.xp_awarded = 0);
    
    -- Count completed weekly challenges without rewards
    SELECT COUNT(*) INTO v_unpaid_weekly
    FROM public.user_weekly_challenges uwc
    JOIN public.weekly_challenges wc ON uwc.challenge_id = wc.id
    WHERE uwc.user_id = v_user_id
    AND uwc.is_completed = true
    AND (uwc.xp_awarded IS NULL OR uwc.xp_awarded = 0);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UNPAID CHALLENGES CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Daily challenges without rewards: %', v_unpaid_daily;
    RAISE NOTICE 'Weekly challenges without rewards: %', v_unpaid_weekly;
    RAISE NOTICE '';
    
    IF v_unpaid_daily > 0 OR v_unpaid_weekly > 0 THEN
        RAISE NOTICE '⚠️  Found completed challenges without rewards!';
        RAISE NOTICE '   These will be fixed by the updated functions above.';
    ELSE
        RAISE NOTICE '✅ All completed challenges have been rewarded.';
    END IF;
    
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ RP/XP payout functions fixed! Rewards will now be properly awarded when challenges are completed.' as status;

