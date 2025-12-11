-- ============================================================================
-- FIX CHALLENGE REGENERATION ISSUE + UPDATE DAILY CHALLENGES
-- ============================================================================
-- Prevents challenges from regenerating on every refresh
-- Only generates challenges if they don't exist for today
-- Updates: 1v1 challenge, Winner Takes All challenge, Lower RP payouts
-- ============================================================================

-- ============================================================================
-- 0. ADD NEW CHALLENGE TYPES
-- ============================================================================

-- Update daily_challenges table to allow new challenge types
ALTER TABLE public.daily_challenges 
DROP CONSTRAINT IF EXISTS daily_challenges_challenge_type_check;

ALTER TABLE public.daily_challenges
ADD CONSTRAINT daily_challenges_challenge_type_check 
CHECK (challenge_type IN (
    'play_practice', 'play_competition', 'play_1v1', 'play_winner_takes_all',
    'score_threshold', 'games_count', 'win_competition', 'perfect_score',
    'visit_page', 'visit_category', 'play_specific_game', 'play_coin_play'
));

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

    -- Generate varied RP rewards (SLIGHTLY LOWER)
    -- Practice: 4-12 RP (LOWER - free games, reduced from 5-15)
    -- 1v1: 20-40 RP (MEDIUM - paid games, reduced from 30-60)
    -- Winner Takes All: 25-45 RP (MEDIUM-HIGH - paid games, reduced from 30-60)
    -- Coin Play: 8-16 RP (LOWER - separate challenge, reduced from 10-20)
    -- Score: 20-35 RP (skill-based, reduced from 25-45)
    -- Games count: 15-30 RP (engagement, reduced from 20-40)
    -- Page visits: 8-15 RP (engagement, reduced from 10-20)
    -- Category visits: 12-20 RP (discovery, reduced from 15-25)
    -- Specific game: 15-28 RP (targeted engagement, reduced from 20-35)
    
    v_practice_rp := 4 + FLOOR(RANDOM() * 9); -- 4-12 RP (LOWER, reduced)
    v_competition_rp := 20 + FLOOR(RANDOM() * 21); -- 20-40 RP (MEDIUM, reduced) - for 1v1
    v_coin_play_rp := 8 + FLOOR(RANDOM() * 9); -- 8-16 RP (LOWER, reduced)
    v_score_rp := 20 + FLOOR(RANDOM() * 16); -- 20-35 RP (reduced)
    v_games_rp := 15 + FLOOR(RANDOM() * 16); -- 15-30 RP (reduced)
    v_visit_page_rp := 8 + FLOOR(RANDOM() * 8); -- 8-15 RP (reduced)
    v_visit_category_rp := 12 + FLOOR(RANDOM() * 9); -- 12-20 RP (reduced)
    v_specific_game_rp := 15 + FLOOR(RANDOM() * 14); -- 15-28 RP (reduced)
    
    -- Generate random target values (only once per day)
    v_practice_games := 2 + FLOOR(RANDOM() * 3); -- 2-4 games
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
        -- 1v1 games (MEDIUM RP - paid, fixed at 1 game)
        (
            v_today, 
            'play_1v1', 
            '1v1 Battle', 
            'Play 1 1v1 game today', 
            1, 
            50 + FLOOR(RANDOM() * 30), 
            v_competition_rp, 
            true
        ),
        -- Winner Takes All games (MEDIUM-HIGH RP - paid, fixed at 1 game)
        (
            v_today, 
            'play_winner_takes_all', 
            'Winner Takes All', 
            'Play 1 Winner Takes All game today', 
            1, 
            60 + FLOOR(RANDOM() * 30), 
            25 + FLOOR(RANDOM() * 21), -- 25-45 RP (slightly higher than 1v1)
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
-- 3. UPDATE update_challenges_on_game_complete TO DETECT 1V1 AND WTA GAMES
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
    v_coin_play_progress INTEGER;
    v_coin_play_target INTEGER;
    v_coin_play_challenge_id UUID;
    v_is_1v1 BOOLEAN;
    v_is_wta BOOLEAN;
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
    ELSE
        v_challenge_type := 'play_competition';
        v_increment := 1;
    END IF;
    
    -- Update coin play challenge if it's a coin play game (DAILY ONLY)
    IF p_is_coin_play THEN
        -- Get current coin play progress BEFORE updating
        SELECT udc.progress, dc.target_value, dc.id 
        INTO v_coin_play_progress, v_coin_play_target, v_coin_play_challenge_id
        FROM public.user_daily_challenges udc
        JOIN public.daily_challenges dc ON udc.challenge_id = dc.id
        WHERE udc.user_id = p_user_id
        AND dc.challenge_date = CURRENT_DATE
        AND dc.challenge_type = 'play_coin_play'
        AND dc.is_active = true
        LIMIT 1;
        
        -- Update coin play progress
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'play_coin_play',
            1
        );
        
        -- If coin play challenge exists and progress will be divisible by 4, count as 1 competitive game
        IF v_coin_play_challenge_id IS NOT NULL AND (COALESCE(v_coin_play_progress, 0) + 1) % 4 = 0 THEN
            PERFORM public.update_daily_challenge_progress(
                p_user_id,
                'play_competition',
                1
            );
        END IF;
    END IF;
    
    -- Update specific challenge type (practice, 1v1, WTA, or general competition)
    IF NOT p_is_coin_play THEN
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
    END IF;
    
    -- Update games_count challenge
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
    
    -- Update score_threshold challenge (cumulative score) - only for competition/coin play/1v1/WTA games
    IF NOT p_is_practice THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'score_threshold',
            p_score
        );
    END IF;
    
    -- Update play_specific_game challenge
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
END;
$$;

-- ============================================================================
-- 4. UPDATE TRIGGER TO DETECT 1V1 AND WTA GAMES
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

