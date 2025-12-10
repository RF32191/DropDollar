-- ============================================================================
-- UPDATE CHALLENGES FOR COIN PLAY GAMES
-- ============================================================================
-- Adds coin play requirements and adjusts RP payouts for profitability
-- Coin play games count double and generate revenue ($0.25 per game)
-- ============================================================================

-- ============================================================================
-- 1. ADD COIN PLAY CHALLENGE TYPE
-- ============================================================================

-- Update daily_challenges table to allow coin_play challenge type
ALTER TABLE public.daily_challenges 
DROP CONSTRAINT IF EXISTS daily_challenges_challenge_type_check;

ALTER TABLE public.daily_challenges
ADD CONSTRAINT daily_challenges_challenge_type_check 
CHECK (challenge_type IN (
    'play_practice', 'play_competition', 'score_threshold', 
    'games_count', 'win_competition', 'perfect_score',
    'visit_page', 'visit_category', 'play_specific_game',
    'play_coin_play'
));

-- Update weekly_challenges table to allow coin_play challenge type
ALTER TABLE public.weekly_challenges 
DROP CONSTRAINT IF EXISTS weekly_challenges_challenge_type_check;

ALTER TABLE public.weekly_challenges
ADD CONSTRAINT weekly_challenges_challenge_type_check 
CHECK (challenge_type IN (
    'play_practice', 'play_competition', 'score_threshold', 
    'games_count', 'win_competition', 'perfect_score', 'total_xp', 'level_up',
    'visit_page', 'visit_category', 'play_specific_game',
    'play_coin_play'
));

-- ============================================================================
-- 2. UPDATE DAILY CHALLENGE GENERATION WITH COIN PLAY
-- ============================================================================
-- Require 4 coin play games, count double, higher RP (coin play generates revenue)

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
    -- Delete old challenges for today (to regenerate with new values)
    DELETE FROM public.daily_challenges WHERE challenge_date = v_today;

    -- Generate varied RP rewards
    -- Practice: 5-15 RP (LOWER - free games)
    -- Competition: 30-60 RP (HIGHER - paid games)
    -- Coin Play: 40-80 RP (HIGHEST - generates $0.25 revenue per game, so we can afford more RP)
    -- Score: 25-45 RP (skill-based)
    -- Games count: 20-40 RP (engagement)
    -- Page visits: 10-20 RP (engagement)
    -- Category visits: 15-25 RP (discovery)
    -- Specific game: 20-35 RP (targeted engagement)
    
    v_practice_rp := 5 + FLOOR(RANDOM() * 11); -- 5-15 RP (LOWER)
    v_competition_rp := 30 + FLOOR(RANDOM() * 31); -- 30-60 RP (HIGHER)
    v_coin_play_rp := 40 + FLOOR(RANDOM() * 41); -- 40-80 RP (HIGHEST - coin play generates revenue)
    v_score_rp := 25 + FLOOR(RANDOM() * 21); -- 25-45 RP
    v_games_rp := 20 + FLOOR(RANDOM() * 21); -- 20-40 RP
    v_visit_page_rp := 10 + FLOOR(RANDOM() * 11); -- 10-20 RP
    v_visit_category_rp := 15 + FLOOR(RANDOM() * 11); -- 15-25 RP
    v_specific_game_rp := 20 + FLOOR(RANDOM() * 16); -- 20-35 RP
    
    -- Generate random target values
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
        -- Coin Play games (HIGHEST RP - generates revenue, counts double)
        (
            v_today, 
            'play_coin_play', 
            'Coin Play Master', 
            'Play ' || v_coin_play_games::TEXT || ' coin play games today (counts double for other challenges)', 
            v_coin_play_games, 
            100 + FLOOR(RANDOM() * 50), 
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
    ON CONFLICT (challenge_date, challenge_type) DO NOTHING;
    
    RAISE NOTICE '✅ Daily challenges generated for %', v_today;
END;
$$;

-- ============================================================================
-- 3. UPDATE WEEKLY CHALLENGE GENERATION WITH COIN PLAY
-- ============================================================================
-- Require 4 coin play games, count double, higher RP

CREATE OR REPLACE FUNCTION public.generate_weekly_challenges(p_week_start DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_coin_play_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
    v_win_rp INTEGER;
    v_xp_rp INTEGER;
    v_visit_page_rp INTEGER;
    v_visit_category_rp INTEGER;
    v_specific_game_rp INTEGER;
BEGIN
    -- Delete old challenges for this week (to regenerate)
    DELETE FROM public.weekly_challenges WHERE week_start_date = p_week_start;

    -- Generate varied RP rewards
    -- Practice: 30-60 RP (LOWER - free games)
    -- Competition: 100-200 RP (HIGHER - paid games)
    -- Coin Play: 150-300 RP (HIGHEST - generates revenue, so we can afford more RP)
    -- Score: 80-120 RP
    -- Games count: 120-180 RP
    -- Win competition: 150-250 RP (HIGHEST - paid wins)
    -- Total XP: 100-150 RP
    -- Page visits: 50-80 RP
    -- Category visits: 60-100 RP
    -- Specific game: 80-120 RP
    
    v_practice_rp := 30 + FLOOR(RANDOM() * 31); -- 30-60 RP (LOWER)
    v_competition_rp := 100 + FLOOR(RANDOM() * 101); -- 100-200 RP (HIGHER)
    v_coin_play_rp := 150 + FLOOR(RANDOM() * 151); -- 150-300 RP (HIGHEST - coin play generates revenue)
    v_score_rp := 80 + FLOOR(RANDOM() * 41); -- 80-120 RP
    v_games_rp := 120 + FLOOR(RANDOM() * 61); -- 120-180 RP
    v_win_rp := 150 + FLOOR(RANDOM() * 101); -- 150-250 RP (HIGHEST)
    v_xp_rp := 100 + FLOOR(RANDOM() * 51); -- 100-150 RP
    v_visit_page_rp := 50 + FLOOR(RANDOM() * 31); -- 50-80 RP
    v_visit_category_rp := 60 + FLOOR(RANDOM() * 41); -- 60-100 RP
    v_specific_game_rp := 80 + FLOOR(RANDOM() * 41); -- 80-120 RP

    -- Generate weekly challenges with focus on paid games and coin play
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
        -- Coin Play games (HIGHEST RP - generates revenue, counts double)
        (
            p_week_start, 
            'play_coin_play', 
            'Weekly Coin Play Champion', 
            'Play 4 coin play games this week (counts double for other challenges)', 
            4, 
            500 + FLOOR(RANDOM() * 300), 
            v_coin_play_rp, 
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
    ON CONFLICT (week_start_date, challenge_type) DO NOTHING;
    
    RAISE NOTICE '✅ Weekly challenges generated for week starting %', p_week_start;
END;
$$;

-- ============================================================================
-- 4. UPDATE CHALLENGE PROGRESS FUNCTIONS TO HANDLE COIN PLAY
-- ============================================================================

-- Update the function to detect coin play games and count them double
CREATE OR REPLACE FUNCTION public.update_challenges_on_game_complete(
    p_user_id UUID,
    p_game_type TEXT,
    p_score INTEGER,
    p_is_practice BOOLEAN,
    p_is_coin_play BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_type TEXT;
    v_increment INTEGER;
BEGIN
    -- Determine challenge type and increment amount
    IF p_is_coin_play THEN
        v_challenge_type := 'play_coin_play';
        v_increment := 1; -- Count as 1 for coin play challenge itself
    ELSIF p_is_practice THEN
        v_challenge_type := 'play_practice';
        v_increment := 1;
    ELSE
        v_challenge_type := 'play_competition';
        v_increment := 1;
    END IF;
    
    -- Update coin play challenge if it's a coin play game
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'play_coin_play',
            1
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'play_coin_play',
            1
        );
    END IF;
    
    -- Update practice or competition game challenges
    PERFORM public.update_daily_challenge_progress(
        p_user_id,
        v_challenge_type,
        v_increment
    );
    
    PERFORM public.update_weekly_challenge_progress(
        p_user_id,
        v_challenge_type,
        v_increment
    );
    
    -- Update games_count challenge (coin play counts double)
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'games_count',
            2 -- Coin play counts double
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'games_count',
            2 -- Coin play counts double
        );
    ELSE
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'games_count',
            1
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'games_count',
            1
        );
    END IF;
    
    -- Update score_threshold challenge (cumulative score) - only for competition/coin play games
    IF NOT p_is_practice THEN
        -- Daily score challenge - add score to progress
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score -- Add the score amount
        );
        
        -- Weekly score challenge - add score to progress
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score -- Add the score amount
        );
    END IF;
    
    -- Update play_specific_game challenge (coin play counts double)
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'play_specific_game',
            2 -- Coin play counts double
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'play_specific_game',
            2 -- Coin play counts double
        );
    ELSE
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'play_specific_game',
            1
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'play_specific_game',
            1
        );
    END IF;
