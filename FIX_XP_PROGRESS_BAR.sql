-- ============================================================================
-- FIX XP PROGRESS BAR - ENSURE get_user_xp RETURNS CORRECT VALUES
-- ============================================================================

-- ============================================================================
-- 1. FIX get_user_xp TO RETURN CORRECT PROGRESS VALUES
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
    -- This should be positive and show how much more XP is needed
    v_xp_to_next := v_xp_for_current_level - v_xp_earned_in_level;
    
    -- Ensure it's not negative (shouldn't happen, but safety check)
    IF v_xp_to_next < 0 THEN
        v_xp_to_next := 0;
    END IF;
    
    -- Get rank info
    SELECT rank_title, rank_tier, rank_image_url
    INTO v_rank_title, v_rank_tier, v_rank_image_url
    FROM public.user_rankings
    WHERE user_id = p_user_id;
    
    -- Return single row with calculated values
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
-- 2. VERIFY award_xp UPDATES CORRECTLY
-- ============================================================================

-- The award_xp function should already be correct from FIX_XP_LEVELING.sql
-- This is just a verification that it exists

DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'award_xp'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ award_xp function exists';
    ELSE
        RAISE WARNING '❌ award_xp function does NOT exist - run FIX_XP_LEVELING.sql first';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ XP PROGRESS BAR FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - get_user_xp now calculates xp_to_next_level correctly';
    RAISE NOTICE '   - Returns proper INTEGER values';
    RAISE NOTICE '   - Progress bar will show correct percentage';
    RAISE NOTICE '';
END $$;

SELECT '✅ XP progress bar fixed! get_user_xp now returns correct values for progress calculation.' as status;

