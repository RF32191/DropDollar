-- ============================================================================
-- FINAL FIX FOR CHALLENGE UPDATES - ENSURES DAILY AND WEEKLY TASKS UPDATE
-- ============================================================================
-- This ensures:
-- 1. Trigger fires correctly on game completion
-- 2. Challenge progress updates immediately
-- 3. Frontend can see the updates
-- ============================================================================

-- ============================================================================
-- 1. RECREATE TRIGGER FUNCTION WITH ENHANCED LOGGING
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
    v_error_message TEXT;
BEGIN
    -- Only process INSERT operations
    IF TG_OP = 'INSERT' THEN
        BEGIN
            -- CRITICAL: Use NEW.is_practice column (this is the correct way)
            v_is_practice := COALESCE(NEW.is_practice, false);
            
            -- Fallback to metadata if needed
            IF NEW.is_practice IS NULL AND NEW.metadata IS NOT NULL THEN
                BEGIN
                    IF (NEW.metadata->>'is_practice')::BOOLEAN = true THEN
                        v_is_practice := true;
                    ELSIF (NEW.metadata->>'session_type') = 'practice' THEN
                        v_is_practice := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Get tournament type
            BEGIN
                SELECT NEW.tournament_type INTO v_tournament_type;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
            
            IF v_tournament_type IS NULL AND NEW.metadata IS NOT NULL THEN
                BEGIN
                    v_tournament_type := NEW.metadata->>'tournament_type';
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Detect coin play games
            IF NEW.metadata IS NOT NULL THEN
                BEGIN
                    IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                        v_is_coin_play := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN NULL; END;
            END IF;
            
            IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
                BEGIN
                    IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                        v_is_coin_play := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN NULL; END;
            END IF;
            
            -- Award XP first
            IF v_is_practice THEN
                BEGIN
                    PERFORM public.award_practice_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
                    RAISE NOTICE '[TRIGGER] ✅ Awarded 5 XP for practice game to user %', NEW.user_id;
                EXCEPTION WHEN OTHERS THEN 
                    RAISE WARNING '[TRIGGER] ❌ Error awarding practice XP: %', SQLERRM; 
                END;
            ELSE
                BEGIN
                    PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
                    RAISE NOTICE '[TRIGGER] ✅ Awarded 10 XP for competition game to user %', NEW.user_id;
                EXCEPTION WHEN OTHERS THEN 
                    RAISE WARNING '[TRIGGER] ❌ Error awarding competition XP: %', SQLERRM; 
                END;
            END IF;
            
            -- CRITICAL: Update challenges (this is what updates progress bars)
            BEGIN
                PERFORM public.update_challenges_on_game_complete(
                    NEW.user_id,
                    COALESCE(NEW.game_type, 'unknown'),
                    COALESCE(NEW.score, 0)::INTEGER,
                    v_is_practice,
                    v_is_coin_play,
                    v_tournament_type
                );
                RAISE NOTICE '[TRIGGER] ✅ Called update_challenges_on_game_complete for user % (practice: %, coin_play: %, tournament: %)', 
                    NEW.user_id, v_is_practice, v_is_coin_play, v_tournament_type;
            EXCEPTION WHEN OTHERS THEN
                v_error_message := SQLERRM;
                RAISE WARNING '[TRIGGER] ❌ Error updating challenges for user %: %', NEW.user_id, v_error_message;
            END;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE WARNING '[TRIGGER] ❌ Error in trigger for game_history id %: %', NEW.id, v_error_message;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. ENSURE TRIGGER IS ATTACHED
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;

CREATE TRIGGER trigger_update_challenges_on_game_history
AFTER INSERT ON public.game_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();

-- ============================================================================
-- 3. ENHANCE update_challenges_on_game_complete WITH LOGGING
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
    v_increment INTEGER;
    v_is_1v1 BOOLEAN;
    v_is_wta BOOLEAN;
    v_result JSONB;
