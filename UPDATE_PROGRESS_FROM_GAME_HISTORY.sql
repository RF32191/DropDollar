-- ============================================================================
-- UPDATE PROGRESS FROM GAME HISTORY
-- ============================================================================
-- This function scans game_history and updates challenge progress based on
-- actual games played, including competition types
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION TO UPDATE PROGRESS FROM GAME HISTORY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_challenges_from_game_history(
    p_user_id UUID DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_game RECORD;
    v_is_practice BOOLEAN;
    v_is_coin_play BOOLEAN;
    v_tournament_type TEXT;
    v_game_type TEXT;
    v_score INTEGER;
    v_updated_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Loop through recent game history
    FOR v_game IN
        SELECT 
            gh.id,
            gh.user_id,
            gh.game_type,
            gh.score,
            gh.is_practice,
            gh.is_competition,
            gh.listing_id,
            gh.metadata,
            gh.created_at
        FROM public.game_history gh
        WHERE gh.created_at > NOW() - (p_hours_back || ' hours')::INTERVAL
        AND (p_user_id IS NULL OR gh.user_id = p_user_id)
        ORDER BY gh.created_at DESC
    LOOP
        BEGIN
            -- Determine game type
            v_is_practice := COALESCE(v_game.is_practice, false);
            v_game_type := COALESCE(v_game.game_type, 'unknown');
            v_score := COALESCE(v_game.score, 0);
            v_is_coin_play := false;
            v_tournament_type := NULL;
            
            -- Check metadata for coin play and tournament type
            IF v_game.metadata IS NOT NULL THEN
                BEGIN
                    IF (v_game.metadata->>'is_coin_play')::BOOLEAN = true THEN
                        v_is_coin_play := true;
                    END IF;
                    v_tournament_type := v_game.metadata->>'tournament_type';
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;
            
            -- Check listing_id for coin play pattern
            IF NOT v_is_coin_play AND v_game.listing_id IS NOT NULL THEN
                IF v_game.listing_id::TEXT LIKE 'cp-%' THEN
                    v_is_coin_play := true;
                END IF;
            END IF;
            
            -- Update challenges based on game type
            IF v_is_practice THEN
                -- Practice game
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_practice', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'play_practice', 1);
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'games_count', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'games_count', 1);
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_specific_game', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'play_specific_game', 1);
                
                v_updated_count := v_updated_count + 1;
                
            ELSIF v_is_coin_play THEN
                -- Coin play game (daily only)
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_coin_play', 1);
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'games_count', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'games_count', 1);
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_specific_game', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'play_specific_game', 1);
                
                v_updated_count := v_updated_count + 1;
                
            ELSE
                -- Competition game - check tournament type
                IF v_tournament_type = '1v1' OR v_tournament_type = 'one_v_one' THEN
                    PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_1v1', 1);
                ELSIF v_tournament_type = 'winner_takes_all' OR v_tournament_type = 'wta' THEN
                    PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_winner_takes_all', 1);
                ELSIF v_tournament_type = 'hot_sell' THEN
                    PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_hot_sell', 1);
                END IF;
                
                -- Update general competition challenges
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'games_count', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'games_count', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'play_competition', 1);
                PERFORM public.update_daily_challenge_progress(v_game.user_id, 'play_specific_game', 1);
                PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'play_specific_game', 1);
                
                -- Update score threshold (only for competition games)
                IF v_score > 0 THEN
                    PERFORM public.update_daily_challenge_progress(v_game.user_id, 'score_threshold', v_score);
                    PERFORM public.update_weekly_challenge_progress(v_game.user_id, 'score_threshold', v_score);
                END IF;
                
                v_updated_count := v_updated_count + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING '[UPDATE_FROM_HISTORY] Error processing game %: %', v_game.id, SQLERRM;
        END;
    END LOOP;
    
    v_result := jsonb_build_object(
        'success', true,
        'games_processed', v_updated_count,
        'errors', v_error_count,
        'hours_back', p_hours_back,
        'user_id', p_user_id
    );
    
    RAISE NOTICE '[UPDATE_FROM_HISTORY] ✅ Processed % games, % errors', v_updated_count, v_error_count;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. FUNCTION TO UPDATE SPECIFIC USER'S PROGRESS FROM HISTORY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_challenges_from_history(
    p_user_id UUID,
    p_hours_back INTEGER DEFAULT 168 -- Default 7 days
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.update_challenges_from_game_history(p_user_id, p_hours_back);
END;
$$;

-- ============================================================================
-- 3. FUNCTION TO UPDATE ALL USERS' PROGRESS FROM RECENT HISTORY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_all_challenges_from_recent_history(
    p_hours_back INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.update_challenges_from_game_history(NULL, p_hours_back);
END;
$$;

-- ============================================================================
-- 4. VERIFICATION AND TESTING
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PROGRESS UPDATE FUNCTIONS CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 FUNCTIONS:';
    RAISE NOTICE '   1. update_challenges_from_game_history(user_id, hours_back)';
    RAISE NOTICE '      - Updates progress for specific user or all users';
    RAISE NOTICE '      - Scans game_history and updates challenges';
    RAISE NOTICE '';
    RAISE NOTICE '   2. update_user_challenges_from_history(user_id, hours_back)';
    RAISE NOTICE '      - Updates progress for a specific user';
    RAISE NOTICE '      - Default: last 7 days';
    RAISE NOTICE '';
    RAISE NOTICE '   3. update_all_challenges_from_recent_history(hours_back)';
    RAISE NOTICE '      - Updates progress for all users';
    RAISE NOTICE '      - Default: last 24 hours';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TO TEST:';
    RAISE NOTICE '   SELECT public.update_user_challenges_from_history(''USER_ID_HERE'', 168);';
    RAISE NOTICE '   SELECT public.update_all_challenges_from_recent_history(24);';
    RAISE NOTICE '';
END $$;

SELECT '✅ Progress update functions created! Use them to sync challenge progress with game history.' as status;

