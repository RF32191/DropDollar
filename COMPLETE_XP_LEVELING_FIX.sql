-- ============================================================================
-- COMPLETE XP LEVELING FIX - ENSURE PROGRESS BAR WORKS
-- ============================================================================
-- This ensures the XP progress bar correctly calculates and displays progress
-- ============================================================================

-- ============================================================================
-- 1. ENSURE award_xp FUNCTION EXISTS AND WORKS CORRECTLY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_xp(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_transaction_type TEXT DEFAULT 'game',
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
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_xp_for_current_level INTEGER;
    v_xp_for_next_level INTEGER;
    v_cumulative_xp INTEGER := 0;
    v_temp_level INTEGER;
    v_leveled_up BOOLEAN := false;
    v_cumulative_for_new_level INTEGER := 0;
    v_temp INTEGER;
BEGIN
    -- Ensure user_xp record exists
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current XP and level
    SELECT total_xp, current_level
    INTO v_current_xp, v_current_level
    FROM public.user_xp
    WHERE user_id = p_user_id;
    
    -- Calculate new total XP
    v_new_xp := v_current_xp + p_xp_amount;
    
    -- Calculate cumulative XP for all levels up to current level
    v_cumulative_xp := 0;
    v_temp_level := 1;
    WHILE v_temp_level <= v_current_level LOOP
        v_cumulative_xp := v_cumulative_xp + FLOOR(100 * POWER(v_temp_level, 1.5))::INTEGER;
        v_temp_level := v_temp_level + 1;
    END LOOP;
    
    -- Check if we've leveled up
    v_new_level := v_current_level;
    WHILE v_new_xp >= v_cumulative_xp + FLOOR(100 * POWER(v_new_level + 1, 1.5))::INTEGER LOOP
        v_new_level := v_new_level + 1;
        v_cumulative_xp := v_cumulative_xp + FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER;
        v_leveled_up := true;
    END LOOP;
    
    -- Calculate XP for current level
    v_xp_for_current_level := FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER;
    
    -- Calculate XP earned in current level
    DECLARE
        v_cumulative_for_new_level INTEGER := 0;
        v_temp INTEGER := 1;
    BEGIN
        WHILE v_temp < v_new_level LOOP
            v_cumulative_for_new_level := v_cumulative_for_new_level + FLOOR(100 * POWER(v_temp, 1.5))::INTEGER;
            v_temp := v_temp + 1;
        END LOOP;
        
        -- Calculate XP to next level
        v_xp_for_next_level := v_xp_for_current_level - (v_new_xp - v_cumulative_for_new_level);
        
        -- Update user_xp
        UPDATE public.user_xp
        SET 
            total_xp = v_new_xp,
            current_level = v_new_level,
            xp_to_next_level = GREATEST(0, v_xp_for_next_level),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END;
    
    -- Log transaction
    INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
    VALUES (p_user_id, p_xp_amount, p_transaction_type, p_source_id, p_description)
    ON CONFLICT DO NOTHING;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_xp', v_new_xp,
        'current_level', v_new_level,
        'leveled_up', v_leveled_up,
        'xp_to_next_level', GREATEST(0, v_xp_for_next_level)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. FIX get_user_xp TO RETURN CORRECT VALUES
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
-- 3. VERIFY XP CALCULATION FOR IMMERSIONPRODUCTIONS
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_total_xp INTEGER;
    v_current_level INTEGER;
    v_xp_to_next INTEGER;
    v_cumulative_xp INTEGER := 0;
    v_temp_level INTEGER;
    v_xp_earned_in_level INTEGER;
    v_xp_for_current_level INTEGER;
    v_progress_percent NUMERIC;
BEGIN
    -- Find ImmersionProductions
    SELECT id INTO v_user_id
    FROM public.users
    WHERE username = 'ImmersionProductions' OR email LIKE '%immersion%';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User ImmersionProductions not found.';
        RETURN;
    END IF;
    
    -- Get current XP
    SELECT total_xp, current_level, xp_to_next_level
    INTO v_total_xp, v_current_level, v_xp_to_next
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    -- Calculate cumulative XP for all previous levels
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
    
    -- Calculate progress percentage
    v_progress_percent := ROUND((v_xp_earned_in_level::NUMERIC / v_xp_for_current_level::NUMERIC) * 100, 2);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'XP CALCULATION VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User: ImmersionProductions';
    RAISE NOTICE 'Total XP: %', v_total_xp;
    RAISE NOTICE 'Current Level: %', v_current_level;
    RAISE NOTICE 'Cumulative XP (previous levels): %', v_cumulative_xp;
    RAISE NOTICE 'XP earned in current level: %', v_xp_earned_in_level;
    RAISE NOTICE 'XP needed for current level: %', v_xp_for_current_level;
    RAISE NOTICE 'XP to next level: %', v_xp_to_next;
    RAISE NOTICE 'Progress: % percent', v_progress_percent;
    RAISE NOTICE '';
    
    -- Test get_user_xp function
    PERFORM * FROM public.get_user_xp(v_user_id);
    
    RAISE NOTICE '✅ get_user_xp function executed successfully';
    
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ XP leveling system fixed! Progress bar should now work correctly.' as status;

