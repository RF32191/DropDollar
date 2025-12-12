-- ============================================================================
-- FIX PRACTICE GAME UPDATES - ENSURE ALL TASKS UPDATE
-- ============================================================================

-- ============================================================================
-- 1. ENSURE update_challenges_on_game_complete UPDATES ALL TASKS FOR PRACTICE
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
    
    -- CRITICAL: For practice games, update ALL relevant challenges
    IF p_is_practice THEN
        -- Practice-specific challenges
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_practice', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_practice', 1);
        
        -- General challenges (all games count)
        PERFORM public.update_daily_challenge_progress(p_user_id, 'games_count', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'games_count', 1);
        
        -- Game type challenges
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_specific_game', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_specific_game', 1);
        
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated all practice game challenges for user %', p_user_id;
    END IF;
    
    -- For coin play games (daily only)
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_coin_play', 1);
        PERFORM public.update_daily_challenge_progress(p_user_id, 'games_count', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'games_count', 1);
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_specific_game', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_specific_game', 1);
        
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated all coin play challenges for user %', p_user_id;
    END IF;
    
    -- For competition games
    IF NOT p_is_practice AND NOT p_is_coin_play THEN
        -- Specific tournament type challenges
        IF v_challenge_type = 'play_1v1' THEN
            PERFORM public.update_daily_challenge_progress(p_user_id, 'play_1v1', 1);
        ELSIF v_challenge_type = 'play_winner_takes_all' THEN
            PERFORM public.update_daily_challenge_progress(p_user_id, 'play_winner_takes_all', 1);
        ELSIF v_challenge_type = 'play_hot_sell' THEN
            PERFORM public.update_daily_challenge_progress(p_user_id, 'play_hot_sell', 1);
        END IF;
        
        -- General competition challenges
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_competition', 1);
        
        -- General challenges (all games count)
        PERFORM public.update_daily_challenge_progress(p_user_id, 'games_count', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'games_count', 1);
        
        -- Score threshold (only for competition)
        IF p_score > 0 THEN
            PERFORM public.update_daily_challenge_progress(p_user_id, 'score_threshold', p_score);
            PERFORM public.update_weekly_challenge_progress(p_user_id, 'score_threshold', p_score);
        END IF;
        
        -- Game type challenges
        PERFORM public.update_daily_challenge_progress(p_user_id, 'play_specific_game', 1);
        PERFORM public.update_weekly_challenge_progress(p_user_id, 'play_specific_game', 1);
        
        RAISE NOTICE '[UPDATE_CHALLENGES] ✅ Updated all competition game challenges for user %', p_user_id;
    END IF;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PRACTICE GAME UPDATES FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - Practice games now update ALL relevant challenges';
    RAISE NOTICE '   - play_practice (daily & weekly)';
    RAISE NOTICE '   - games_count (daily & weekly)';
    RAISE NOTICE '   - play_specific_game (daily & weekly)';
    RAISE NOTICE '';
END $$;

SELECT '✅ Practice game updates fixed! All tasks will now update correctly.' as status;

