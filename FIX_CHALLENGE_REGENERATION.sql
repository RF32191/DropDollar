-- ============================================================================
-- FIX CHALLENGE REGENERATION ISSUE
-- ============================================================================
-- Prevents challenges from regenerating on every refresh
-- Only generates challenges if they don't exist for today
-- ============================================================================

-- ============================================================================
-- 1. FIX generate_daily_challenges TO NOT REGENERATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_daily_challenges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_coin_play_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
    v_visit_page_rp INTEGER;
    v_visit_category_rp INTEGER;
    v_specific_game_rp INTEGER;
    v_practice_games INTEGER;
    v_competition_games INTEGER;
    v_coin_play_games INTEGER := 4; -- Fixed at 4 coin play games
    v_target_score INTEGER;
    v_total_games INTEGER;
    v_pages_to_visit INTEGER;
    v_categories_to_visit INTEGER;
    v_games_to_play INTEGER;
BEGIN
    -- ONLY generate if challenges don't exist for today
    -- This prevents regeneration on every refresh
    IF EXISTS (SELECT 1 FROM public.daily_challenges WHERE challenge_date = v_today AND is_active = true) THEN
        RETURN; -- Challenges already exist, don't regenerate
    END IF;

    -- Generate varied RP rewards
    -- Practice: 5-15 RP (LOWER - free games)
    -- Competition: 30-60 RP (HIGHER - paid games)
    -- Coin Play: 10-20 RP (LOWER - separate challenge, less RP)
    -- Score: 25-45 RP (skill-based)
    -- Games count: 20-40 RP (engagement)
    -- Page visits: 10-20 RP (engagement)
    -- Category visits: 15-25 RP (discovery)
    -- Specific game: 20-35 RP (targeted engagement)
    
    v_practice_rp := 5 + FLOOR(RANDOM() * 11); -- 5-15 RP (LOWER)
    v_competition_rp := 30 + FLOOR(RANDOM() * 31); -- 30-60 RP (HIGHER)
    v_coin_play_rp := 10 + FLOOR(RANDOM() * 11); -- 10-20 RP (LOWER - separate daily challenge)
    v_score_rp := 25 + FLOOR(RANDOM() * 21); -- 25-45 RP
    v_games_rp := 20 + FLOOR(RANDOM() * 21); -- 20-40 RP
    v_visit_page_rp := 10 + FLOOR(RANDOM() * 11); -- 10-20 RP
    v_visit_category_rp := 15 + FLOOR(RANDOM() * 11); -- 15-25 RP
    v_specific_game_rp := 20 + FLOOR(RANDOM() * 16); -- 20-35 RP
    
    -- Generate random target values (only once per day)
    v_practice_games := 2 + FLOOR(RANDOM() * 3); -- 2-4 games
    v_competition_games := 1 + FLOOR(RANDOM() * 3); -- 1-3 games (paid)
    v_target_score := 10000; -- Fixed at 10,000 points for daily challenge
    v_total_games := 3 + FLOOR(RANDOM() * 4); -- 3-6 games
    v_pages_to_visit := 2 + FLOOR(RANDOM() * 3); -- 2-4 pages
    v_categories_to_visit := 1 + FLOOR(RANDOM() * 2); -- 1-2 categories
    v_games_to_play := 1 + FLOOR(RANDOM() * 2); -- 1-2 specific games

    -- Generate daily challenges with focus on paid games and coin play
    INSERT INTO public.daily_challenges (
        challenge_date, challenge_type, challenge_name, challenge_description, 
        target_value, xp_reward, reward_points, is_active
    )
    VALUES
        -- Practice games (LOWER RP - free)
        (
            v_today, 
            'play_practice', 
            'Practice Session', 
            'Play ' || v_practice_games::TEXT || ' practice games today', 
            v_practice_games, 
            15 + FLOOR(RANDOM() * 15), 
            v_practice_rp, 
            true
        ),
        -- Competition games (HIGHER RP - paid)
        (
            v_today, 
            'play_competition', 
            'Competition Champion', 
            'Play ' || v_competition_games::TEXT || ' competition games today (paid games)', 
            v_competition_games, 
            75 + FLOOR(RANDOM() * 50), 
            v_competition_rp, 
            true
        ),
        -- Coin Play games (LOWER RP - separate daily challenge, 4 games = 1 competitive game)
        (
            v_today, 
            'play_coin_play', 
            'Coin Play Master', 
            'Play ' || v_coin_play_games::TEXT || ' coin play games today (4 games = 1 competitive game)', 
            v_coin_play_games, 
            50 + FLOOR(RANDOM() * 30), 
            v_coin_play_rp, 
            true
        ),
        -- Score challenge (cumulative - tracks total score for the day)
        (
            v_today, 
            'score_threshold', 
            'Score Master', 
            'Score ' || v_target_score::TEXT || ' total points in competition games today', 
            v_target_score, 
            40 + FLOOR(RANDOM() * 30), 
            v_score_rp, 
            true
        ),
        -- Total games (prioritize competition)
        (
            v_today, 
            'games_count', 
            'Game Marathon', 
            'Play ' || v_total_games::TEXT || ' games total today (competition games count double)', 
            v_total_games, 
            50 + FLOOR(RANDOM() * 30), 
            v_games_rp, 
            true
        ),
        -- Page visits
        (
            v_today, 
            'visit_page', 
            'Explorer', 
            'Visit ' || v_pages_to_visit::TEXT || ' different pages today', 
            v_pages_to_visit, 
            20 + FLOOR(RANDOM() * 15), 
            v_visit_page_rp, 
            true
        ),
        -- Category visits
        (
            v_today, 
            'visit_category', 
            'Category Browser', 
            'Visit ' || v_categories_to_visit::TEXT || ' different category pages today', 
            v_categories_to_visit, 
            25 + FLOOR(RANDOM() * 20), 
            v_visit_category_rp, 
            true
        ),
        -- Specific game challenge
        (
            v_today, 
            'play_specific_game', 
            'Game Specialist', 
            'Play ' || v_games_to_play::TEXT || ' different game types today', 
            v_games_to_play, 
            30 + FLOOR(RANDOM() * 25), 
            v_specific_game_rp, 
            true
        )
    ON CONFLICT (challenge_date, challenge_type) DO NOTHING; -- Don't overwrite if exists
    
    RAISE NOTICE '✅ Daily challenges generated for %', v_today;
