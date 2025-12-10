-- ============================================================================
-- UPDATE CHALLENGES FOR PAID GAMES & PAGE VISITS
-- ============================================================================
-- Prioritizes competition games (paid), lowers practice RP, adds page/category visits
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW CHALLENGE TYPES TO SCHEMA
-- ============================================================================

-- Update daily_challenges table to allow new challenge types
ALTER TABLE public.daily_challenges 
DROP CONSTRAINT IF EXISTS daily_challenges_challenge_type_check;

ALTER TABLE public.daily_challenges
ADD CONSTRAINT daily_challenges_challenge_type_check 
CHECK (challenge_type IN (
    'play_practice', 'play_competition', 'score_threshold', 
    'games_count', 'win_competition', 'perfect_score',
    'visit_page', 'visit_category', 'play_specific_game'
));

-- Update weekly_challenges table to allow new challenge types
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
-- 2. CREATE PAGE VISIT TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_page_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    page_path TEXT NOT NULL,
    page_type TEXT, -- 'category', 'game', 'shop', 'other'
    category_id TEXT, -- For category pages
    game_type TEXT, -- For game pages
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    visit_date DATE GENERATED ALWAYS AS (DATE(visited_at)) STORED
);

-- Create unique index on user_id, page_path, and visit_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_page_visits_unique 
ON public.user_page_visits(user_id, page_path, visit_date);

CREATE INDEX IF NOT EXISTS idx_user_page_visits_user_id ON public.user_page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_page_visits_date ON public.user_page_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_user_page_visits_type ON public.user_page_visits(page_type);

