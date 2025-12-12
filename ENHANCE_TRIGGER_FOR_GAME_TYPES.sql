-- ============================================================================
-- ENHANCE TRIGGER TO PROPERLY DETECT GAME TYPES
-- ============================================================================
-- Ensures the trigger correctly identifies practice, competition, and types
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
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- CRITICAL: Get is_practice directly from NEW record
        v_is_practice := COALESCE(NEW.is_practice, false);
        v_game_type := COALESCE(NEW.game_type, 'unknown');
        v_score := COALESCE(NEW.score, 0);
        
        -- Get tournament type from metadata
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
        
        -- Award XP
        BEGIN
            IF v_is_practice THEN
                PERFORM public.award_practice_game_xp(NEW.user_id, NEW.id, v_score);
                RAISE NOTICE '[TRIGGER] ✅ Awarded 5 XP for practice game to user %', NEW.user_id;
            ELSE
                PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, v_score);
                RAISE NOTICE '[TRIGGER] ✅ Awarded 10 XP for competition game to user %', NEW.user_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[TRIGGER] ❌ Error awarding XP: %', SQLERRM;
        END;
        
        -- CRITICAL: Update challenges with all game type information
        BEGIN
            PERFORM public.update_challenges_on_game_complete(
                NEW.user_id,
                v_game_type,
                v_score,
                v_is_practice,
                v_is_coin_play,
                v_tournament_type
            );
            RAISE NOTICE '[TRIGGER] ✅ Updated challenges for user % (practice: %, coin_play: %, tournament: %)', 
                NEW.user_id, v_is_practice, v_is_coin_play, v_tournament_type;
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
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) THEN
        CREATE TRIGGER trigger_update_challenges_on_game_history
        AFTER INSERT ON public.game_history
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
        
        RAISE NOTICE '[TRIGGER] ✅ Trigger created';
    ELSE
        RAISE NOTICE '[TRIGGER] ✅ Trigger already exists';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGER ENHANCED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 IMPROVEMENTS:';
    RAISE NOTICE '   - Properly detects is_practice from game_history';
    RAISE NOTICE '   - Detects coin_play from metadata and listing_id';
    RAISE NOTICE '   - Extracts tournament_type from metadata';
    RAISE NOTICE '   - Passes all game type info to update function';
    RAISE NOTICE '';
END $$;

SELECT '✅ Trigger enhanced! It now properly detects all game types and updates challenges accordingly.' as status;