END;
$$;

-- ============================================================================
-- 2. FIX generate_weekly_challenges TO NOT REGENERATE
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
BEGIN
    -- ONLY generate if challenges don't exist for this week
    -- This prevents regeneration on every refresh
    IF EXISTS (SELECT 1 FROM public.weekly_challenges WHERE week_start_date = p_week_start AND is_active = true) THEN
        RETURN; -- Challenges already exist, don't regenerate
    END IF;

    -- Generate varied RP rewards (NO COIN PLAY in weekly challenges)
    -- Practice: 30-60 RP (LOWER - free games)
    -- Competition: 100-200 RP (HIGHER - paid games)
    -- Score: 80-120 RP
    -- Games count: 120-180 RP
    -- Win competition: 150-250 RP (HIGHEST - paid wins)
    -- Total XP: 100-150 RP
    -- Page visits: 50-80 RP
    -- Category visits: 60-100 RP
    -- Specific game: 80-120 RP
    
    v_practice_rp := 30 + FLOOR(RANDOM() * 31); -- 30-60 RP (LOWER)
    v_competition_rp := 100 + FLOOR(RANDOM() * 101); -- 100-200 RP (HIGHER)
    v_score_rp := 80 + FLOOR(RANDOM() * 41); -- 80-120 RP
    v_games_rp := 120 + FLOOR(RANDOM() * 61); -- 120-180 RP
    v_win_rp := 150 + FLOOR(RANDOM() * 101); -- 150-250 RP (HIGHEST)
    v_xp_rp := 100 + FLOOR(RANDOM() * 51); -- 100-150 RP
    v_visit_page_rp := 50 + FLOOR(RANDOM() * 31); -- 50-80 RP
    v_visit_category_rp := 60 + FLOOR(RANDOM() * 41); -- 60-100 RP
    v_specific_game_rp := 80 + FLOOR(RANDOM() * 41); -- 80-120 RP

    -- Generate weekly challenges with focus on paid games (NO COIN PLAY)
    INSERT INTO public.weekly_challenges (
        week_start_date, challenge_type, challenge_name, challenge_description, 
        target_value, xp_reward, reward_points, is_active
    )
    VALUES
        -- Practice games (LOWER RP)
        (
            p_week_start, 
            'play_practice', 
            'Weekly Practice', 
            'Play ' || (10 + FLOOR(RANDOM() * 10))::TEXT || ' practice games this week', 
            10 + FLOOR(RANDOM() * 10), 
            150 + FLOOR(RANDOM() * 100), 
            v_practice_rp, 
            true
        ),
        -- Competition games (HIGHER RP - paid)
        (
            p_week_start, 
            'play_competition', 
            'Weekly Competitor', 
            'Play ' || (5 + FLOOR(RANDOM() * 6))::TEXT || ' competition games this week (paid games)', 
            5 + FLOOR(RANDOM() * 6), 
            400 + FLOOR(RANDOM() * 200), 
            v_competition_rp, 
            true
        ),
        -- Score threshold (competition games) - Fixed at 100,000 points
        (
            p_week_start, 
            'score_threshold', 
            'Weekly Score Master', 
            'Score 100,000 total points in competition games this week', 
            100000, 
            300 + FLOOR(RANDOM() * 200), 
            v_score_rp, 
            true
        ),
        -- Total games
        (
            p_week_start, 
            'games_count', 
            'Weekly Game Marathon', 
            'Play ' || (15 + FLOOR(RANDOM() * 10))::TEXT || ' games total this week', 
            15 + FLOOR(RANDOM() * 10), 
            350 + FLOOR(RANDOM() * 200), 
            v_games_rp, 
            true
        ),
        -- Win competition (HIGHEST RP - paid wins)
        (
            p_week_start, 
            'win_competition', 
            'Weekly Winner', 
            'Win ' || (2 + FLOOR(RANDOM() * 4))::TEXT || ' competition games this week', 
            2 + FLOOR(RANDOM() * 4), 
            500 + FLOOR(RANDOM() * 300), 
            v_win_rp, 
            true
        ),
        -- Total XP
        (
            p_week_start, 
            'total_xp', 
            'Weekly XP Grinder', 
            'Earn ' || (1000 + FLOOR(RANDOM() * 500))::TEXT || ' total XP this week', 
            1000 + FLOOR(RANDOM() * 500), 
            400 + FLOOR(RANDOM() * 300), 
            v_xp_rp, 
            true
        ),
        -- Page visits
        (
            p_week_start, 
            'visit_page', 
            'Weekly Explorer', 
            'Visit ' || (5 + FLOOR(RANDOM() * 5))::TEXT || ' different pages this week', 
            5 + FLOOR(RANDOM() * 5), 
            100 + FLOOR(RANDOM() * 50), 
            v_visit_page_rp, 
            true
        ),
        -- Category visits
        (
            p_week_start, 
            'visit_category', 
            'Weekly Category Browser', 
            'Visit ' || (3 + FLOOR(RANDOM() * 3))::TEXT || ' different category pages this week', 
            3 + FLOOR(RANDOM() * 3), 
            120 + FLOOR(RANDOM() * 60), 
            v_visit_category_rp, 
            true
        ),
        -- Specific games
        (
            p_week_start, 
            'play_specific_game', 
            'Weekly Game Specialist', 
            'Play ' || (3 + FLOOR(RANDOM() * 3))::TEXT || ' different game types this week', 
            3 + FLOOR(RANDOM() * 3), 
            150 + FLOOR(RANDOM() * 100), 
            v_specific_game_rp, 
            true
        )
    ON CONFLICT (week_start_date, challenge_type) DO NOTHING; -- Don't overwrite if exists
    
    RAISE NOTICE '✅ Weekly challenges generated for week starting %', p_week_start;
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CHALLENGE REGENERATION FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 WHAT WAS FIXED:';
    RAISE NOTICE '   - Removed DELETE statement that was regenerating challenges';
    RAISE NOTICE '   - Added check to only generate if challenges don''t exist';
    RAISE NOTICE '   - Challenges now stay consistent throughout the day';
    RAISE NOTICE '';
    RAISE NOTICE '📊 BEHAVIOR:';
    RAISE NOTICE '   - Daily challenges: Generated once per day, stay the same';
    RAISE NOTICE '   - Weekly challenges: Generated once per week, stay the same';
    RAISE NOTICE '   - Refresh no longer changes challenge values';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenge Regeneration Fixed! Challenges will no longer change on refresh.' as status;

