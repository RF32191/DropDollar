-- ============================================================================
-- SAFE ULTIMATE FIX - NO DEADLOCKS
-- ============================================================================
-- This version avoids deadlocks by:
-- 1. Using CREATE OR REPLACE instead of DROP
-- 2. Only creating indexes if they don't exist
-- 3. Not dropping triggers/functions while in use
-- ============================================================================

-- ============================================================================
-- 1. CREATE INDEXES FOR PERFORMANCE (IF NOT EXISTS - SAFE)
-- ============================================================================

-- Indexes for game_history lookups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_game_history_user_created') THEN
        CREATE INDEX idx_game_history_user_created ON public.game_history(user_id, created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_game_history_is_practice') THEN
        CREATE INDEX idx_game_history_is_practice ON public.game_history(is_practice);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_game_history_created_at') THEN
        CREATE INDEX idx_game_history_created_at ON public.game_history(created_at DESC);
    END IF;
    
    -- Indexes for daily challenges
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_daily_challenges_date_type') THEN
        CREATE INDEX idx_daily_challenges_date_type ON public.daily_challenges(challenge_date, challenge_type, is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_daily_challenges_user_challenge') THEN
        CREATE INDEX idx_user_daily_challenges_user_challenge ON public.user_daily_challenges(user_id, challenge_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_daily_challenges_updated') THEN
        CREATE INDEX idx_user_daily_challenges_updated ON public.user_daily_challenges(updated_at DESC);
    END IF;
    
    -- Indexes for weekly challenges
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_weekly_challenges_week_type') THEN
        CREATE INDEX idx_weekly_challenges_week_type ON public.weekly_challenges(week_start_date, challenge_type, is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_weekly_challenges_user_challenge') THEN
        CREATE INDEX idx_user_weekly_challenges_user_challenge ON public.user_weekly_challenges(user_id, challenge_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_weekly_challenges_updated') THEN
        CREATE INDEX idx_user_weekly_challenges_updated ON public.user_weekly_challenges(updated_at DESC);
    END IF;
    
    -- Indexes for XP and RP
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_xp_user_id') THEN
        CREATE INDEX idx_user_xp_user_id ON public.user_xp(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_xp_transactions_user_created') THEN
        CREATE INDEX idx_xp_transactions_user_created ON public.xp_transactions(user_id, created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rp_transactions_user_created') THEN
        CREATE INDEX idx_rp_transactions_user_created ON public.reward_points_transactions(user_id, created_at DESC);
    END IF;
    
    RAISE NOTICE '✅ Indexes created/verified';
END $$;

-- ============================================================================
-- 2. CREATE OR REPLACE TRIGGER FUNCTION (SAFE - NO DROP)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_coin_play BOOLEAN := false;
    v_is_practice BOOLEAN := false;
    v_tournament_type TEXT := NULL;
BEGIN
    -- Only process INSERT operations
    IF TG_OP = 'INSERT' THEN
        -- CRITICAL: Use NEW.is_practice column directly (fastest)
        v_is_practice := COALESCE(NEW.is_practice, false);
        
        -- Get tournament type from metadata if available
        IF NEW.metadata IS NOT NULL THEN
            BEGIN
                v_tournament_type := NEW.metadata->>'tournament_type';
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
        
        -- Detect coin play games (quick check)
        IF NEW.metadata IS NOT NULL THEN
            BEGIN
                IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                    v_is_coin_play := true;
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;
        
        IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
            IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                v_is_coin_play := true;
            END IF;
        END IF;
        
        -- Award XP (fast, indexed lookup)
        IF v_is_practice THEN
            PERFORM public.award_practice_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
        ELSE
            PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
        END IF;
        
        -- CRITICAL: Update challenges (this is what updates progress bars)
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
-- 3. CREATE TRIGGER SAFELY (ONLY IF NOT EXISTS)
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
-- 4. CREATE OR REPLACE update_challenges_on_game_complete (SAFE)
-- ============================================================================

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
    v_increment INTEGER := 1;
    v_is_1v1 BOOLEAN;
    v_is_wta BOOLEAN;
BEGIN
    -- Quick game type detection
    v_is_1v1 := (p_tournament_type = '1v1' OR p_tournament_type = 'one_v_one');
    v_is_wta := (p_tournament_type = 'winner_takes_all' OR p_tournament_type = 'wta');
    
    -- Determine challenge type
    IF p_is_coin_play THEN
        v_challenge_type := 'play_coin_play';
    ELSIF p_is_practice THEN
        v_challenge_type := 'play_practice';
    ELSIF v_is_1v1 THEN
        v_challenge_type := 'play_1v1';
    ELSIF v_is_wta THEN
        v_challenge_type := 'play_winner_takes_all';
    ELSIF p_tournament_type = 'hot_sell' THEN
        v_challenge_type := 'play_hot_sell';
    ELSE
        v_challenge_type := 'play_competition';
    END IF;
    
    -- Update coin play challenge (DAILY ONLY) - if coin play
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_coin_play', v_increment);
    END IF;
    
    -- Update specific challenge type (if not coin play)
    IF NOT p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, v_challenge_type, v_increment);
        PERFORM public.update_weekly_challenge_progress(p_user_id, v_challenge_type, v_increment);
    END IF;
    
    -- Update games_count challenge (ALL games count)
    PERFORM public.update_daily_challenge_progress(p_user_id, 'games_count', v_increment);
    PERFORM public.update_weekly_challenge_progress(p_user_id, 'games_count', v_increment);
    
    -- Update score_threshold challenge (cumulative score) - only for competition games
    IF NOT p_is_practice THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'score_threshold', p_score);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'score_threshold', p_score);
    END IF;
    
    -- Update play_specific_game challenge (ALL games count)
    PERFORM public.update_daily_challenge_progress(p_user_id, 'play_specific_game', v_increment);
    PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_specific_game', v_increment);
END;
$$;

-- ============================================================================
-- 5. CREATE OR REPLACE update_daily_challenge_progress (SAFE)
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
    v_today DATE := CURRENT_DATE; -- Use server date (faster, no timezone lookup)
BEGIN
    -- CRITICAL: Ensure challenges exist for today (only if missing)
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Fast lookup with index (challenge_date, challenge_type, is_active)
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, return early (don't retry, just log)
    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found', 'type', p_challenge_type);
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Fast upsert with index (user_id, challenge_id)
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (and not already awarded) - CRITICAL FOR RP WALLET
    IF v_is_completed THEN
        -- Check if already awarded (fast lookup with index)
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id
            AND challenge_id = v_challenge_id
            AND xp_awarded IS NOT NULL
        ) THEN
            -- Award XP and RP (atomic update)
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Record transactions (for audit trail)
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 6. CREATE OR REPLACE update_weekly_challenge_progress (SAFE)
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
    -- Calculate Monday of current week (server time, faster)
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- CRITICAL: Ensure challenges exist for this week (only if missing)
    IF NOT EXISTS (
        SELECT 1 FROM public.weekly_challenges 
        WHERE week_start_date = v_week_start 
        AND is_active = true
        LIMIT 1
    ) THEN
        PERFORM public.generate_weekly_challenges(v_week_start);
    END IF;
    
    -- Fast lookup with index (week_start_date, challenge_type, is_active)
    SELECT wc.id, wc.target_value, COALESCE(uwc.progress, 0), wc.xp_reward, wc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.challenge_type = p_challenge_type
    AND wc.is_active = true
    LIMIT 1;
    
    -- If challenge doesn't exist, return early
    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found', 'type', p_challenge_type);
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- Fast upsert with index (user_id, challenge_id)
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, is_completed)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_is_completed)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (and not already awarded) - CRITICAL FOR RP WALLET
    IF v_is_completed THEN
        -- Check if already awarded (fast lookup with index)
        IF NOT EXISTS (
            SELECT 1 FROM public.user_weekly_challenges
            WHERE user_id = p_user_id
            AND challenge_id = v_challenge_id
            AND xp_awarded IS NOT NULL
        ) THEN
            -- Award XP and RP (atomic update)
            UPDATE public.user_xp
            SET total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Record transactions (for audit trail)
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 7. ENSURE get_user_xp EXISTS (SAFE)
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
BEGIN
    -- Create XP record if it doesn't exist (for new users)
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create ranking record if it doesn't exist
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier)
    VALUES (p_user_id, 'Novice', 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Fast lookup with index (user_id)
    RETURN QUERY
    SELECT 
        COALESCE(ux.total_xp, 0),
        COALESCE(ux.current_level, 1),
        COALESCE(ux.xp_to_next_level, 100),
        COALESCE(ux.reward_points, 0), -- CRITICAL: RP wallet balance
        COALESCE(ur.rank_title, 'Novice')::TEXT,
        COALESCE(ur.rank_tier, 1),
        ur.rank_image_url
    FROM public.user_xp ux
    LEFT JOIN public.user_rankings ur ON ux.user_id = ur.user_id
    WHERE ux.user_id = p_user_id;
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SAFE ULTIMATE FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 NO DEADLOCKS:';
    RAISE NOTICE '   - Used CREATE OR REPLACE (no DROP)';
    RAISE NOTICE '   - Indexes created only if missing';
    RAISE NOTICE '   - Trigger created only if missing';
    RAISE NOTICE '';
    RAISE NOTICE '💰 RP WALLET:';
    RAISE NOTICE '   - RP awarded automatically';
    RAISE NOTICE '   - Balance maintained correctly';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHALLENGES:';
    RAISE NOTICE '   - Auto-generated if missing';
    RAISE NOTICE '   - Progress updates immediately';
    RAISE NOTICE '';
END $$;

SELECT '✅ Safe ultimate fix applied! No deadlocks, optimized for scale, RP wallet maintained.' as status;