END;
$$;

-- ============================================================================
-- 5. UPDATE TRIGGER TO DETECT COIN PLAY GAMES
-- ============================================================================

-- Update trigger function to detect coin play games
CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_coin_play BOOLEAN;
BEGIN
    -- Only process if this is a new game record
    IF TG_OP = 'INSERT' THEN
        -- Detect coin play games by checking if session_id references coin_play_sessions
        -- OR by checking metadata for coin_play flag
        -- OR by checking if listing_id/session_id matches coin play pattern
        v_is_coin_play := false;
        
        -- Check if this is a coin play game
        -- Method 1: Check metadata
        IF NEW.metadata IS NOT NULL AND (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
            v_is_coin_play := true;
        END IF;
        
        -- Method 2: Check if session_id exists in coin_play_sessions
        IF NEW.session_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.coin_play_sessions 
                WHERE id::TEXT = NEW.session_id
            ) INTO v_is_coin_play;
        END IF;
        
        -- Method 3: Check if listing_id references coin play (if coin play uses listing_id)
        -- This would need to be adjusted based on your actual coin play implementation
        
        -- Update challenges based on game completion
        PERFORM public.update_challenges_on_game_complete(
            NEW.user_id,
            NEW.game_type,
            COALESCE(NEW.score, 0)::INTEGER,
            COALESCE(NEW.session_type = 'practice', false),
            v_is_coin_play
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CHALLENGES UPDATED FOR COIN PLAY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🪙 COIN PLAY CHALLENGES:';
    RAISE NOTICE '   Daily: Play 4 coin play games (40-80 RP)';
    RAISE NOTICE '   Weekly: Play 4 coin play games (150-300 RP)';
    RAISE NOTICE '   Coin play games count DOUBLE for other challenges';
    RAISE NOTICE '';
    RAISE NOTICE '💰 RP ECONOMICS:';
    RAISE NOTICE '   Coin play generates $0.25 per game';
    RAISE NOTICE '   4 games = $1.00 revenue';
    RAISE NOTICE '   Higher RP payouts justified by revenue';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHALLENGE UPDATES:';
    RAISE NOTICE '   Coin play games count 2x for games_count';
    RAISE NOTICE '   Coin play games count 2x for play_specific_game';
    RAISE NOTICE '   Coin play scores count toward score_threshold';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenges Updated for Coin Play!' as status;

