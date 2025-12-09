-- ============================================================================
-- LEVEL UP SYSTEM - COMPLETE SCHEMA
-- ============================================================================
-- Creates XP, levels, daily challenges, rankings, and reward points system
-- GitHub: https://github.com/RF32191/DropDollar/blob/main/CREATE_LEVEL_UP_SYSTEM.sql
-- Raw: https://raw.githubusercontent.com/RF32191/DropDollar/main/CREATE_LEVEL_UP_SYSTEM.sql
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎮 CREATING LEVEL UP SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- 1. USER XP & LEVELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
    current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
    xp_to_next_level INTEGER DEFAULT 100,
    reward_points INTEGER DEFAULT 0 CHECK (reward_points >= 0),
    total_games_played INTEGER DEFAULT 0,
    practice_games_played INTEGER DEFAULT 0,
    competition_games_played INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON public.user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_level ON public.user_xp(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);

-- ============================================================================
-- 2. XP TRANSACTIONS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'practice_game', 'competition_game', 'daily_challenge', 
        'achievement', 'bonus', 'purchase', 'admin_adjustment'
    )),
    source_id UUID, -- game_history id, challenge id, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON public.xp_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);

-- ============================================================================
-- 3. RANKINGS & TITLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rank_title TEXT NOT NULL,
    rank_tier INTEGER NOT NULL CHECK (rank_tier >= 1 AND rank_tier <= 10),
    rank_image_url TEXT,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_rankings_user_id ON public.user_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rankings_tier ON public.user_rankings(rank_tier DESC);

-- ============================================================================
-- 4. DAILY CHALLENGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'play_practice', 'play_competition', 'score_threshold', 
        'games_count', 'win_competition', 'perfect_score'
    )),
    challenge_name TEXT NOT NULL,
    challenge_description TEXT NOT NULL,
    target_value INTEGER NOT NULL, -- e.g., play 5 games, score 1000 points
    xp_reward INTEGER NOT NULL DEFAULT 50,
    reward_points INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_date, challenge_type)
);

-- ============================================================================
-- 4B. WEEKLY CHALLENGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL, -- Monday of the week
    challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'play_practice', 'play_competition', 'score_threshold', 
        'games_count', 'win_competition', 'perfect_score', 'total_xp', 'level_up'
    )),
    challenge_name TEXT NOT NULL,
    challenge_description TEXT NOT NULL,
    target_value INTEGER NOT NULL, -- e.g., play 20 games, score 5000 points
    xp_reward INTEGER NOT NULL DEFAULT 200,
    reward_points INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week_start_date, challenge_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(challenge_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_active ON public.daily_challenges(is_active) WHERE is_active = true;

-- ============================================================================
-- 5. USER DAILY CHALLENGE PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0),
    target_value INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    xp_awarded INTEGER DEFAULT 0,
    reward_points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- ============================================================================
-- 5B. USER WEEKLY CHALLENGE PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0),
    target_value INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    xp_awarded INTEGER DEFAULT 0,
    reward_points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user_id ON public.user_daily_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_challenge_id ON public.user_daily_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_completed ON public.user_daily_challenges(is_completed) WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_week_start ON public.weekly_challenges(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_active ON public.weekly_challenges(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_weekly_challenges_user_id ON public.user_weekly_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_weekly_challenges_challenge_id ON public.user_weekly_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_weekly_challenges_completed ON public.user_weekly_challenges(is_completed) WHERE is_completed = true;

-- ============================================================================
-- 6. REWARD POINTS TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points_amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'earned', 'spent', 'expired', 'bonus', 'admin_adjustment'
    )),
    source_id UUID, -- challenge id, purchase id, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_points_user_id ON public.reward_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_points_type ON public.reward_points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_points_created_at ON public.reward_points_transactions(created_at DESC);

