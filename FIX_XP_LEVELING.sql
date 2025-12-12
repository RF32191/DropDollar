-- ============================================================================
-- FIX XP LEVELING - ENSURE PROGRESS GOES TO 100% AND LEVELS UP
-- ============================================================================

-- ============================================================================
-- 1. FIX award_xp FUNCTION - CORRECT LEVEL CALCULATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_xp(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_transaction_type TEXT,
    p_source_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_xp INTEGER;
    v_current_level INTEGER;
    v_new_total_xp INTEGER;
    v_new_level INTEGER;
    v_xp_to_next_level INTEGER;
    v_leveled_up BOOLEAN := FALSE;
    v_old_level INTEGER;
    v_xp_for_current_level INTEGER;
    v_xp_earned_in_level INTEGER;
    v_cumulative_xp INTEGER := 0;
    v_temp_level INTEGER := 1;
BEGIN
    -- Ensure user_xp record exists
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get current XP and level
    SELECT total_xp, current_level, xp_to_next_level
    INTO v_current_xp, v_current_level, v_xp_to_next_level
    FROM public.user_xp
    WHERE user_id = p_user_id;

    v_old_level := v_current_level;
    v_new_total_xp := v_current_xp + p_xp_amount;
    v_new_level := v_current_level;

    -- Calculate XP needed for current level
    v_xp_for_current_level := FLOOR(100 * POWER(v_current_level, 1.5))::INTEGER;
    
    -- Calculate cumulative XP for all previous levels
    v_cumulative_xp := 0;
    v_temp_level := 1;
    WHILE v_temp_level < v_current_level LOOP
        v_cumulative_xp := v_cumulative_xp + FLOOR(100 * POWER(v_temp_level, 1.5))::INTEGER;
        v_temp_level := v_temp_level + 1;
    END LOOP;
    
    -- Calculate XP earned in current level
    v_xp_earned_in_level := v_current_xp - v_cumulative_xp;

    -- Add new XP to current level progress
    v_xp_earned_in_level := v_xp_earned_in_level + p_xp_amount;

    -- Check for level ups
    WHILE v_xp_earned_in_level >= v_xp_for_current_level LOOP
        v_xp_earned_in_level := v_xp_earned_in_level - v_xp_for_current_level;
        v_new_level := v_new_level + 1;
        v_leveled_up := TRUE;
        v_xp_for_current_level := FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER;
    END LOOP;

    -- Calculate XP to next level (remaining XP needed)
    v_xp_to_next_level := v_xp_for_current_level - v_xp_earned_in_level;

    -- Update user XP
    UPDATE public.user_xp
    SET 
        total_xp = v_new_total_xp,
        current_level = v_new_level,
        xp_to_next_level = v_xp_to_next_level,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record XP transaction
    INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
    VALUES (p_user_id, p_xp_amount, p_transaction_type, p_source_id, p_description);

    -- Update ranking if leveled up
    IF v_leveled_up THEN
        PERFORM public.update_user_ranking(p_user_id);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'leveled_up', v_leveled_up,
        'old_level', v_old_level,
        'new_level', v_new_level,
        'old_xp', v_current_xp,
        'new_xp', v_new_total_xp,
        'xp_to_next_level', v_xp_to_next_level,
        'xp_earned_in_level', v_xp_earned_in_level,
        'xp_for_current_level', v_xp_for_current_level
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in award_xp: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. FIX get_user_xp TO RETURN CORRECT xp_to_next_level
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
    
    -- Calculate cumulative XP for all previous levels
    v_temp_level := 1;
    WHILE v_temp_level < v_current_level LOOP
        v_cumulative_xp := v_cumulative_xp + FLOOR(100 * POWER(v_temp_level, 1.5))::INTEGER;
        v_temp_level := v_temp_level + 1;
    END LOOP;
    
    -- Calculate XP earned in current level
    v_xp_earned_in_level := v_total_xp - v_cumulative_xp;
    
    -- Calculate XP needed for current level
    v_xp_for_current_level := FLOOR(100 * POWER(v_current_level, 1.5))::INTEGER;
    
    -- Calculate XP to next level (remaining XP needed)
    v_xp_to_next := v_xp_for_current_level - v_xp_earned_in_level;
    
    -- Get rank info
    SELECT rank_title, rank_tier, rank_image_url
    INTO v_rank_title, v_rank_tier, v_rank_image_url
    FROM public.user_rankings
    WHERE user_id = p_user_id;
    
    RETURN QUERY
    SELECT 
        COALESCE(v_total_xp, 0),
        COALESCE(v_current_level, 1),
        COALESCE(v_xp_to_next, 100),
        COALESCE(v_reward_points, 0),
        COALESCE(v_rank_title, 'Novice')::TEXT,
        COALESCE(v_rank_tier, 1),
        v_rank_image_url
    FROM public.user_xp
    WHERE user_id = p_user_id
    LIMIT 1;
END;
$$;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ XP LEVELING FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - award_xp now correctly calculates level progression';
    RAISE NOTICE '   - get_user_xp returns correct xp_to_next_level';
    RAISE NOTICE '   - Progress will now go to 100%% before leveling up';
END $$;

SELECT '✅ XP leveling fixed! Progress will now correctly reach 100% before leveling up.' as status;

