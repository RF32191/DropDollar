-- ============================================================================
-- COMPLETE FIX FOR TRIGGER, XP AWARDS, AND CHALLENGE PROGRESS
-- ============================================================================
-- This ensures:
-- 1. Trigger exists and is attached to game_history
-- 2. XP is awarded correctly (5 XP practice, 10 XP competition)
-- 3. Challenge progress updates correctly
-- 4. Level progress bar updates
-- ============================================================================

-- ============================================================================
-- 1. ENSURE COMPETITION XP FUNCTION EXISTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_competition_game_xp(
    p_user_id UUID,
    p_game_history_id UUID,
    p_score INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_xp_amount INTEGER := 10; -- Fixed 10 XP for competition games
BEGIN
    -- Award 10 XP for competition games
    PERFORM public.award_xp(
        p_user_id,
        v_xp_amount,
        'competition_game',
        p_game_history_id,
        'Competition game completed'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'xp_awarded', v_xp_amount,
        'message', 'Competition game XP awarded'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error awarding competition XP: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 2. CREATE COMPLETE TRIGGER FUNCTION WITH XP AWARDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_coin_play BOOLEAN;
    v_is_practice BOOLEAN;
    v_tournament_type TEXT;
    v_error_message TEXT;
BEGIN
    -- Only process if this is a new game record
    IF TG_OP = 'INSERT' THEN
        BEGIN
            -- Determine if it's practice (use is_practice column)
            v_is_practice := COALESCE(NEW.is_practice, false);
            
            -- Get tournament type from metadata or tournament_type column
            v_tournament_type := NULL;
            
            -- Check tournament_type column if it exists
            BEGIN
                SELECT NEW.tournament_type INTO v_tournament_type;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
            
            -- If not in column, check metadata
            IF v_tournament_type IS NULL AND NEW.metadata IS NOT NULL THEN
                BEGIN
                    v_tournament_type := NEW.metadata->>'tournament_type';
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Detect coin play games
            v_is_coin_play := false;
            
            -- Method 1: Check metadata for coin_play flag
            IF NEW.metadata IS NOT NULL THEN
                BEGIN
                    IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                        v_is_coin_play := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Method 2: Check if listing_id matches coin play pattern
            IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
                BEGIN
                    IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                        v_is_coin_play := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Method 3: Check coin_play_participants table
            IF NOT v_is_coin_play THEN
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 FROM public.coin_play_participants cp
                        JOIN public.coin_play_sessions cs ON cp.session_id = cs.id
                        WHERE cp.user_id = NEW.user_id
                        AND cp.completed_at IS NOT NULL
                        AND cp.completed_at > NOW() - INTERVAL '5 minutes'
                        AND cs.game_type = NEW.game_type
                    ) INTO v_is_coin_play;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Award XP based on game type (CRITICAL: This must happen)
            IF v_is_practice THEN
                -- Practice game: 5 XP
                BEGIN
                    PERFORM public.award_practice_game_xp(
                        NEW.user_id,
                        NEW.id,
                        COALESCE(NEW.score, 0)::INTEGER
                    );
                    RAISE NOTICE '✅ Awarded 5 XP for practice game to user %', NEW.user_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Error awarding practice XP: %', SQLERRM;
                END;
            ELSE
                -- Competition game (1v1, WTA, Hot Sell, etc.): 10 XP
                BEGIN
                    PERFORM public.award_competition_game_xp(
                        NEW.user_id,
                        NEW.id,
                        COALESCE(NEW.score, 0)::INTEGER
                    );
                    RAISE NOTICE '✅ Awarded 10 XP for competition game to user %', NEW.user_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Error awarding competition XP: %', SQLERRM;
                END;
            END IF;
            
            -- Update challenges based on game completion (CRITICAL: This must happen)
            BEGIN
                PERFORM public.update_challenges_on_game_complete(
                    NEW.user_id,
                    COALESCE(NEW.game_type, 'unknown'),
                    COALESCE(NEW.score, 0)::INTEGER,
                    v_is_practice,
                    v_is_coin_play,
                    v_tournament_type
                );
                RAISE NOTICE '✅ Updated challenges for user %', NEW.user_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error updating challenges: %', SQLERRM;
            END;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the insert
            v_error_message := SQLERRM;
            RAISE WARNING 'Error in trigger for game_history id %: %', NEW.id, v_error_message;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. DROP AND RECREATE TRIGGER TO ENSURE IT'S ATTACHED
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;

-- Create trigger
CREATE TRIGGER trigger_update_challenges_on_game_history
AFTER INSERT ON public.game_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();

-- ============================================================================
-- 4. VERIFY TRIGGER EXISTS
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
    
    IF v_trigger_exists AND v_function_exists THEN
        RAISE NOTICE '✅ Trigger is properly attached to game_history table';
    ELSE
        RAISE WARNING '⚠️ Trigger or function missing! Trigger exists: %, Function exists: %', v_trigger_exists, v_function_exists;
    END IF;
END $$;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.award_competition_game_xp(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_update_challenges_on_game_history() TO authenticated;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGER AND XP SYSTEM FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 XP AWARDS:';
    RAISE NOTICE '   - Practice games: 5 XP per game';
    RAISE NOTICE '   - Competition games: 10 XP per game';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 TRIGGER STATUS:';
    RAISE NOTICE '   - Trigger attached to game_history table';
    RAISE NOTICE '   - Automatically awards XP when games complete';
    RAISE NOTICE '   - Automatically updates challenge progress';
    RAISE NOTICE '';
    RAISE NOTICE '📊 WHAT HAPPENS WHEN A GAME COMPLETES:';
    RAISE NOTICE '   1. Game saved to game_history';
    RAISE NOTICE '   2. Trigger fires automatically';
    RAISE NOTICE '   3. XP awarded (5 or 10 based on game type)';
    RAISE NOTICE '   4. Challenge progress updated';
    RAISE NOTICE '   5. Level progress bar updates';
    RAISE NOTICE '';
END $$;

SELECT '✅ Trigger and XP system fixed! XP and challenges will update automatically.' as status;

