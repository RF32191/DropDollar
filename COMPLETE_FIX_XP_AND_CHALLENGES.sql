-- ============================================================================
-- COMPLETE FIX FOR XP LEVELING AND CHALLENGE UPDATES
-- ============================================================================
-- Fixes XP calculation, level detection, and ensures challenges count by date
-- ============================================================================

-- ============================================================================
-- 1. ENSURE award_practice_game_xp AND award_competition_game_xp EXIST
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
        'Practice game completed'
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
        'Competition game completed'
    );
END;
$$;

-- ============================================================================
-- 2. FIX TRIGGER TO AWARD XP AND UPDATE CHALLENGES
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
    v_game_type TEXT;
    v_score INTEGER;
    v_xp_result JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get game details
        v_is_practice := COALESCE(NEW.is_practice, false);
        v_game_type := COALESCE(NEW.game_type, 'unknown');
        v_score := COALESCE(NEW.score, 0);
        
        -- Get tournament type and coin play from metadata
        IF NEW.metadata IS NOT NULL THEN
            BEGIN
                v_tournament_type := NEW.metadata->>'tournament_type';
                IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                    v_is_coin_play := true;
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
        
        -- Check listing_id for coin play pattern
        IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
            IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                v_is_coin_play := true;
            END IF;
        END IF;
        
        -- CRITICAL: Award XP first
        BEGIN
            IF v_is_practice THEN
                v_xp_result := public.award_practice_game_xp(NEW.user_id, NEW.id, v_score);
                RAISE NOTICE '[TRIGGER] ✅ Awarded 5 XP for practice game to user %', NEW.user_id;
            ELSE
                v_xp_result := public.award_competition_game_xp(NEW.user_id, NEW.id, v_score);
                RAISE NOTICE '[TRIGGER] ✅ Awarded 10 XP for competition game to user %', NEW.user_id;
            END IF;
            
            -- Log level up if it happened
            IF v_xp_result->>'leveled_up' = 'true' THEN
                RAISE NOTICE '[TRIGGER] 🎉 LEVEL UP! User % leveled up from % to %', 
                    NEW.user_id, 
                    v_xp_result->>'old_level', 
                    v_xp_result->>'new_level';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[TRIGGER] ❌ Error awarding XP: %', SQLERRM;
        END;
        
        -- CRITICAL: Update challenges
        BEGIN
            PERFORM public.update_challenges_on_game_complete(
                NEW.user_id,
                v_game_type,
                v_score,
                v_is_practice,
                v_is_coin_play,
                v_tournament_type
            );
            RAISE NOTICE '[TRIGGER] ✅ Updated challenges for user %', NEW.user_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[TRIGGER] ❌ Error updating challenges: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DO $$
BEGIN
    DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;
    CREATE TRIGGER trigger_update_challenges_on_game_history
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
    RAISE NOTICE '✅ Trigger recreated';
END $$;

-- ============================================================================
-- 3. FIX update_daily_challenge_progress TO COUNT BY DATE CORRECTLY
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
    v_today DATE := CURRENT_DATE; -- CRITICAL: Use server date
BEGIN
    -- CRITICAL: Ensure challenges exist for today
    PERFORM public.generate_daily_challenges();
    
    -- Find the challenge for TODAY
    SELECT dc.id, dc.target_value, dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    WHERE dc.challenge_date = v_today -- CRITICAL: Only today's challenges
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_DAILY] Challenge not found: type=%, date=%', p_challenge_type, v_today;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Get current progress for TODAY's challenge
    SELECT COALESCE(progress, 0) INTO v_current_progress
    FROM public.user_daily_challenges
    WHERE user_id = p_user_id 
    AND challenge_id = v_challenge_id;
    
    -- Create record if it doesn't exist
    IF v_current_progress IS NULL THEN
        INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed)
        VALUES (p_user_id, v_challenge_id, 0, v_target_value, false)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        SELECT COALESCE(progress, 0) INTO v_current_progress
        FROM public.user_daily_challenges
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        
        v_current_progress := COALESCE(v_current_progress, 0);
    END IF;
    
    -- Calculate new progress (for score_threshold, add the increment; for others, increment by 1)
    IF p_challenge_type = 'score_threshold' THEN
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Update progress
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (only once)
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
-- 4. FIX update_weekly_challenge_progress TO COUNT BY WEEK CORRECTLY
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
    -- CRITICAL: Calculate week start (Monday)
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- CRITICAL: Ensure challenges exist for this week
    PERFORM public.generate_weekly_challenges(v_week_start);
    
    -- Find the challenge for THIS WEEK
    SELECT wc.id, wc.target_value, wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    WHERE wc.week_start_date = v_week_start -- CRITICAL: Only this week's challenges
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_WEEKLY] Challenge not found: type=%, week=%', p_challenge_type, v_week_start;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
    END IF;
    
    -- Get current progress for THIS WEEK's challenge
    SELECT COALESCE(progress, 0) INTO v_current_progress
    FROM public.user_weekly_challenges
    WHERE user_id = p_user_id 
    AND challenge_id = v_challenge_id;
    
    -- Create record if it doesn't exist
    IF v_current_progress IS NULL THEN
        INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed)
        VALUES (p_user_id, v_challenge_id, 0, v_target_value, false)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        SELECT COALESCE(progress, 0) INTO v_current_progress
        FROM public.user_weekly_challenges
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
        
        v_current_progress := COALESCE(v_current_progress, 0);
    END IF;
    
    -- Calculate new progress (for score_threshold, add the increment; for others, increment by 1)
    IF p_challenge_type = 'score_threshold' THEN
        v_new_progress := v_current_progress + p_progress_increment;
    ELSE
        v_new_progress := v_current_progress + p_progress_increment;
    END IF;
    
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Update progress
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (only once)
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
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
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type);
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward');
            
            UPDATE public.user_weekly_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
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
    RAISE WARNING '[UPDATE_WEEKLY] ❌ Error: user=%, type=%, error=%', p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPLETE FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - XP functions created/updated';
    RAISE NOTICE '   - Trigger awards XP and logs level ups';
    RAISE NOTICE '   - Daily challenges count by CURRENT_DATE';
    RAISE NOTICE '   - Weekly challenges count by week start date';
    RAISE NOTICE '   - Score challenges accumulate scores correctly';
END $$;

SELECT '✅ Complete fix applied! XP will update and challenges will count by date correctly.' as status;

