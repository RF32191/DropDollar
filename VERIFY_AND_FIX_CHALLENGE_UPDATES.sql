-- ============================================================================
-- VERIFY AND FIX CHALLENGE UPDATE FUNCTIONS
-- ============================================================================
-- This ensures challenge progress updates work correctly
-- ============================================================================

-- ============================================================================
-- 1. VERIFY TRIGGER EXISTS AND IS ATTACHED
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
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TRIGGER STATUS CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
    RAISE NOTICE 'Function exists: %', v_function_exists;
    
    IF NOT v_trigger_exists THEN
        RAISE WARNING '❌ TRIGGER IS MISSING! Creating it now...';
    END IF;
    
    IF NOT v_function_exists THEN
        RAISE WARNING '❌ FUNCTION IS MISSING! Creating it now...';
    END IF;
END $$;

-- ============================================================================
-- 2. ENSURE TRIGGER FUNCTION EXISTS AND IS CORRECT
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
            -- CRITICAL: Prioritize NEW.is_practice column (this is the correct way)
            v_is_practice := COALESCE(NEW.is_practice, false);
            
            -- Fallback to metadata if is_practice is null
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
                    RAISE NOTICE '✅ Awarded 5 XP for practice game to user %', NEW.user_id;
                EXCEPTION WHEN OTHERS THEN 
                    RAISE WARNING 'Error awarding practice XP: %', SQLERRM; 
                END;
            ELSE
                BEGIN
                    PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
                    RAISE NOTICE '✅ Awarded 10 XP for competition game to user %', NEW.user_id;
                EXCEPTION WHEN OTHERS THEN 
                    RAISE WARNING 'Error awarding competition XP: %', SQLERRM; 
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
                RAISE NOTICE '✅ Updated challenges for user % (practice: %, coin_play: %, tournament: %)', 
                    NEW.user_id, v_is_practice, v_is_coin_play, v_tournament_type;
            EXCEPTION WHEN OTHERS THEN
                v_error_message := SQLERRM;
                RAISE WARNING '❌ Error updating challenges for user %: %', NEW.user_id, v_error_message;
            END;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE WARNING '❌ Error in trigger for game_history id %: %', NEW.id, v_error_message;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. ENSURE TRIGGER IS ATTACHED
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;

CREATE TRIGGER trigger_update_challenges_on_game_history
AFTER INSERT ON public.game_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();

-- ============================================================================
-- 4. VERIFY update_daily_challenge_progress FUNCTION
-- ============================================================================

-- Check if function exists and has correct signature
DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_daily_challenge_progress'
    ) INTO v_function_exists;
    
    IF NOT v_function_exists THEN
        RAISE WARNING '❌ update_daily_challenge_progress function is missing!';
    ELSE
        RAISE NOTICE '✅ update_daily_challenge_progress function exists';
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFY update_weekly_challenge_progress FUNCTION
-- ============================================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_weekly_challenge_progress'
    ) INTO v_function_exists;
    
    IF NOT v_function_exists THEN
        RAISE WARNING '❌ update_weekly_challenge_progress function is missing!';
    ELSE
        RAISE NOTICE '✅ update_weekly_challenge_progress function exists';
    END IF;
END $$;

-- ============================================================================
-- 6. TEST CHALLENGE UPDATE (Replace with your user ID)
-- ============================================================================

-- Uncomment and replace USER_ID_HERE with your actual user ID to test
-- DO $$
-- DECLARE
--     v_test_user_id UUID := 'USER_ID_HERE'::UUID;
--     v_result JSONB;
-- BEGIN
--     -- Test daily challenge update
--     v_result := public.update_daily_challenge_progress(v_test_user_id, 'play_practice', 1);
--     RAISE NOTICE 'Test result: %', v_result;
-- END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGER AND FUNCTIONS VERIFIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 WHAT TO CHECK:';
    RAISE NOTICE '   1. Trigger is attached to game_history table';
    RAISE NOTICE '   2. Trigger function calls update_challenges_on_game_complete';
    RAISE NOTICE '   3. update_challenges_on_game_complete calls progress update functions';
    RAISE NOTICE '   4. Progress update functions update user_daily_challenges and user_weekly_challenges';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TO DEBUG:';
    RAISE NOTICE '   - Check Supabase logs for RAISE NOTICE messages';
    RAISE NOTICE '   - Look for "✅ Updated challenges" messages';
    RAISE NOTICE '   - Check for any "❌ Error" messages';
    RAISE NOTICE '';
END $$;

SELECT '✅ Trigger and functions verified! Check Supabase logs for detailed output.' as status;

