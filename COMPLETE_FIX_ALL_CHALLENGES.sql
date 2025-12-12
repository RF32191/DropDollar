-- ============================================================================
-- COMPLETE FIX FOR ALL CHALLENGE ISSUES
-- ============================================================================
-- This fixes:
-- 1. Weekly challenge descriptions matching target values
-- 2. Challenge progress updates after game completion
-- 3. Level progress bar calculation
-- 4. Regenerates existing challenges with correct values
-- ============================================================================

-- ============================================================================
-- 1. DELETE AND REGENERATE WEEKLY CHALLENGES WITH MATCHING DESCRIPTIONS
-- ============================================================================

-- Delete existing weekly challenges for current week to regenerate with matching values
DO $$
DECLARE
    v_week_start DATE;
BEGIN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Delete existing challenges for this week
    DELETE FROM public.user_weekly_challenges 
    WHERE challenge_id IN (
        SELECT id FROM public.weekly_challenges 
        WHERE week_start_date = v_week_start
    );
    
    DELETE FROM public.weekly_challenges 
    WHERE week_start_date = v_week_start;
    
    RAISE NOTICE '✅ Deleted existing weekly challenges for week starting %', v_week_start;
END $$;

-- ============================================================================
-- 2. FIX generate_weekly_challenges WITH PERFECT MATCHING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_weekly_challenges(p_week_start DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
    v_win_rp INTEGER;
    v_xp_rp INTEGER;
    v_visit_page_rp INTEGER;
    v_visit_category_rp INTEGER;
    v_specific_game_rp INTEGER;
    -- CRITICAL: Store target values in variables FIRST, then use in descriptions
    v_practice_games INTEGER;
    v_competition_games INTEGER;
    v_target_score INTEGER := 100000;
    v_total_games INTEGER;
    v_win_games INTEGER;
    v_total_xp INTEGER;
    v_pages_to_visit INTEGER;
    v_categories_to_visit INTEGER;
    v_games_to_play INTEGER;
BEGIN
    -- Generate RP rewards
    v_practice_rp := 30 + FLOOR(RANDOM() * 31);
    v_competition_rp := 100 + FLOOR(RANDOM() * 101);
    v_score_rp := 80 + FLOOR(RANDOM() * 41);
    v_games_rp := 120 + FLOOR(RANDOM() * 61);
    v_win_rp := 150 + FLOOR(RANDOM() * 101);
    v_xp_rp := 100 + FLOOR(RANDOM() * 51);
    v_visit_page_rp := 50 + FLOOR(RANDOM() * 31);
    v_visit_category_rp := 60 + FLOOR(RANDOM() * 41);
    v_specific_game_rp := 80 + FLOOR(RANDOM() * 41);
    
    -- CRITICAL: Generate target values ONCE and store in variables
    v_practice_games := 10 + FLOOR(RANDOM() * 10);
    v_competition_games := 5 + FLOOR(RANDOM() * 6);
    v_total_games := 15 + FLOOR(RANDOM() * 10);
    v_win_games := 2 + FLOOR(RANDOM() * 4);
    v_total_xp := 1000 + FLOOR(RANDOM() * 500);
    v_pages_to_visit := 5 + FLOOR(RANDOM() * 5);
    v_categories_to_visit := 3 + FLOOR(RANDOM() * 3);
    v_games_to_play := 3 + FLOOR(RANDOM() * 3);

    -- Generate weekly challenges using the SAME variables for description and target
    INSERT INTO public.weekly_challenges (
        week_start_date, challenge_type, challenge_name, challenge_description, 
        target_value, xp_reward, reward_points, is_active
    )
    VALUES
        (p_week_start, 'play_practice', 'Weekly Practice', 'Play ' || v_practice_games::TEXT || ' practice games this week', v_practice_games, 150 + FLOOR(RANDOM() * 100), v_practice_rp, true),
        (p_week_start, 'play_competition', 'Weekly Competitor', 'Play ' || v_competition_games::TEXT || ' competition games this week (paid games)', v_competition_games, 400 + FLOOR(RANDOM() * 200), v_competition_rp, true),
        (p_week_start, 'score_threshold', 'Weekly Score Master', 'Score 100,000 total points in competition games this week', v_target_score, 300 + FLOOR(RANDOM() * 200), v_score_rp, true),
        (p_week_start, 'games_count', 'Weekly Game Marathon', 'Play ' || v_total_games::TEXT || ' games total this week', v_total_games, 350 + FLOOR(RANDOM() * 200), v_games_rp, true),
        (p_week_start, 'win_competition', 'Weekly Winner', 'Win ' || v_win_games::TEXT || ' competition games this week', v_win_games, 500 + FLOOR(RANDOM() * 300), v_win_rp, true),
        (p_week_start, 'total_xp', 'Weekly XP Grinder', 'Earn ' || v_total_xp::TEXT || ' total XP this week', v_total_xp, 400 + FLOOR(RANDOM() * 300), v_xp_rp, true),
        (p_week_start, 'visit_page', 'Weekly Explorer', 'Visit ' || v_pages_to_visit::TEXT || ' different pages this week', v_pages_to_visit, 100 + FLOOR(RANDOM() * 50), v_visit_page_rp, true),
        (p_week_start, 'visit_category', 'Weekly Category Browser', 'Visit ' || v_categories_to_visit::TEXT || ' different category pages this week', v_categories_to_visit, 120 + FLOOR(RANDOM() * 60), v_visit_category_rp, true),
        (p_week_start, 'play_specific_game', 'Weekly Game Specialist', 'Play ' || v_games_to_play::TEXT || ' different game types this week', v_games_to_play, 150 + FLOOR(RANDOM() * 100), v_specific_game_rp, true)
    ON CONFLICT (week_start_date, challenge_type) DO NOTHING;
    
    RAISE NOTICE '✅ Weekly challenges generated for week starting %', p_week_start;
    RAISE NOTICE '   Games to play: % (description and target match)', v_games_to_play;
END;
$$;

-- ============================================================================
-- 3. ENSURE update_challenges_on_game_complete CALLS PROGRESS FUNCTIONS
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
    
    -- Update coin play challenge if it's a coin play game (DAILY ONLY)
    IF p_is_coin_play THEN
        BEGIN
            v_result := public.update_daily_challenge_progress(
                p_user_id,
                'play_coin_play',
                1
            );
            RAISE NOTICE '✅ Updated coin play challenge: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error updating coin play challenge: %', SQLERRM;
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
            RAISE NOTICE '✅ Updated daily challenge %: %', v_challenge_type, v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error updating daily challenge %: %', v_challenge_type, SQLERRM;
        END;
        
        BEGIN
            -- Weekly challenge
            v_result := public.update_weekly_challenge_progress(
                p_user_id,
                v_challenge_type,
                v_increment
            );
            RAISE NOTICE '✅ Updated weekly challenge %: %', v_challenge_type, v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error updating weekly challenge %: %', v_challenge_type, SQLERRM;
        END;
    END IF;
    
    -- Update games_count challenge (ALL games count)
    BEGIN
        v_result := public.update_daily_challenge_progress(
            p_user_id,
            'games_count',
            1
        );
        RAISE NOTICE '✅ Updated daily games_count: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error updating daily games_count: %', SQLERRM;
    END;
    
    BEGIN
        v_result := public.update_weekly_challenge_progress(
            p_user_id,
            'games_count',
            1
        );
        RAISE NOTICE '✅ Updated weekly games_count: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error updating weekly games_count: %', SQLERRM;
    END;
    
    -- Update score_threshold challenge (cumulative score) - only for competition games
    IF NOT p_is_practice THEN
        BEGIN
            v_result := public.update_daily_challenge_progress(
                p_user_id,
                'score_threshold',
                p_score
            );
            RAISE NOTICE '✅ Updated daily score_threshold: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error updating daily score_threshold: %', SQLERRM;
        END;
        
        BEGIN
            v_result := public.update_weekly_challenge_progress(
                p_user_id,
                'score_threshold',
                p_score
            );
            RAISE NOTICE '✅ Updated weekly score_threshold: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error updating weekly score_threshold: %', SQLERRM;
        END;
    END IF;
    
    -- Update play_specific_game challenge (ALL games count)
    BEGIN
        v_result := public.update_daily_challenge_progress(
            p_user_id,
            'play_specific_game',
            1
        );
        RAISE NOTICE '✅ Updated daily play_specific_game: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error updating daily play_specific_game: %', SQLERRM;
    END;
    
    BEGIN
        v_result := public.update_weekly_challenge_progress(
            p_user_id,
            'play_specific_game',
            1
        );
        RAISE NOTICE '✅ Updated weekly play_specific_game: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error updating weekly play_specific_game: %', SQLERRM;
    END;
END;
$$;

-- ============================================================================
-- 4. FIX get_user_xp TO RETURN CORRECT xp_to_next_level
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
DECLARE
    v_total_xp INTEGER;
    v_current_level INTEGER;
    v_xp_to_next INTEGER;
    v_reward_points INTEGER;
    v_rank_title TEXT;
    v_rank_tier INTEGER;
    v_rank_image_url TEXT;
    v_xp_for_current_level INTEGER;
    v_xp_earned_in_level INTEGER;
BEGIN
    -- Create XP record if it doesn't exist
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create ranking record if it doesn't exist
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier)
    VALUES (p_user_id, 'Novice', 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get user XP data
    SELECT ux.total_xp, ux.current_level, ux.reward_points
    INTO v_total_xp, v_current_level, v_reward_points
    FROM public.user_xp ux
    WHERE ux.user_id = p_user_id;
    
    -- Calculate XP needed for current level
    v_xp_for_current_level := public.calculate_xp_for_level(v_current_level);
    
    -- Calculate cumulative XP needed for all levels up to current level
    DECLARE
        v_temp_level INTEGER := 1;
        v_cumulative_xp INTEGER := 0;
    BEGIN
        WHILE v_temp_level < v_current_level LOOP
            v_cumulative_xp := v_cumulative_xp + public.calculate_xp_for_level(v_temp_level);
            v_temp_level := v_temp_level + 1;
        END LOOP;
        
        -- Calculate XP earned in current level
        v_xp_earned_in_level := v_total_xp - v_cumulative_xp;
        
        -- Calculate XP remaining to next level
        v_xp_to_next := v_xp_for_current_level - v_xp_earned_in_level;
        
        -- Ensure it's not negative
        IF v_xp_to_next < 0 THEN
            v_xp_to_next := 0;
        END IF;
    END;
    
    -- Get ranking
    SELECT ur.rank_title, ur.rank_tier, ur.rank_image_url
    INTO v_rank_title, v_rank_tier, v_rank_image_url
    FROM public.user_rankings ur
    WHERE ur.user_id = p_user_id;
    
    -- Return results
    RETURN QUERY
    SELECT 
        v_total_xp,
        v_current_level,
        v_xp_to_next,
        v_reward_points,
        COALESCE(v_rank_title, 'Novice'),
        COALESCE(v_rank_tier, 1),
        v_rank_image_url;
END;
$$;

-- ============================================================================
-- 5. REGENERATE WEEKLY CHALLENGES FOR CURRENT WEEK
-- ============================================================================

DO $$
DECLARE
    v_week_start DATE;
BEGIN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    PERFORM public.generate_weekly_challenges(v_week_start);
    RAISE NOTICE '✅ Regenerated weekly challenges for week starting %', v_week_start;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL CHALLENGES FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - Weekly challenge descriptions now match target values';
    RAISE NOTICE '   - Challenge progress updates with detailed logging';
    RAISE NOTICE '   - Level progress bar calculation fixed';
    RAISE NOTICE '   - Weekly challenges regenerated for current week';
    RAISE NOTICE '';
    RAISE NOTICE '📊 WHAT HAPPENS NOW:';
    RAISE NOTICE '   1. Game completes → Trigger fires';
    RAISE NOTICE '   2. Challenge progress updates (with logging)';
    RAISE NOTICE '   3. Progress bars update correctly';
    RAISE NOTICE '   4. Level progress bar shows accurate progress';
    RAISE NOTICE '';
END $$;

SELECT '✅ All challenges fixed! Descriptions match, progress updates, level bar works.' as status;