-- ============================================================================
-- 3. FUNCTION TO TRACK PAGE VISITS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.track_page_visit(
    p_user_id UUID,
    p_page_path TEXT,
    p_page_type TEXT DEFAULT NULL,
    p_category_id TEXT DEFAULT NULL,
    p_game_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Insert visit (ON CONFLICT handles duplicate visits on same day)
    INSERT INTO public.user_page_visits (
        user_id, 
        page_path, 
        page_type, 
        category_id, 
        game_type
    )
    VALUES (
        p_user_id,
        p_page_path,
        p_page_type,
        p_category_id,
        p_game_type
    )
    ON CONFLICT (user_id, page_path, visit_date) DO NOTHING;
    
    -- Update daily challenge progress for page visit challenges
    PERFORM public.update_daily_challenge_progress(
        p_user_id,
        'visit_page',
        1
    );
    
    -- Update weekly challenge progress
    PERFORM public.update_weekly_challenge_progress(
        p_user_id,
        'visit_page',
        1
    );
    
    -- If it's a category page, also update category visit challenge
    IF p_page_type = 'category' AND p_category_id IS NOT NULL THEN
        PERFORM public.update_daily_challenge_progress(
            p_user_id,
            'visit_category',
            1
        );
        
        PERFORM public.update_weekly_challenge_progress(
            p_user_id,
            'visit_category',
            1
        );
    END IF;
    
    -- If it's a game page, update specific game challenge
    IF p_page_type = 'game' AND p_game_type IS NOT NULL THEN
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
-- 4. UPDATE DAILY CHALLENGE GENERATION
-- ============================================================================
-- Lower practice RP (5-15 RP), Higher competition RP (30-60 RP)
-- Add page visit and category visit challenges

CREATE OR REPLACE FUNCTION public.generate_daily_challenges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
    v_visit_page_rp INTEGER;
    v_visit_category_rp INTEGER;
    v_specific_game_rp INTEGER;
    v_practice_games INTEGER;
    v_competition_games INTEGER;
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
    -- Score: 25-45 RP (skill-based)
    -- Games count: 20-40 RP (engagement)
    -- Page visits: 10-20 RP (engagement)
    -- Category visits: 15-25 RP (discovery)
    -- Specific game: 20-35 RP (targeted engagement)
    
    v_practice_rp := 5 + FLOOR(RANDOM() * 11); -- 5-15 RP (LOWER)
    v_competition_rp := 30 + FLOOR(RANDOM() * 31); -- 30-60 RP (HIGHER)
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

    -- Generate daily challenges with focus on paid games
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
-- 5. UPDATE WEEKLY CHALLENGE GENERATION
-- ============================================================================
-- Lower practice RP (30-60 RP), Higher competition RP (100-200 RP)
-- Add page visit and category visit challenges

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
    -- Delete old challenges for this week (to regenerate)
    DELETE FROM public.weekly_challenges WHERE week_start_date = p_week_start;

    -- Generate varied RP rewards
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

    -- Generate weekly challenges with focus on paid games
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
        -- Score threshold (competition games)
        (
            p_week_start, 
            'score_threshold', 
            'Weekly Score Master', 
            'Score ' || (5000 + FLOOR(RANDOM() * 3000))::TEXT || '+ points total in competition games this week', 
            5000 + FLOOR(RANDOM() * 3000), 
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
-- 6. UPDATE CHALLENGE PROGRESS FUNCTIONS
-- ============================================================================

-- Update daily challenge progress to handle new challenge types
CREATE OR REPLACE FUNCTION public.update_daily_challenge_progress(
    p_user_id UUID,
    p_challenge_type TEXT,
    p_progress_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    -- Find today's challenge of this type
    SELECT id, target_value, xp_reward, reward_points INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.daily_challenges
    WHERE challenge_date = CURRENT_DATE
    AND challenge_type = p_challenge_type
    AND is_active = true
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge not found');
    END IF;

    -- Get or create progress record
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value)
    VALUES (p_user_id, v_challenge_id, 0, v_target_value)
    ON CONFLICT (user_id, challenge_id) DO NOTHING;

    -- Get current progress
    SELECT progress, is_completed INTO v_current_progress, v_is_completed
    FROM public.user_daily_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    IF v_is_completed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge already completed');
    END IF;

    -- Update progress
    v_new_progress := LEAST(v_current_progress + p_progress_increment, v_target_value);
    v_is_completed := v_new_progress >= v_target_value;

    UPDATE public.user_daily_challenges
    SET 
        progress = v_new_progress,
        is_completed = v_is_completed,
        completed_at = CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    -- Award rewards if completed
    IF v_is_completed THEN
        -- Award XP
        UPDATE public.user_xp
        SET total_xp = total_xp + v_xp_reward,
            reward_points = reward_points + v_reward_points,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        -- Record XP transaction
        INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type);

        -- Record RP transaction
        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');

        UPDATE public.user_daily_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
END;
$$;

-- Update weekly challenge progress to handle new challenge types
CREATE OR REPLACE FUNCTION public.update_weekly_challenge_progress(
    p_user_id UUID,
    p_challenge_type TEXT,
    p_progress_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
BEGIN
    -- Calculate Monday of current week
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Find this week's challenge of this type
    SELECT id, target_value, xp_reward, reward_points INTO v_challenge_id, v_target_value, v_xp_reward, v_reward_points
    FROM public.weekly_challenges
    WHERE week_start_date = v_week_start
    AND challenge_type = p_challenge_type
    AND is_active = true
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge not found');
    END IF;

    -- Get or create progress record
    INSERT INTO public.user_weekly_challenges (user_id, challenge_id, progress, target_value)
    VALUES (p_user_id, v_challenge_id, 0, v_target_value)
    ON CONFLICT (user_id, challenge_id) DO NOTHING;

    -- Get current progress
    SELECT progress, is_completed INTO v_current_progress, v_is_completed
    FROM public.user_weekly_challenges
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    IF v_is_completed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Challenge already completed');
    END IF;

    -- Update progress
    v_new_progress := LEAST(v_current_progress + p_progress_increment, v_target_value);
    v_is_completed := v_new_progress >= v_target_value;

    UPDATE public.user_weekly_challenges
    SET 
        progress = v_new_progress,
        is_completed = v_is_completed,
        completed_at = CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND challenge_id = v_challenge_id;

    -- Award rewards if completed
    IF v_is_completed THEN
        -- Award XP
        UPDATE public.user_xp
        SET total_xp = total_xp + v_xp_reward,
            reward_points = reward_points + v_reward_points,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        -- Record XP transaction
        INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Weekly challenge: ' || p_challenge_type);

        -- Record RP transaction
        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward');

        UPDATE public.user_weekly_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_completed', v_is_completed,
        'progress', v_new_progress,
        'target', v_target_value,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'rp_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
END;
$$;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON public.user_page_visits TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_page_visit(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 8. RLS POLICIES FOR PAGE VISITS
-- ============================================================================

ALTER TABLE public.user_page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own page visits" ON public.user_page_visits;
DROP POLICY IF EXISTS "Users can insert own page visits" ON public.user_page_visits;

CREATE POLICY "Users can view own page visits" ON public.user_page_visits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own page visits" ON public.user_page_visits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CHALLENGES UPDATED FOR PAID GAMES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📅 DAILY CHALLENGES:';
    RAISE NOTICE '   Practice Games: 5-15 RP (LOWER - free)';
    RAISE NOTICE '   Competition Games: 30-60 RP (HIGHER - paid)';
    RAISE NOTICE '   Page Visits: 10-20 RP';
    RAISE NOTICE '   Category Visits: 15-25 RP';
    RAISE NOTICE '   Specific Games: 20-35 RP';
    RAISE NOTICE '';
    RAISE NOTICE '📆 WEEKLY CHALLENGES:';
    RAISE NOTICE '   Practice Games: 30-60 RP (LOWER - free)';
    RAISE NOTICE '   Competition Games: 100-200 RP (HIGHER - paid)';
    RAISE NOTICE '   Win Competition: 150-250 RP (HIGHEST - paid wins)';
    RAISE NOTICE '   Page Visits: 50-80 RP';
    RAISE NOTICE '   Category Visits: 60-100 RP';
    RAISE NOTICE '   Specific Games: 80-120 RP';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 AUTO-ROTATION:';
    RAISE NOTICE '   Daily challenges regenerate each day';
    RAISE NOTICE '   Weekly challenges regenerate each Monday';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenges Updated for Paid Games & Page Visits!' as status;

