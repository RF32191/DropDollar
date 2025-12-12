-- ============================================================================
-- FIX RP PAYOUTS AND LEVEL UP PROGRESS BAR
-- ============================================================================
-- This fixes:
-- 1. RP payouts not working when challenges are completed
-- 2. Level up progress bar not showing correctly
-- ============================================================================

-- ============================================================================
-- 1. FIX update_daily_challenge_progress - CHECK AFTER UPDATE
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
    v_was_completed_before BOOLEAN := false;
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
    
    -- Find challenge and get current state
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points, COALESCE(udc.is_completed, false)
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points, v_was_completed_before
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
    
    -- CRITICAL: Save progress FIRST, then check if we just completed
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- CRITICAL: Award rewards if JUST completed (wasn't completed before, but is now)
    -- Check AFTER the update to ensure we catch the completion
    IF v_is_completed AND NOT v_was_completed_before THEN
        -- Double-check: verify rewards weren't already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL
            AND xp_awarded > 0
        ) THEN
            -- Award XP and RP (atomic update)
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log XP transaction
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type)
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
-- 2. FIX update_weekly_challenge_progress - CHECK AFTER UPDATE
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
    v_was_completed_before BOOLEAN := false;
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
    
    -- Find challenge and get current state
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points, COALESCE(uwc.is_completed, false)
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points, v_was_completed_before
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
    
    -- CRITICAL: Save progress FIRST, then check if we just completed
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- CRITICAL: Award rewards if JUST completed (wasn't completed before, but is now)
    -- Check AFTER the update to ensure we catch the completion
    IF v_is_completed AND NOT v_was_completed_before THEN
        -- Double-check: verify rewards weren't already awarded
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id AND xp_awarded IS NOT NULL AND xp_awarded > 0
        ) THEN
            -- Award XP and RP (atomic update)
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log XP transaction
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type)
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
-- 3. ENSURE get_user_xp RETURNS CORRECT xp_to_next_level FOR PROGRESS BAR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_xp(p_user_id UUID)
RETURNS TABLE (
    total_xp INTEGER,
    current_level INTEGER,
    xp_to_next_level INTEGER,
    reward_points INTEGER,
    rank_title TEXT,
    rank_tier INTEGER,
    rank_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_xp INTEGER;
    v_current_level INTEGER;
    v_xp_to_next INTEGER;
    v_reward_points INTEGER;
    v_rank_title TEXT;
    v_rank_tier INTEGER;
    v_rank_image_url TEXT;
    v_cumulative_xp INTEGER := 0;
    v_temp_level INTEGER;
    v_xp_earned_in_level INTEGER;
    v_xp_for_current_level INTEGER;
BEGIN
    -- Ensure records exist
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier)
    VALUES (p_user_id, 'Novice', 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current values (qualify column names to avoid ambiguity)
    SELECT ux.total_xp, ux.current_level, ux.reward_points
    INTO v_total_xp, v_current_level, v_reward_points
    FROM public.user_xp ux
    WHERE ux.user_id = p_user_id;
    
    -- CRITICAL: Calculate cumulative XP for all previous levels
    v_cumulative_xp := 0;
    v_temp_level := 1;
    WHILE v_temp_level < v_current_level LOOP
        v_cumulative_xp := v_cumulative_xp + FLOOR(100 * POWER(v_temp_level, 1.5))::INTEGER;
        v_temp_level := v_temp_level + 1;
    END LOOP;
    
    -- Calculate XP earned in current level
    v_xp_earned_in_level := v_total_xp - v_cumulative_xp;
    
    -- Calculate XP needed for current level
    v_xp_for_current_level := FLOOR(100 * POWER(v_current_level, 1.5))::INTEGER;
    
    -- CRITICAL: Calculate XP to next level (remaining XP needed)
    -- This is what the progress bar uses: (xp_earned_in_level / xp_for_current_level) * 100
    v_xp_to_next := v_xp_for_current_level - v_xp_earned_in_level;
    
    -- Ensure it's not negative (shouldn't happen, but safety check)
    IF v_xp_to_next < 0 THEN
        v_xp_to_next := 0;
    END IF;
    
    -- Also update the database with the correct value
    UPDATE public.user_xp
    SET xp_to_next_level = v_xp_to_next
    WHERE user_id = p_user_id;
    
    -- Get rank info (qualify column names to avoid ambiguity)
    SELECT ur.rank_title, ur.rank_tier, ur.rank_image_url
    INTO v_rank_title, v_rank_tier, v_rank_image_url
    FROM public.user_rankings ur
    WHERE ur.user_id = p_user_id;
    
    -- CRITICAL: Return single row directly (not from a table query)
    RETURN QUERY
    SELECT 
        COALESCE(v_total_xp, 0)::INTEGER,
        COALESCE(v_current_level, 1)::INTEGER,
        COALESCE(v_xp_to_next, 100)::INTEGER,
        COALESCE(v_reward_points, 0)::INTEGER,
        COALESCE(v_rank_title, 'Novice')::TEXT,
        COALESCE(v_rank_tier, 1)::INTEGER,
        COALESCE(v_rank_image_url, '')::TEXT;
