-- ============================================================================
-- FIX XP AWARD SYSTEM AND REDUCE REFRESH FREQUENCY
-- ============================================================================
-- 1. Award 5 XP for practice games (already correct)
-- 2. Award 10 XP for competition games (1v1, WTA, Hot Sell)
-- 3. Ensure XP is awarded via trigger when games complete
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION TO AWARD XP FOR COMPETITION GAMES
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
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 2. UPDATE TRIGGER TO AWARD XP WHEN GAMES COMPLETE
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
            
            -- Award XP based on game type
            IF v_is_practice THEN
                -- Practice game: 5 XP
                BEGIN
                    PERFORM public.award_practice_game_xp(
                        NEW.user_id,
                        NEW.id,
                        COALESCE(NEW.score, 0)::INTEGER
                    );
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
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Error awarding competition XP: %', SQLERRM;
                END;
            END IF;
            
            -- Update challenges based on game completion
            PERFORM public.update_challenges_on_game_complete(
                NEW.user_id,
                COALESCE(NEW.game_type, 'unknown'),
                COALESCE(NEW.score, 0)::INTEGER,
                v_is_practice,
                v_is_coin_play,
                v_tournament_type
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the insert
            v_error_message := SQLERRM;
            RAISE WARNING 'Error updating challenges for game_history id %: %', NEW.id, v_error_message;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. GRANT PERMISSIONS
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
    RAISE NOTICE '✅ XP SYSTEM UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 XP AWARDS:';
    RAISE NOTICE '   - Practice games: 5 XP per game';
    RAISE NOTICE '   - Competition games: 10 XP per game (1v1, WTA, Hot Sell)';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 TRIGGER UPDATED:';
    RAISE NOTICE '   - Automatically awards XP when games complete';
    RAISE NOTICE '   - Updates challenge progress';
    RAISE NOTICE '';
END $$;

SELECT '✅ XP system updated! Practice: 5 XP, Competition: 10 XP' as status;

