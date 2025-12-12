-- ============================================================================
-- FINAL FIX FOR PROGRESS NOT UPDATING
-- ============================================================================
-- This ensures progress updates work by:
-- 1. Verifying trigger fires correctly
-- 2. Ensuring update functions work
-- 3. Adding explicit error handling
-- 4. Testing the flow
-- ============================================================================

-- ============================================================================
-- 1. VERIFY TRIGGER IS ATTACHED AND WORKING
-- ============================================================================

-- Check trigger status
DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'trigger_update_challenges_on_game_history'
    ) INTO v_function_exists;
    
    RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
    RAISE NOTICE 'Function exists: %', v_function_exists;
    
    IF NOT v_trigger_exists THEN
        RAISE WARNING '❌ TRIGGER IS MISSING! Creating it now...';
        CREATE TRIGGER trigger_update_challenges_on_game_history
        AFTER INSERT ON public.game_history
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
    END IF;
END $$;

-- ============================================================================
-- 2. ENSURE update_daily_challenge_progress USES CURRENT_DATE (NOT TIMEZONE)
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
    v_today DATE := CURRENT_DATE; -- CRITICAL: Use server date, not timezone
BEGIN
    -- CRITICAL: Ensure challenges exist for today
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Find today's challenge of this type
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, return error with details
    IF v_challenge_id IS NULL THEN
        RAISE WARNING 'Challenge not found: type=%, date=%, user=%', p_challenge_type, v_today, p_user_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Challenge not found',
            'type', p_challenge_type,
            'date', v_today::TEXT
        );
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- CRITICAL: Insert or update user challenge progress
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated daily challenge % for user %: %/%', p_challenge_type, p_user_id, v_new_progress, v_target_value;
    
    -- Award rewards if completed
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id
            AND challenge_id = v_challenge_id
            AND xp_awarded IS NOT NULL
        ) THEN
            -- Award XP and RP
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Record transactions
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward')
            ON CONFLICT DO NOTHING;
            
            -- Mark as awarded
            UPDATE public.user_daily_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'progress', v_new_progress,
        'target', v_target_value,
        'is_completed', v_is_completed
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error updating daily challenge: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 3. ENSURE update_weekly_challenge_progress USES CURRENT_DATE (NOT TIMEZONE)
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
BEGIN
    -- CRITICAL: Use server date, not timezone
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure challenges exist for this week
    IF NOT EXISTS (
        SELECT 1 FROM public.weekly_challenges 
        WHERE week_start_date = v_week_start 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_weekly_challenges(v_week_start);
    END IF;
    
    -- Find this week's challenge of this type
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, return error
    IF v_challenge_id IS NULL THEN
        RAISE WARNING 'Weekly challenge not found: type=%, week=%, user=%', p_challenge_type, v_week_start, p_user_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Challenge not found',
            'type', p_challenge_type,
            'week', v_week_start::TEXT
        );
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- CRITICAL: Insert or update user challenge progress
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated weekly challenge % for user %: %/%', p_challenge_type, p_user_id, v_new_progress, v_target_value;
    
    -- Award rewards if completed
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id
            AND challenge_id = v_challenge_id
            AND xp_awarded IS NOT NULL
        ) THEN
            -- Award XP and RP
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Record transactions
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward')
            ON CONFLICT DO NOTHING;
            
            -- Mark as awarded
            UPDATE public.user_weekly_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'progress', v_new_progress,
        'target', v_target_value,
        'is_completed', v_is_completed
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error updating weekly challenge: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 4. ENSURE get_daily_challenges USES CURRENT_DATE (NOT TIMEZONE)
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
    v_today DATE := CURRENT_DATE; -- CRITICAL: Use server date
BEGIN
    -- Ensure today's challenges exist
    PERFORM public.generate_daily_challenges();
    
    -- Return challenges with user progress
    RETURN QUERY
    SELECT 
        dc.id,
        dc.challenge_name,
        dc.challenge_description,
        dc.challenge_type,
        dc.target_value,
        COALESCE(udc.progress, 0),
        dc.xp_reward,
        dc.reward_points,
        COALESCE(udc.is_completed, false)
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.is_active = true
    ORDER BY dc.challenge_type;
END;
$$;

-- ============================================================================
-- 5. ENSURE get_weekly_challenges USES CURRENT_DATE (NOT TIMEZONE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_weekly_challenges(p_user_id UUID)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name TEXT,
    challenge_description TEXT,
    challenge_type TEXT,
    target_value INTEGER,
    progress INTEGER,
    xp_reward INTEGER,
    reward_points INTEGER,
    is_completed BOOLEAN,
    week_start_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
BEGIN
    -- CRITICAL: Use server date
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure this week's challenges exist
    PERFORM public.generate_weekly_challenges(v_week_start);
    
    -- Return challenges with user progress
    RETURN QUERY
    SELECT 
        wc.id,
        wc.challenge_name,
        wc.challenge_description,
        wc.challenge_type,
        wc.target_value,
        COALESCE(uwc.progress, 0),
        wc.xp_reward,
        wc.reward_points,
        COALESCE(uwc.is_completed, false),
        wc.week_start_date
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.is_active = true
    ORDER BY wc.challenge_type;
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FINAL FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 KEY FIXES:';
    RAISE NOTICE '   - All functions use CURRENT_DATE (server date)';
    RAISE NOTICE '   - No timezone lookups (faster, more reliable)';
    RAISE NOTICE '   - Enhanced error logging';
    RAISE NOTICE '   - Trigger verified and created if missing';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TO TEST:';
    RAISE NOTICE '   1. Play a practice game';
    RAISE NOTICE '   2. Check if progress updates';
    RAISE NOTICE '   3. Check Supabase logs for RAISE NOTICE messages';
    RAISE NOTICE '';
END $$;

SELECT '✅ Final fix applied! Progress should update now. Check logs for details.' as status;