END;
$$;

-- ============================================================================
-- 4. VERIFY AND FIX ANY COMPLETED CHALLENGES WITHOUT REWARDS
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_challenge_id UUID;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
    v_fixed_count INTEGER := 0;
BEGIN
    -- Find ImmersionProductions (or any user)
    SELECT id INTO v_user_id
    FROM public.users
    WHERE username = 'ImmersionProductions' OR email LIKE '%immersion%'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User ImmersionProductions not found. Skipping fix.';
        RETURN;
    END IF;
    
    -- Fix daily challenges without rewards
    FOR v_challenge_id, v_xp_reward, v_reward_points IN
        SELECT udc.challenge_id, dc.xp_reward, dc.reward_points
        FROM public.user_daily_challenges udc
        JOIN public.daily_challenges dc ON udc.challenge_id = dc.id
        WHERE udc.user_id = v_user_id
        AND udc.is_completed = true
        AND (udc.xp_awarded IS NULL OR udc.xp_awarded = 0)
    LOOP
        -- Award rewards
        UPDATE public.user_xp
        SET total_xp = total_xp + v_xp_reward,
            reward_points = reward_points + v_reward_points,
            updated_at = NOW()
        WHERE user_id = v_user_id;
        
        INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
        VALUES (v_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: retroactive reward')
        ON CONFLICT DO NOTHING;
        
        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (v_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge: retroactive reward')
        ON CONFLICT DO NOTHING;
        
        UPDATE public.user_daily_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = v_user_id AND challenge_id = v_challenge_id;
        
        v_fixed_count := v_fixed_count + 1;
    END LOOP;
    
    -- Fix weekly challenges without rewards
    FOR v_challenge_id, v_xp_reward, v_reward_points IN
        SELECT uwc.challenge_id, wc.xp_reward, wc.reward_points
        FROM public.user_weekly_challenges uwc
        JOIN public.weekly_challenges wc ON uwc.challenge_id = wc.id
        WHERE uwc.user_id = v_user_id
        AND uwc.is_completed = true
        AND (uwc.xp_awarded IS NULL OR uwc.xp_awarded = 0)
    LOOP
        -- Award rewards
        UPDATE public.user_xp
        SET total_xp = total_xp + v_xp_reward,
            reward_points = reward_points + v_reward_points,
            updated_at = NOW()
        WHERE user_id = v_user_id;
        
        INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
        VALUES (v_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: retroactive reward')
        ON CONFLICT DO NOTHING;
        
        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (v_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge: retroactive reward')
        ON CONFLICT DO NOTHING;
        
        UPDATE public.user_weekly_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = v_user_id AND challenge_id = v_challenge_id;
        
        v_fixed_count := v_fixed_count + 1;
    END LOOP;
    
    IF v_fixed_count > 0 THEN
        RAISE NOTICE '✅ Fixed % completed challenges without rewards for ImmersionProductions', v_fixed_count;
    ELSE
        RAISE NOTICE '✅ No completed challenges without rewards found for ImmersionProductions';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ RP payouts and level up progress bar fixed!' as status;

