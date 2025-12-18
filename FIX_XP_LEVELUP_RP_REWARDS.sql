-- ============================================================================
-- FIX XP LEVELING WITH PROGRESSIVE RP REWARDS ON LEVEL UP
-- ============================================================================
-- Each level up gives RP rewards that increase progressively up to level 100
-- Level 2: 10 RP, Level 10: 25 RP, Level 50: 75 RP, Level 100: 150 RP
-- Formula: RP = 10 + (level - 2) * 1.4 (capped at 150 RP)
-- ============================================================================

-- ============================================================================
-- 1. UPDATED award_xp WITH RP REWARDS ON LEVEL UP
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
    v_current_rp INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_xp_for_current_level INTEGER;
    v_xp_for_next_level INTEGER;
    v_cumulative_xp INTEGER := 0;
    v_temp_level INTEGER;
    v_leveled_up BOOLEAN := false;
    v_cumulative_for_new_level INTEGER := 0;
    v_temp INTEGER;
    v_rp_reward INTEGER := 0;
    v_total_rp_earned INTEGER := 0;
    v_old_level INTEGER;
BEGIN
    -- Ensure user_xp record exists
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current XP, level, and RP
    SELECT ux.total_xp, ux.current_level, COALESCE(ux.reward_points, 0)
    INTO v_current_xp, v_current_level, v_current_rp
    FROM public.user_xp ux
    WHERE ux.user_id = p_user_id;
    
    v_old_level := v_current_level;
    
    -- Calculate new total XP
    v_new_xp := v_current_xp + p_xp_amount;
    
    -- CRITICAL: Calculate what level the user should be at with v_new_xp
    -- Start from level 1 and work up
    v_new_level := 1;
    v_cumulative_xp := 0;
    
    -- Calculate cumulative XP needed for each level until we exceed v_new_xp
    WHILE v_cumulative_xp <= v_new_xp AND v_new_level <= 100 LOOP
        v_xp_for_current_level := FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER;
        v_cumulative_xp := v_cumulative_xp + v_xp_for_current_level;
        
        -- If we haven't exceeded the XP yet, we can be at this level
        IF v_cumulative_xp <= v_new_xp THEN
            v_new_level := v_new_level + 1;
        ELSE
            -- We've found the level - break
            EXIT;
        END IF;
    END LOOP;
    
    -- Cap at level 100
    v_new_level := LEAST(v_new_level, 100);
    
    -- Check if we leveled up and calculate RP rewards
    IF v_new_level > v_old_level THEN
        v_leveled_up := true;
        
        -- Calculate RP reward for EACH level gained
        -- Formula: RP = 10 + (level - 2) * 1.4, capped between 10 and 150
        FOR v_temp_level IN (v_old_level + 1)..v_new_level LOOP
            -- Progressive RP: starts at 10 RP for level 2, scales up to 150 RP at level 100
            v_rp_reward := LEAST(150, GREATEST(10, 10 + FLOOR((v_temp_level - 2) * 1.4)::INTEGER));
            v_total_rp_earned := v_total_rp_earned + v_rp_reward;
            
            RAISE NOTICE '[XP] 🎉 Level % reached! Awarding % RP to user %', v_temp_level, v_rp_reward, p_user_id;
        END LOOP;
    END IF;
    
    -- Calculate cumulative XP for all levels up to (but not including) new_level
    v_cumulative_for_new_level := 0;
    v_temp := 1;
    WHILE v_temp < v_new_level LOOP
        v_cumulative_for_new_level := v_cumulative_for_new_level + FLOOR(100 * POWER(v_temp, 1.5))::INTEGER;
        v_temp := v_temp + 1;
    END LOOP;
    
    -- Calculate XP for current level
    v_xp_for_current_level := FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER;
    
    -- Calculate XP earned in current level
    DECLARE
        v_xp_earned_in_level INTEGER;
        v_new_rp INTEGER;
    BEGIN
        v_xp_earned_in_level := v_new_xp - v_cumulative_for_new_level;
        
        -- Calculate XP to next level (remaining XP needed)
        v_xp_for_next_level := v_xp_for_current_level - v_xp_earned_in_level;
        
        -- Ensure it's not negative
        IF v_xp_for_next_level < 0 THEN
            v_xp_for_next_level := 0;
        END IF;
        
        -- Calculate new total RP (current + earned from leveling)
        v_new_rp := v_current_rp + v_total_rp_earned;
        
        -- Update user_xp with new XP, level, and RP
        UPDATE public.user_xp
        SET 
            total_xp = v_new_xp,
            current_level = v_new_level,
            xp_to_next_level = GREATEST(0, v_xp_for_next_level),
            reward_points = v_new_rp,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Log RP transaction if we leveled up
        IF v_total_rp_earned > 0 THEN
            INSERT INTO public.rp_transactions (user_id, amount, transaction_type, description)
            VALUES (p_user_id, v_total_rp_earned, 'level_up', 
                    'Level up reward: Level ' || v_old_level || ' → ' || v_new_level)
            ON CONFLICT DO NOTHING;
        END IF;
    END;
    
    -- Log XP transaction
    INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
    VALUES (p_user_id, p_xp_amount, p_transaction_type, p_source_id, p_description)
    ON CONFLICT DO NOTHING;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_xp', v_new_xp,
        'current_level', v_new_level,
        'old_level', v_old_level,
        'leveled_up', v_leveled_up,
        'rp_earned', v_total_rp_earned,
        'xp_to_next_level', GREATEST(0, v_xp_for_next_level)
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[XP] ❌ Error in award_xp: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. ENSURE rp_transactions TABLE EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'level_up',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rp_transactions_user ON public.rp_transactions(user_id, created_at DESC);

