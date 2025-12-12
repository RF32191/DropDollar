-- ============================================================================
-- EXACT COPY OF WEEKLY LOGIC TO DAILY - WEEKLY WORKS, DAILY DOESN'T
-- ============================================================================
-- This copies the EXACT working weekly code to daily
-- ============================================================================

-- ============================================================================
-- 1. COPY EXACT WEEKLY FUNCTION TO DAILY (CHARACTER FOR CHARACTER)
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
    v_today DATE; -- Changed from v_week_start but same pattern
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER := 0;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    -- EXACT COPY: Calculate date (same pattern as weekly calculates week_start)
    v_today := CURRENT_DATE;
    
    -- EXACT COPY: Ensure challenges exist (same pattern as weekly)
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- EXACT COPY: Fast lookup with index (same pattern as weekly)
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today -- Changed from week_start_date but same pattern
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- EXACT COPY: If challenge doesn't exist, return early (same pattern as weekly)
    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found', 'type', p_challenge_type);
    END IF;
    
    -- EXACT COPY: Calculate new progress (same pattern as weekly)
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- EXACT COPY: Fast upsert with index (same pattern as weekly)
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- EXACT COPY: Award rewards if completed (only once) - same pattern as weekly
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL
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
    
    -- EXACT COPY: Return same format as weekly
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. COPY EXACT WEEKLY get_weekly_challenges TO get_daily_challenges
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_challenges(p_user_id UUID)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name TEXT,
    challenge_description TEXT,
    challenge_type TEXT,
    target_value INTEGER,
    progress INTEGER,
    xp_reward INTEGER,
    reward_points INTEGER,
    is_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE; -- Changed from v_week_start but same pattern
BEGIN
    -- EXACT COPY: Calculate date (same pattern as weekly)
    v_today := CURRENT_DATE;
    
    -- EXACT COPY: Ensure challenges exist (same pattern as weekly)
    PERFORM public.generate_daily_challenges();
    
    -- EXACT COPY: Return challenges with user progress (same pattern as weekly)
    RETURN QUERY
    SELECT 
        dc.id,
        dc.challenge_name,
        dc.challenge_description,
        dc.challenge_type,
        dc.target_value,
        COALESCE(udc.progress, 0), -- EXACT COPY: Same as weekly
        dc.xp_reward,
        dc.reward_points,
        COALESCE(udc.is_completed, false) -- EXACT COPY: Same as weekly
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today -- Changed from week_start_date but same pattern
    AND dc.is_active = true
    ORDER BY dc.challenge_type;
END;
$$;

-- ============================================================================
-- 3. FIX XP PROGRESS BAR - ENSURE get_user_xp RETURNS DATA CORRECTLY
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
    
    -- Get current values
    SELECT total_xp, current_level, reward_points
    INTO v_total_xp, v_current_level, v_reward_points
    FROM public.user_xp
    WHERE user_id = p_user_id;
    
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
    v_xp_to_next := v_xp_for_current_level - v_xp_earned_in_level;
    
    -- Ensure it's not negative
    IF v_xp_to_next < 0 THEN
        v_xp_to_next := 0;
    END IF;
    
    -- Get rank info
    SELECT rank_title, rank_tier, rank_image_url
    INTO v_rank_title, v_rank_tier, v_rank_image_url
    FROM public.user_rankings
    WHERE user_id = p_user_id;
    
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
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ EXACT COPY APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - Daily function is EXACT copy of working weekly function';
    RAISE NOTICE '   - get_daily_challenges is EXACT copy of get_weekly_challenges';
    RAISE NOTICE '   - get_user_xp returns correct values for progress bar';
    RAISE NOTICE '';
END $$;

SELECT '✅ Exact copy applied! Daily should now work exactly like weekly.' as status;