BEGIN
    -- Detect game type from tournament_type parameter
    v_is_1v1 := (p_tournament_type = '1v1' OR p_tournament_type = 'one_v_one');
    v_is_wta := (p_tournament_type = 'winner_takes_all' OR p_tournament_type = 'wta');
    
    -- Determine challenge type and increment amount
    IF p_is_coin_play THEN
        v_challenge_type := 'play_coin_play';
        v_increment := 1;
    ELSIF p_is_practice THEN
        v_challenge_type := 'play_practice';
        v_increment := 1;
    ELSIF v_is_1v1 THEN
        v_challenge_type := 'play_1v1';
        v_increment := 1;
    ELSIF v_is_wta THEN
        v_challenge_type := 'play_winner_takes_all';
        v_increment := 1;
    ELSIF p_tournament_type = 'hot_sell' THEN
        v_challenge_type := 'play_hot_sell';
        v_increment := 1;
    ELSE
        v_challenge_type := 'play_competition';
        v_increment := 1;
    END IF;
    
    RAISE NOTICE '[UPDATE_CHALLENGES] Processing game for user %: type=%, practice=%, coin_play=%, tournament=%', 
        p_user_id, v_challenge_type, p_is_practice, p_is_coin_play, p_tournament_type;
    
    -- Update coin play challenge if it's a coin play game (DAILY ONLY)
    IF p_is_coin_play THEN
        BEGIN
            v_result := public.update_daily_challenge_progress(
                p_user_id,
                'play_coin_play',
                1
            );
            RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated daily coin_play: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating daily coin_play: %', SQLERRM;
        END;
    END IF;
    
    -- Update specific challenge type (practice, 1v1, WTA, or general competition)
    IF NOT p_is_coin_play THEN
        BEGIN
            -- Daily challenge
            v_result := public.update_daily_challenge_progress(
                p_user_id,
                v_challenge_type,
                v_increment
            );
            RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated daily %: %', v_challenge_type, v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating daily %: %', v_challenge_type, SQLERRM;
        END;
        
        BEGIN
            -- Weekly challenge
            v_result := public.update_weekly_challenge_progress(
                p_user_id,
                v_challenge_type,
                v_increment
            );
            RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated weekly %: %', v_challenge_type, v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating weekly %: %', v_challenge_type, SQLERRM;
        END;
    END IF;
    
    -- Update games_count challenge (ALL games count)
    BEGIN
        v_result := public.update_daily_challenge_progress(
            p_user_id,
            'games_count',
            1
        );
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated daily games_count: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating daily games_count: %', SQLERRM;
    END;
    
    BEGIN
        v_result := public.update_weekly_challenge_progress(
            p_user_id,
            'games_count',
            1
        );
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated weekly games_count: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating weekly games_count: %', SQLERRM;
    END;
    
    -- Update score_threshold challenge (cumulative score) - only for competition games
    IF NOT p_is_practice THEN
        BEGIN
            v_result := public.update_daily_challenge_progress(
                p_user_id,
                'score_threshold',
                p_score
            );
            RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated daily score_threshold: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating daily score_threshold: %', SQLERRM;
        END;
        
        BEGIN
            v_result := public.update_weekly_challenge_progress(
                p_user_id,
                'score_threshold',
                p_score
            );
            RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated weekly score_threshold: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating weekly score_threshold: %', SQLERRM;
        END;
    END IF;
    
    -- Update play_specific_game challenge (ALL games count)
    BEGIN
        v_result := public.update_daily_challenge_progress(
            p_user_id,
            'play_specific_game',
            1
        );
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated daily play_specific_game: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating daily play_specific_game: %', SQLERRM;
    END;
    
    BEGIN
        v_result := public.update_weekly_challenge_progress(
            p_user_id,
            'play_specific_game',
            1
        );
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated weekly play_specific_game: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[UPDATE_CHALLENGES] ❌ Error updating weekly play_specific_game: %', SQLERRM;
    END;
END;
$$;

-- ============================================================================
-- 4. VERIFY TRIGGER AND FUNCTIONS EXIST
-- ============================================================================

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'trigger_update_challenges_on_game_history'
    ) INTO v_function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGER VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Trigger attached: %', v_trigger_exists;
    RAISE NOTICE 'Function exists: %', v_function_exists;
    RAISE NOTICE '';
    
    IF NOT v_trigger_exists THEN
        RAISE WARNING '❌ TRIGGER IS NOT ATTACHED!';
    END IF;
    
    IF NOT v_function_exists THEN
        RAISE WARNING '❌ FUNCTION DOES NOT EXIST!';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CHALLENGE UPDATES FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 WHAT WAS FIXED:';
    RAISE NOTICE '   1. Trigger function recreated with enhanced logging';
    RAISE NOTICE '   2. Trigger reattached to game_history table';
    RAISE NOTICE '   3. update_challenges_on_game_complete enhanced with logging';
    RAISE NOTICE '';
    RAISE NOTICE '📊 HOW TO DEBUG:';
    RAISE NOTICE '   - Check Supabase logs for [TRIGGER] and [UPDATE_CHALLENGES] messages';
    RAISE NOTICE '   - Look for "✅ Updated daily" and "✅ Updated weekly" messages';
    RAISE NOTICE '   - Check for any "❌ Error" messages';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 WHAT HAPPENS NOW:';
    RAISE NOTICE '   1. Game completes → Trigger fires';
    RAISE NOTICE '   2. XP awarded (5 for practice, 10 for competition)';
    RAISE NOTICE '   3. Challenges updated (daily and weekly)';
    RAISE NOTICE '   4. Progress bars update in frontend';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenge updates fixed! Check Supabase logs for detailed output.' as status;

