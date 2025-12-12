-- ============================================================================
-- SAFE ABSOLUTE FINAL FIX - NO DEADLOCKS
-- ============================================================================
-- This version avoids deadlocks by not using DROP statements
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE OR REPLACE TRIGGER FUNCTION (NO DROP)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_practice BOOLEAN;
    v_is_coin_play BOOLEAN := false;
    v_tournament_type TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get is_practice (CRITICAL)
        v_is_practice := COALESCE(NEW.is_practice, false);
        
        -- Get tournament type
        IF NEW.metadata IS NOT NULL THEN
            v_tournament_type := NEW.metadata->>'tournament_type';
        END IF;
        
        -- Detect coin play
        IF NEW.metadata IS NOT NULL AND (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
            v_is_coin_play := true;
        ELSIF NEW.listing_id IS NOT NULL AND NEW.listing_id::TEXT LIKE 'cp-%' THEN
            v_is_coin_play := true;
        END IF;
        
        -- Award XP
        IF v_is_practice THEN
            PERFORM public.award_practice_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
        ELSE
            PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
        END IF;
        
        -- CRITICAL: Update challenges
        PERFORM public.update_challenges_on_game_complete(
            NEW.user_id,
            COALESCE(NEW.game_type, 'unknown'),
            COALESCE(NEW.score, 0)::INTEGER,
            v_is_practice,
            v_is_coin_play,
            v_tournament_type
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 2: CREATE TRIGGER ONLY IF NOT EXISTS (NO DROP)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) THEN
        CREATE TRIGGER trigger_update_challenges_on_game_history
        AFTER INSERT ON public.game_history
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
        
        RAISE NOTICE '✅ Trigger created';
    ELSE
        RAISE NOTICE '✅ Trigger already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE OR REPLACE ALL UPDATE FUNCTIONS (NO DROP)
-- ============================================================================

-- update_challenges_on_game_complete
CREATE OR REPLACE FUNCTION public.update_challenges_on_game_complete(
    p_user_id UUID,
    p_game_type TEXT,
    p_score INTEGER,
    p_is_practice BOOLEAN,
    p_is_coin_play BOOLEAN DEFAULT false,
    p_tournament_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_type TEXT;
BEGIN
    -- Determine challenge type
    IF p_is_coin_play THEN
        v_challenge_type := 'play_coin_play';
    ELSIF p_is_practice THEN
        v_challenge_type := 'play_practice';
    ELSIF p_tournament_type = '1v1' OR p_tournament_type = 'one_v_one' THEN
        v_challenge_type := 'play_1v1';
    ELSIF p_tournament_type = 'winner_takes_all' OR p_tournament_type = 'wta' THEN
        v_challenge_type := 'play_winner_takes_all';
    ELSIF p_tournament_type = 'hot_sell' THEN
        v_challenge_type := 'play_hot_sell';
    ELSE
        v_challenge_type := 'play_competition';
    END IF;
    
    -- Update challenges
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_coin_play', 1);
    END IF;
    
    IF NOT p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, v_challenge_type, 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, v_challenge_type, 1);
    END IF;
    
    PERFORM public.update_daily_challenge_progress(p_user_id, 'games_count', 1);
    PERFORM public.update_weekly_challenge_progress(p_user_id, 'games_count', 1);
    
    IF NOT p_is_practice THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'score_threshold', p_score);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'score_threshold', p_score);
    END IF;
    
    PERFORM public.update_daily_challenge_progress(p_user_id, 'play_specific_game', 1);
    PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_specific_game', 1);
END;
$$;

-- update_daily_challenge_progress
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
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Ensure challenges exist
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today AND is_active = true LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Find challenge
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Calculate progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Save progress
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id AND xp_awarded IS NOT NULL
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
    
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- update_weekly_challenge_progress
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
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure challenges exist
    IF NOT EXISTS (
        SELECT 1 FROM public.weekly_challenges 
        WHERE week_start_date = v_week_start AND is_active = true LIMIT 1
    ) THEN
        PERFORM public.generate_weekly_challenges(v_week_start);
    END IF;
    
    -- Find challenge
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
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
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id AND xp_awarded IS NOT NULL
        ) THEN
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward')
            ON CONFLICT DO NOTHING;
            
            UPDATE public.user_weekly_challenges
            SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'progress', v_new_progress, 'target', v_target_value);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- STEP 4: VERIFY TRIGGER EXISTS
-- ============================================================================

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    IF v_trigger_exists THEN
        RAISE NOTICE '✅ Trigger is attached to game_history table';
    ELSE
        RAISE WARNING '❌ Trigger is NOT attached!';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SAFE ABSOLUTE FINAL FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 NO DEADLOCKS:';
    RAISE NOTICE '   - Used CREATE OR REPLACE (no DROP)';
    RAISE NOTICE '   - Trigger created only if missing';
    RAISE NOTICE '   - All functions updated safely';
    RAISE NOTICE '';
    RAISE NOTICE '📊 WHAT HAPPENS NOW:';
    RAISE NOTICE '   1. Trigger fires on game insert';
    RAISE NOTICE '   2. Challenges update automatically';
    RAISE NOTICE '   3. Frontend fallback also updates';
    RAISE NOTICE '   4. Progress should update immediately';
    RAISE NOTICE '';
END $$;

SELECT '✅ Safe absolute final fix applied! No deadlocks, trigger ready, functions updated.' as status;

