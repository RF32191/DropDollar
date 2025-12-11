-- ============================================================================
-- UPDATE CHALLENGES FOR COIN PLAY GAMES
-- ============================================================================
-- Adds coin play requirements for daily challenges only
-- 4 coin play games count as 1 competitive game (not double)
-- Lower RP rewards for coin play (separate from other challenges)
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

-- Weekly challenges do NOT include coin play (separate daily-only challenge)
-- Keep existing constraint without coin_play
ALTER TABLE public.weekly_challenges 
DROP CONSTRAINT IF EXISTS weekly_challenges_challenge_type_check;

ALTER TABLE public.weekly_challenges
ADD CONSTRAINT weekly_challenges_challenge_type_check 
CHECK (challenge_type IN (
    'play_practice', 'play_competition', 'score_threshold', 
    'games_count', 'win_competition', 'perfect_score', 'total_xp', 'level_up',
    'visit_page', 'visit_category', 'play_specific_game'
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

-- Update the function: 4 coin play games = 1 competitive game (not double)
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
    v_coin_play_progress INTEGER;
    v_coin_play_target INTEGER;
    v_coin_play_challenge_id UUID;
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
        -- After update, progress will be (v_coin_play_progress + 1)
        IF v_coin_play_challenge_id IS NOT NULL AND (COALESCE(v_coin_play_progress, 0) + 1) % 4 = 0 THEN
            PERFORM public.update_daily_challenge_progress(
                p_user_id,
                'play_competition',
                1 -- 4 coin play games = 1 competitive game
            );
        END IF;
        
        -- NO weekly coin play challenge
    END IF;
    
    -- Update practice or competition game challenges (only if NOT coin play, since coin play is handled above)
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
    
    -- Update games_count challenge (coin play counts as 1 game, not double)
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'games_count',
            1 -- Coin play counts as 1 game
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'games_count',
            1 -- Coin play counts as 1 game
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
    
    -- Update play_specific_game challenge (coin play counts as 1, not double)
    IF p_is_coin_play THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'play_specific_game',
            1 -- Coin play counts as 1 game
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'play_specific_game',
            1 -- Coin play counts as 1 game
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
        -- Detect coin play games
        v_is_coin_play := false;
        
        -- Method 1: Check metadata for coin_play flag (most reliable)
        IF NEW.metadata IS NOT NULL THEN
            IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                v_is_coin_play := true;
            END IF;
        END IF;
        
        -- Method 2: Check if listing_id matches coin play pattern (starts with 'cp-')
        IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
            IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                v_is_coin_play := true;
            END IF;
        END IF;
        
        -- Method 3: Check if user has a recent coin_play_participants record (within last 5 minutes)
        -- This catches coin play games that were saved to game_history separately
        IF NOT v_is_coin_play THEN
            SELECT EXISTS (
                SELECT 1 FROM public.coin_play_participants cp
                JOIN public.coin_play_sessions cs ON cp.session_id = cs.id
                WHERE cp.user_id = NEW.user_id
                AND cp.completed_at IS NOT NULL
                AND cp.completed_at > NOW() - INTERVAL '5 minutes'
                AND cs.game_type = NEW.game_type
            ) INTO v_is_coin_play;
        END IF;
        
        -- Update challenges based on game completion
        PERFORM public.update_challenges_on_game_complete(
            NEW.user_id,
            NEW.game_type,
            COALESCE(NEW.score, 0)::INTEGER,
            COALESCE(NEW.is_practice, false),
            v_is_coin_play
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. UPDATE COIN PLAY SCORE FUNCTION TO SAVE TO GAME_HISTORY
-- ============================================================================
-- Modify update_coin_play_score to also save to game_history with coin play flag

CREATE OR REPLACE FUNCTION public.update_coin_play_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC DEFAULT 95.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_status TEXT;
    v_participant_exists BOOLEAN;
    v_game_type TEXT;
    v_config_id TEXT;
BEGIN
    -- Check if session exists and get status
    SELECT status, config_id INTO v_session_status, v_config_id
    FROM public.coin_play_sessions
    WHERE id = session_id_param;

    IF v_session_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Session not found',
            'error_code', 'SESSION_NOT_FOUND'
        );
    END IF;

    -- Allow score submission for 'waiting', 'active', or 'completed' sessions
    IF v_session_status NOT IN ('waiting', 'active', 'completed') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Session status is invalid: ' || COALESCE(v_session_status, 'NULL'),
            'error_code', 'SESSION_INVALID_STATUS'
        );
    END IF;

    -- Check if user is a participant
    SELECT EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) INTO v_participant_exists;

    IF NOT v_participant_exists THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'User not in this session',
            'error_code', 'USER_NOT_PARTICIPANT'
        );
    END IF;

    -- Get game type from config
    SELECT game_type INTO v_game_type
    FROM public.coin_play_configs
    WHERE id = v_config_id;

    -- Update score in coin_play_participants
    UPDATE public.coin_play_participants
    SET 
        score = score_param,
        completed_at = COALESCE(completed_at, NOW())
    WHERE session_id = session_id_param AND user_id = user_id_param;

    -- Verify update succeeded
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Failed to update score',
            'error_code', 'UPDATE_FAILED'
        );
    END IF;

    -- Save to game_history with coin play flag (if table exists and has required columns)
    BEGIN
        INSERT INTO public.game_history (
            user_id,
            game_type,
            score,
            accuracy,
            is_practice,
            is_competition,
            tokens_wagered,
            metadata,
            created_at
        )
        VALUES (
            user_id_param,
            v_game_type,
            score_param,
            accuracy_param,
            false, -- Coin play is competition, not practice
            true,  -- Coin play is competition
            0.25,  -- Entry fee is 0.25 tokens
            jsonb_build_object('is_coin_play', true, 'session_id', session_id_param::TEXT, 'config_id', v_config_id),
            NOW()
        )
        ON CONFLICT DO NOTHING; -- Don't fail if there's a conflict
    EXCEPTION WHEN OTHERS THEN
        -- If game_history doesn't exist or has different schema, just log and continue
        RAISE NOTICE 'Could not save to game_history: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Score updated successfully',
        'score', score_param
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Database error: ' || SQLERRM,
            'error_code', 'DATABASE_ERROR'
        );
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
    RAISE NOTICE '   Daily: Play 4 coin play games (10-20 RP) - SEPARATE CHALLENGE';
    RAISE NOTICE '   Weekly: NO coin play challenges (removed)';
    RAISE NOTICE '   4 coin play games = 1 competitive game (not double)';
    RAISE NOTICE '';
    RAISE NOTICE '💰 RP ECONOMICS:';
    RAISE NOTICE '   Coin play generates $0.25 per game';
    RAISE NOTICE '   4 games = $1.00 revenue';
    RAISE NOTICE '   Lower RP rewards (10-20 RP) for separate daily challenge';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHALLENGE UPDATES:';
    RAISE NOTICE '   Coin play games count as 1 for games_count (not double)';
    RAISE NOTICE '   Coin play games count as 1 for play_specific_game (not double)';
    RAISE NOTICE '   4 coin play games = 1 competitive game';
    RAISE NOTICE '   Coin play scores count toward score_threshold';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenges Updated for Coin Play!' as status;