-- ============================================================================
-- 7. RANKING TIERS DEFINITION (Reference Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ranking_tiers (
    tier INTEGER PRIMARY KEY CHECK (tier >= 1 AND tier <= 10),
    title TEXT NOT NULL,
    min_level INTEGER NOT NULL,
    min_xp INTEGER NOT NULL,
    image_url TEXT,
    color_hex TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default ranking tiers
INSERT INTO public.ranking_tiers (tier, title, min_level, min_xp, color_hex, description) VALUES
(1, 'Novice', 1, 0, '#9CA3AF', 'Just starting your journey'),
(2, 'Rookie', 5, 500, '#60A5FA', 'Getting the hang of it'),
(3, 'Apprentice', 10, 2000, '#34D399', 'Showing promise'),
(4, 'Warrior', 15, 5000, '#FBBF24', 'A true competitor'),
(5, 'Veteran', 20, 10000, '#F87171', 'Experienced and skilled'),
(6, 'Elite', 25, 20000, '#A78BFA', 'Among the best'),
(7, 'Master', 30, 40000, '#FB7185', 'Master of the games'),
(8, 'Legend', 35, 70000, '#FCD34D', 'A living legend'),
(9, 'Mythic', 40, 120000, '#EC4899', 'Mythical status achieved'),
(10, 'Immortal', 50, 200000, '#8B5CF6', 'The ultimate achievement')
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- 8. FUNCTIONS
-- ============================================================================

-- Function to calculate XP needed for next level
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Exponential growth: 100 * level^1.5
    RETURN FLOOR(100 * POWER(level, 1.5))::INTEGER;
END;
$$;

-- Function to award XP
CREATE OR REPLACE FUNCTION public.award_xp(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_transaction_type TEXT,
    p_source_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_xp INTEGER;
    v_current_level INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_xp_to_next INTEGER;
    v_leveled_up BOOLEAN := false;
    v_old_level INTEGER;
    v_xp_at_current_level INTEGER := 0;
    v_temp_level INTEGER;
    v_remaining_xp INTEGER;
BEGIN
    -- Get or create user XP record
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level)
    VALUES (p_user_id, 0, 1, 100)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get current XP and level
    SELECT total_xp, current_level INTO v_current_xp, v_current_level
    FROM public.user_xp
    WHERE user_id = p_user_id;

    -- Calculate new XP
    v_new_xp := v_current_xp + p_xp_amount;
    v_old_level := v_current_level;
    v_new_level := v_current_level;

    -- Calculate cumulative XP needed for all levels up to current level
    v_temp_level := 1;
    WHILE v_temp_level < v_current_level LOOP
        v_xp_at_current_level := v_xp_at_current_level + public.calculate_xp_for_level(v_temp_level);
        v_temp_level := v_temp_level + 1;
    END LOOP;
    
    -- Calculate remaining XP after reaching current level
    v_remaining_xp := v_new_xp - v_xp_at_current_level;
    v_xp_to_next := public.calculate_xp_for_level(v_new_level);
    
    -- Check for level ups
    WHILE v_remaining_xp >= v_xp_to_next LOOP
        v_remaining_xp := v_remaining_xp - v_xp_to_next;
        v_new_level := v_new_level + 1;
        v_xp_to_next := public.calculate_xp_for_level(v_new_level);
        v_leveled_up := true;
    END LOOP;

    -- Update user XP
    UPDATE public.user_xp
    SET 
        total_xp = v_new_xp,
        current_level = v_new_level,
        xp_to_next_level = v_xp_to_next - v_remaining_xp,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record XP transaction
    INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
    VALUES (p_user_id, p_xp_amount, p_transaction_type, p_source_id, p_description);

    -- Update ranking if leveled up
    IF v_leveled_up THEN
        PERFORM public.update_user_ranking(p_user_id);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'old_level', v_old_level,
        'new_level', v_new_level,
        'old_xp', v_current_xp,
        'new_xp', v_new_xp,
        'xp_to_next', v_xp_to_next - v_remaining_xp,
        'leveled_up', v_leveled_up
    );
END;
$$;

-- Function to update user ranking based on level/XP
CREATE OR REPLACE FUNCTION public.update_user_ranking(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level INTEGER;
    v_total_xp INTEGER;
    v_tier INTEGER;
    v_title TEXT;
    v_image_url TEXT;
BEGIN
    -- Get user's level and XP
    SELECT current_level, total_xp INTO v_level, v_total_xp
    FROM public.user_xp
    WHERE user_id = p_user_id;

    -- Find appropriate tier
    SELECT tier, title, image_url INTO v_tier, v_title, v_image_url
    FROM public.ranking_tiers
    WHERE min_level <= v_level AND min_xp <= v_total_xp
    ORDER BY tier DESC
    LIMIT 1;

    -- Update or insert ranking
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier, rank_image_url)
    VALUES (p_user_id, v_title, v_tier, v_image_url)
    ON CONFLICT (user_id) DO UPDATE SET
        rank_title = EXCLUDED.rank_title,
        rank_tier = EXCLUDED.rank_tier,
        rank_image_url = EXCLUDED.rank_image_url;
END;
$$;

-- Function to award XP for practice game
CREATE OR REPLACE FUNCTION public.award_practice_game_xp(
    p_user_id UUID,
    p_game_history_id UUID,
    p_score INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_xp_amount INTEGER := 5; -- Fixed 5 XP for practice games, no reward points
BEGIN
    -- Fixed 5 XP for practice games (no reward points)
    RETURN public.award_xp(
        p_user_id,
        v_xp_amount,
        'practice_game',
        p_game_history_id,
        'Practice game completed'
    );
END;
$$;

-- Function to get user XP and level (creates record if doesn't exist for new users)
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
BEGIN
    -- Create XP record if it doesn't exist (for new users)
    INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next_level, reward_points)
    VALUES (p_user_id, 0, 1, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create ranking record if it doesn't exist
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier)
    VALUES (p_user_id, 'Novice', 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN QUERY
    SELECT 
        COALESCE(ux.total_xp, 0),
        COALESCE(ux.current_level, 1),
        COALESCE(ux.xp_to_next_level, 100),
        COALESCE(ux.reward_points, 0),
        COALESCE(ur.rank_title, 'Novice')::TEXT,
        COALESCE(ur.rank_tier, 1),
        ur.rank_image_url
    FROM public.user_xp ux
    LEFT JOIN public.user_rankings ur ON ux.user_id = ur.user_id
    WHERE ux.user_id = p_user_id;
END;
$$;

-- Function to get daily challenges for today
CREATE OR REPLACE FUNCTION public.get_daily_challenges(p_user_id UUID)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name TEXT,
    challenge_description TEXT,
    challenge_type TEXT,
    target_value INTEGER,
    progress INTEGER,
    xp_reward INTEGER,
    reward_points INTEGER,
    is_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure today's challenges exist
    PERFORM public.generate_daily_challenges();
    
    RETURN QUERY
    SELECT 
        dc.id,
        dc.challenge_name,
        dc.challenge_description,
        dc.challenge_type,
        dc.target_value,
        COALESCE(udc.progress, 0),
        dc.xp_reward,
        dc.reward_points,
        COALESCE(udc.is_completed, false)
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = CURRENT_DATE
    AND dc.is_active = true
    ORDER BY dc.challenge_type;
END;
$$;

-- Function to get weekly challenges for current week
CREATE OR REPLACE FUNCTION public.get_weekly_challenges(p_user_id UUID)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name TEXT,
    challenge_description TEXT,
    challenge_type TEXT,
    target_value INTEGER,
    progress INTEGER,
    xp_reward INTEGER,
    reward_points INTEGER,
    is_completed BOOLEAN,
    week_start_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
BEGIN
    -- Calculate Monday of current week
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure this week's challenges exist
    PERFORM public.generate_weekly_challenges(v_week_start);
    
    RETURN QUERY
    SELECT 
        wc.id,
        wc.challenge_name,
        wc.challenge_description,
        wc.challenge_type,
        wc.target_value,
        COALESCE(uwc.progress, 0),
        wc.xp_reward,
        wc.reward_points,
        COALESCE(uwc.is_completed, false),
        wc.week_start_date
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.is_active = true
    ORDER BY wc.challenge_type;
END;
$$;

-- Function to generate daily challenges for today
CREATE OR REPLACE FUNCTION public.generate_daily_challenges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Only create if they don't exist
    IF EXISTS (SELECT 1 FROM public.daily_challenges WHERE challenge_date = v_today) THEN
        RETURN;
    END IF;

    -- Generate random daily challenges
    INSERT INTO public.daily_challenges (challenge_date, challenge_type, challenge_name, challenge_description, target_value, xp_reward, reward_points, is_active)
    VALUES
        (v_today, 'play_practice', 'Practice Makes Perfect', 'Play ' || (3 + FLOOR(RANDOM() * 3))::TEXT || ' practice games today', 3 + FLOOR(RANDOM() * 3), 25 + FLOOR(RANDOM() * 25), 5 + FLOOR(RANDOM() * 5), true),
        (v_today, 'play_competition', 'Competitive Spirit', 'Play ' || (1 + FLOOR(RANDOM() * 2))::TEXT || ' competition games today', 1 + FLOOR(RANDOM() * 2), 50 + FLOOR(RANDOM() * 50), 10 + FLOOR(RANDOM() * 10), true),
        (v_today, 'score_threshold', 'Score Master', 'Score ' || (800 + FLOOR(RANDOM() * 400))::TEXT || '+ points in any game', 1, 30 + FLOOR(RANDOM() * 20), 7 + FLOOR(RANDOM() * 3), true),
        (v_today, 'games_count', 'Game Marathon', 'Play ' || (4 + FLOOR(RANDOM() * 3))::TEXT || ' games total today', 4 + FLOOR(RANDOM() * 3), 40 + FLOOR(RANDOM() * 20), 8 + FLOOR(RANDOM() * 4), true)
    ON CONFLICT (challenge_date, challenge_type) DO NOTHING;
END;
$$;

-- Function to generate weekly challenges for a week
CREATE OR REPLACE FUNCTION public.generate_weekly_challenges(p_week_start DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create if they don't exist
    IF EXISTS (SELECT 1 FROM public.weekly_challenges WHERE week_start_date = p_week_start) THEN
        RETURN;
    END IF;

    -- Generate random weekly challenges
    INSERT INTO public.weekly_challenges (week_start_date, challenge_type, challenge_name, challenge_description, target_value, xp_reward, reward_points, is_active)
    VALUES
        (p_week_start, 'play_practice', 'Weekly Practice Champion', 'Play ' || (15 + FLOOR(RANDOM() * 10))::TEXT || ' practice games this week', 15 + FLOOR(RANDOM() * 10), 200 + FLOOR(RANDOM() * 100), 50 + FLOOR(RANDOM() * 25), true),
        (p_week_start, 'play_competition', 'Weekly Competitor', 'Play ' || (10 + FLOOR(RANDOM() * 5))::TEXT || ' competition games this week', 10 + FLOOR(RANDOM() * 5), 300 + FLOOR(RANDOM() * 100), 75 + FLOOR(RANDOM() * 25), true),
        (p_week_start, 'total_xp', 'XP Collector', 'Earn ' || (100 + FLOOR(RANDOM() * 100))::TEXT || ' XP this week', 100 + FLOOR(RANDOM() * 100), 250 + FLOOR(RANDOM() * 100), 60 + FLOOR(RANDOM() * 20), true),
        (p_week_start, 'games_count', 'Weekly Game Master', 'Play ' || (25 + FLOOR(RANDOM() * 15))::TEXT || ' games total this week', 25 + FLOOR(RANDOM() * 15), 400 + FLOOR(RANDOM() * 100), 100 + FLOOR(RANDOM() * 30), true),
        (p_week_start, 'level_up', 'Level Up Legend', 'Level up ' || (1 + FLOOR(RANDOM() * 2))::TEXT || ' time(s) this week', 1 + FLOOR(RANDOM() * 2), 500 + FLOOR(RANDOM() * 200), 150 + FLOOR(RANDOM() * 50), true)
    ON CONFLICT (week_start_date, challenge_type) DO NOTHING;
END;
$$;

-- Function to update weekly challenge progress
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
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
    v_week_start DATE;
BEGIN
    -- Calculate Monday of current week
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure this week's challenges exist
    PERFORM public.generate_weekly_challenges(v_week_start);
    
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
        PERFORM public.award_xp(p_user_id, v_xp_reward, 'daily_challenge', v_challenge_id, 'Weekly challenge completed');
        
        -- Award reward points
        UPDATE public.user_xp
        SET reward_points = reward_points + v_reward_points
        WHERE user_id = p_user_id;

        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Weekly challenge reward');

        UPDATE public.user_weekly_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'progress', v_new_progress,
        'target', v_target_value,
        'is_completed', v_is_completed,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'reward_points_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
END;
$$;

-- Function to update daily challenge progress
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
        PERFORM public.award_xp(p_user_id, v_xp_reward, 'daily_challenge', v_challenge_id, 'Daily challenge completed');
        
        -- Award reward points
        UPDATE public.user_xp
        SET reward_points = reward_points + v_reward_points
        WHERE user_id = p_user_id;

        INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
        VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');

        UPDATE public.user_daily_challenges
        SET xp_awarded = v_xp_reward, reward_points_awarded = v_reward_points
        WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'progress', v_new_progress,
        'target', v_target_value,
        'is_completed', v_is_completed,
        'xp_awarded', CASE WHEN v_is_completed THEN v_xp_reward ELSE 0 END,
        'reward_points_awarded', CASE WHEN v_is_completed THEN v_reward_points ELSE 0 END
    );
END;
$$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.user_xp TO authenticated;
GRANT SELECT ON public.xp_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_rankings TO authenticated;
GRANT SELECT ON public.daily_challenges TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_daily_challenges TO authenticated;
GRANT SELECT ON public.weekly_challenges TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_weekly_challenges TO authenticated;
GRANT SELECT ON public.reward_points_transactions TO authenticated;
GRANT SELECT ON public.ranking_tiers TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.calculate_xp_for_level(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INTEGER, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_practice_game_xp(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_xp(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_challenges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_challenges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_challenge_progress(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_weekly_challenge_progress(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_weekly_challenges(DATE) TO authenticated;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_tiers ENABLE ROW LEVEL SECURITY;

-- Users can view their own XP
CREATE POLICY "Users can view own XP" ON public.user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own XP" ON public.user_xp FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own XP transactions
CREATE POLICY "Users can view own XP transactions" ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own rankings
CREATE POLICY "Users can view own rankings" ON public.user_rankings FOR SELECT USING (auth.uid() = user_id);

-- Everyone can view daily challenges
CREATE POLICY "Anyone can view daily challenges" ON public.daily_challenges FOR SELECT USING (true);

-- Users can view and update their own challenge progress
CREATE POLICY "Users can view own challenge progress" ON public.user_daily_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own challenge progress" ON public.user_daily_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenge progress" ON public.user_daily_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Everyone can view weekly challenges
CREATE POLICY "Anyone can view weekly challenges" ON public.weekly_challenges FOR SELECT USING (true);

-- Users can view and update their own weekly challenge progress
CREATE POLICY "Users can view own weekly challenge progress" ON public.user_weekly_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly challenge progress" ON public.user_weekly_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly challenge progress" ON public.user_weekly_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weekly_challenges ENABLE ROW LEVEL SECURITY;

-- Users can view their own reward points transactions
CREATE POLICY "Users can view own reward points" ON public.reward_points_transactions FOR SELECT USING (auth.uid() = user_id);

-- Everyone can view ranking tiers
CREATE POLICY "Anyone can view ranking tiers" ON public.ranking_tiers FOR SELECT USING (true);

-- ============================================================================
-- 11. INITIALIZE CHALLENGES
-- ============================================================================

-- Generate today's daily challenges
SELECT public.generate_daily_challenges();

-- Generate this week's weekly challenges
SELECT public.generate_weekly_challenges(DATE_TRUNC('week', CURRENT_DATE)::DATE);

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ LEVEL UP SYSTEM CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '   - user_xp (XP and levels)';
    RAISE NOTICE '   - xp_transactions (audit trail)';
    RAISE NOTICE '   - user_rankings (titles and tiers)';
    RAISE NOTICE '   - daily_challenges (daily tasks)';
    RAISE NOTICE '   - user_daily_challenges (progress tracking)';
    RAISE NOTICE '   - reward_points_transactions (points history)';
    RAISE NOTICE '   - ranking_tiers (rank definitions)';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ Functions created:';
    RAISE NOTICE '   - award_xp() - Award XP to users';
    RAISE NOTICE '   - award_practice_game_xp() - Award XP for practice games';
    RAISE NOTICE '   - update_user_ranking() - Update user rank';
    RAISE NOTICE '   - get_user_xp() - Get user XP/level';
    RAISE NOTICE '   - get_daily_challenges() - Get today''s challenges';
    RAISE NOTICE '   - update_daily_challenge_progress() - Update challenge progress';
    RAISE NOTICE '';
END $$;

SELECT '✅ Level Up System Created Successfully!' as status;