-- ============================================================================
-- 3. UPDATED get_user_xp TO INCLUDE RP AND RECALCULATE LEVELS
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
    v_calculated_level INTEGER;
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
    SELECT ux.total_xp, ux.current_level, COALESCE(ux.reward_points, 0)
    INTO v_total_xp, v_current_level, v_reward_points
    FROM public.user_xp ux
    WHERE ux.user_id = p_user_id;
    
    -- CRITICAL: Recalculate level from total_xp (don't trust stored level)
    v_calculated_level := 1;
    v_cumulative_xp := 0;
    
    -- Calculate what level the user should actually be at
    WHILE v_cumulative_xp <= v_total_xp AND v_calculated_level <= 100 LOOP
        v_xp_for_current_level := FLOOR(100 * POWER(v_calculated_level, 1.5))::INTEGER;
        v_cumulative_xp := v_cumulative_xp + v_xp_for_current_level;
        
        IF v_cumulative_xp <= v_total_xp THEN
            v_calculated_level := v_calculated_level + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;
    
    v_calculated_level := LEAST(v_calculated_level, 100);
    
    -- Update stored level if it's wrong
    IF v_calculated_level != v_current_level THEN
        UPDATE public.user_xp
        SET current_level = v_calculated_level
        WHERE user_id = p_user_id;
        v_current_level := v_calculated_level;
    END IF;
    
    -- Calculate cumulative XP for all previous levels
    v_cumulative_xp := 0;
    v_temp_level := 1;
    WHILE v_temp_level < v_current_level LOOP
        v_cumulative_xp := v_cumulative_xp + FLOOR(100 * POWER(v_temp_level, 1.5))::INTEGER;
        v_temp_level := v_temp_level + 1;
    END LOOP;
    
    -- Calculate XP earned in current level
    v_xp_earned_in_level := v_total_xp - v_cumulative_xp;
    
    -- Calculate XP for current level
    v_xp_for_current_level := FLOOR(100 * POWER(v_current_level, 1.5))::INTEGER;
    
    -- Calculate XP to next level (remaining XP needed in this level)
    v_xp_to_next := v_xp_for_current_level - v_xp_earned_in_level;
    
    IF v_xp_to_next < 0 THEN
        v_xp_to_next := 0;
    END IF;
    
    -- Get rank info
    SELECT ur.rank_title, ur.rank_tier, ur.rank_image_url
    INTO v_rank_title, v_rank_tier, v_rank_image_url
    FROM public.user_rankings ur
    WHERE ur.user_id = p_user_id;
    
    -- Default rank if not found
    IF v_rank_title IS NULL THEN
        v_rank_title := 'Novice';
        v_rank_tier := 1;
    END IF;
    
    RETURN QUERY SELECT 
        v_total_xp,
        v_current_level,
        v_xp_to_next,
        v_reward_points,
        v_rank_title,
        v_rank_tier,
        v_rank_image_url;
END;
$$;

-- ============================================================================
-- 4. ENSURE award_practice_game_xp AND award_competition_game_xp CALL UPDATED award_xp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_practice_game_xp(
    p_user_id UUID,
    p_game_history_id UUID,
    p_score INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.award_xp(
        p_user_id,
        5, -- 5 XP for practice games
        'practice_game',
        p_game_history_id,
        'Practice game completed (Score: ' || p_score || ')'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.award_competition_game_xp(
    p_user_id UUID,
    p_game_history_id UUID,
    p_score INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.award_xp(
        p_user_id,
        10, -- 10 XP for competition games
        'competition_game',
        p_game_history_id,
        'Competition game completed (Score: ' || p_score || ')'
    );
END;
$$;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_practice_game_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_competition_game_xp TO authenticated;

GRANT SELECT, INSERT ON public.rp_transactions TO authenticated;
GRANT SELECT, INSERT ON public.xp_transactions TO authenticated;

-- ============================================================================
-- LEVEL UP RP REWARDS SUMMARY:
-- ============================================================================
-- Level 2:  10 RP
-- Level 10: 21 RP
-- Level 20: 35 RP
-- Level 30: 49 RP
-- Level 40: 63 RP
-- Level 50: 77 RP
-- Level 60: 91 RP
-- Level 70: 105 RP
-- Level 80: 119 RP
-- Level 90: 133 RP
-- Level 100: 147 RP (capped at 150)
-- 
-- Total RP earned from Level 1 to 100: ~7,800 RP
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ XP and RP Level Up Rewards system updated!';
    RAISE NOTICE '📊 Level up now awards progressive RP (10-150 RP per level)';
    RAISE NOTICE '🎮 Max level is 100';
END $$;

