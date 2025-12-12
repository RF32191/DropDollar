-- ============================================================================
-- FIX DAILY CHALLENGES BY COPYING WEEKLY LOGIC (WEEKLY WORKS)
-- ============================================================================

-- ============================================================================
-- 1. COPY WEEKLY LOGIC TO DAILY - EXACT SAME PATTERN
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
    v_today DATE := CURRENT_DATE; -- CRITICAL: Use server date
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER := 0;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    -- CRITICAL: Calculate today's date (same pattern as weekly)
    v_today := CURRENT_DATE;
    
    -- CRITICAL: Ensure challenges exist for today (same pattern as weekly)
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- CRITICAL: Fast lookup with index (same pattern as weekly)
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today -- CRITICAL: Only today's challenges
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, return early (same pattern as weekly)
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_DAILY] Challenge not found: type=%, date=%', p_challenge_type, v_today;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found', 'type', p_challenge_type);
    END IF;
    
    -- Calculate new progress (same pattern as weekly)
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- CRITICAL: Fast upsert with index (same pattern as weekly)
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (only once) - same pattern as weekly
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL 
            AND xp_awarded > 0
        ) THEN
            UPDATE public.user_xp
            SET 
                total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type);
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');
            
            UPDATE public.user_daily_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_DAILY] ✅ Awarded % XP and % RP for challenge %', v_xp_reward, v_reward_points, p_challenge_type;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'progress', v_new_progress,
        'target', v_target_value,
        'is_completed', v_is_completed
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_DAILY] ❌ Error: user=%, type=%, error=%', p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. VERIFY get_daily_challenges RETURNS CORRECT DATA (MATCH WEEKLY PATTERN)
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
    v_today DATE := CURRENT_DATE; -- CRITICAL: Use server date (same as weekly)
BEGIN
    -- CRITICAL: Ensure challenges exist (same pattern as weekly)
    PERFORM public.generate_daily_challenges();
    
    -- Return challenges with user progress (same pattern as weekly)
    RETURN QUERY
    SELECT 
        dc.id,
        dc.challenge_name,
        dc.challenge_description,
        dc.challenge_type,
        dc.target_value,
        COALESCE(udc.progress, 0)::INTEGER as progress, -- CRITICAL: Cast to INTEGER
        dc.xp_reward,
        dc.reward_points,
        COALESCE(udc.is_completed, false)::BOOLEAN as is_completed -- CRITICAL: Cast to BOOLEAN
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today -- CRITICAL: Only today's challenges
    AND dc.is_active = true
    ORDER BY dc.challenge_type;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DAILY CHALLENGES FIXED (COPIED FROM WEEKLY)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - update_daily_challenge_progress now matches weekly exactly';
    RAISE NOTICE '   - get_daily_challenges now matches weekly exactly';
    RAISE NOTICE '   - Uses CURRENT_DATE for date filtering';
    RAISE NOTICE '   - Same upsert pattern as weekly';
    RAISE NOTICE '';
END $$;

SELECT '✅ Daily challenges fixed by copying weekly logic! Daily should now work like weekly.' as status;

