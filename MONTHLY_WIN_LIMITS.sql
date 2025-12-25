-- ============================================================================
-- MONTHLY WIN LIMITS SYSTEM
-- ============================================================================
-- Purpose: Track user wins per game type and enforce monthly limits
-- Rule: Users can only win 1 competitive game listing per game type per month
-- Exception: 1v1 mode is exempt from these limits
-- ============================================================================

-- Drop existing objects if they exist
DROP TABLE IF EXISTS public.monthly_game_wins CASCADE;
DROP FUNCTION IF EXISTS public.record_game_win CASCADE;
DROP FUNCTION IF EXISTS public.check_can_play_competitive CASCADE;
DROP FUNCTION IF EXISTS public.get_user_monthly_wins CASCADE;
DROP FUNCTION IF EXISTS public.get_locked_game_types CASCADE;

-- ============================================================================
-- TABLE: monthly_game_wins
-- ============================================================================
-- Tracks wins per user per game type per month

CREATE TABLE IF NOT EXISTS public.monthly_game_wins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    competition_type TEXT NOT NULL CHECK (competition_type IN ('hot_sell', 'winner_takes_all', 'coin_play')),
    competition_id UUID,
    win_date TIMESTAMPTZ DEFAULT NOW(),
    win_month INTEGER NOT NULL, -- Format: YYYYMM (e.g., 202512 for December 2025)
    prize_amount DECIMAL(10,2) DEFAULT 0,
    score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_monthly_wins_user_month 
    ON public.monthly_game_wins(user_id, win_month);
    
CREATE INDEX IF NOT EXISTS idx_monthly_wins_user_game_month 
    ON public.monthly_game_wins(user_id, game_type, win_month);
    
CREATE INDEX IF NOT EXISTS idx_monthly_wins_competition 
    ON public.monthly_game_wins(competition_id);

-- RLS Policies
ALTER TABLE public.monthly_game_wins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wins" ON public.monthly_game_wins;
CREATE POLICY "Users can view their own wins"
    ON public.monthly_game_wins FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert wins" ON public.monthly_game_wins;
CREATE POLICY "System can insert wins"
    ON public.monthly_game_wins FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- FUNCTION: get_current_win_month
-- ============================================================================
-- Returns current month in YYYYMM format

CREATE OR REPLACE FUNCTION public.get_current_win_month()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT (EXTRACT(YEAR FROM NOW()) * 100 + EXTRACT(MONTH FROM NOW()))::INTEGER;
$$;

-- ============================================================================
-- FUNCTION: record_game_win
-- ============================================================================
-- Records a win for a user in a competitive game
-- Called when a user wins a Hot Sell, Winner Takes All, or Coin Play listing

CREATE OR REPLACE FUNCTION public.record_game_win(
    p_user_id UUID,
    p_game_type TEXT,
    p_competition_type TEXT,
    p_competition_id UUID DEFAULT NULL,
    p_prize_amount DECIMAL DEFAULT 0,
    p_score INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_win_month INTEGER;
    v_existing_win UUID;
    v_win_id UUID;
BEGIN
    -- Get current month
    v_win_month := public.get_current_win_month();
    
    -- Check if user already has a win for this game type this month
    SELECT id INTO v_existing_win
    FROM public.monthly_game_wins
    WHERE user_id = p_user_id
      AND game_type = p_game_type
      AND win_month = v_win_month;
    
    -- If already won this game type this month, log it but flag as duplicate
    IF v_existing_win IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_first_win', false,
            'message', 'Win recorded but user already won this game type this month',
            'existing_win_id', v_existing_win
        );
    END IF;
    
    -- Record the win
    INSERT INTO public.monthly_game_wins (
        user_id,
        game_type,
        competition_type,
        competition_id,
        win_month,
        prize_amount,
        score,
        metadata
    ) VALUES (
        p_user_id,
        p_game_type,
        p_competition_type,
        p_competition_id,
        v_win_month,
        p_prize_amount,
        p_score,
        p_metadata
    )
    RETURNING id INTO v_win_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_first_win', true,
        'win_id', v_win_id,
        'message', 'Win recorded successfully. User is now locked from this game type until next month.'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: check_can_play_competitive
-- ============================================================================
-- Checks if a user can participate in a competitive listing for a game type
-- Returns false if user has already won this game type this month

CREATE OR REPLACE FUNCTION public.check_can_play_competitive(
    p_user_id UUID,
    p_game_type TEXT,
    p_competition_type TEXT DEFAULT 'any'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_win_month INTEGER;
    v_existing_win RECORD;
    v_days_until_reset INTEGER;
BEGIN
    -- 1v1 mode is always allowed
    IF p_competition_type = '1v1' THEN
        RETURN jsonb_build_object(
            'can_play', true,
            'reason', '1v1 mode is exempt from monthly limits'
        );
    END IF;
    
    -- Get current month
    v_win_month := public.get_current_win_month();
    
    -- Check for existing win this month
    SELECT id, win_date, competition_type, prize_amount
    INTO v_existing_win
    FROM public.monthly_game_wins
    WHERE user_id = p_user_id
      AND game_type = p_game_type
      AND win_month = v_win_month
    LIMIT 1;
    
    IF v_existing_win.id IS NOT NULL THEN
        -- Calculate days until next month
        v_days_until_reset := (
            DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - NOW()
        )::INTEGER / 86400 + 1;
        
        RETURN jsonb_build_object(
            'can_play', false,
            'reason', 'You have already won a ' || p_game_type || ' competitive game this month',
            'won_on', v_existing_win.win_date,
            'competition_type', v_existing_win.competition_type,
            'prize_amount', v_existing_win.prize_amount,
            'days_until_reset', v_days_until_reset,
            'resets_on', DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'can_play', true,
        'reason', 'No wins for this game type this month'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: get_user_monthly_wins
-- ============================================================================
-- Gets all wins for a user in the current month

CREATE OR REPLACE FUNCTION public.get_user_monthly_wins(
    p_user_id UUID
)
RETURNS TABLE (
    win_id UUID,
    game_type TEXT,
    competition_type TEXT,
    win_date TIMESTAMPTZ,
    prize_amount DECIMAL,
    score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_win_month INTEGER;
BEGIN
    v_win_month := public.get_current_win_month();
    
    RETURN QUERY
    SELECT 
        m.id,
        m.game_type,
        m.competition_type,
        m.win_date,
        m.prize_amount,
        m.score
    FROM public.monthly_game_wins m
    WHERE m.user_id = p_user_id
      AND m.win_month = v_win_month
    ORDER BY m.win_date DESC;
END;
$$;

-- ============================================================================
-- FUNCTION: get_locked_game_types
-- ============================================================================
-- Returns list of game types that are locked for a user this month

CREATE OR REPLACE FUNCTION public.get_locked_game_types(
    p_user_id UUID
)
RETURNS TABLE (
    game_type TEXT,
    won_on TIMESTAMPTZ,
    competition_type TEXT,
    days_until_unlock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_win_month INTEGER;
    v_days_until_reset INTEGER;
BEGIN
    v_win_month := public.get_current_win_month();
    
    -- Calculate days until next month
    v_days_until_reset := (
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - NOW()
    )::INTEGER / 86400 + 1;
    
    RETURN QUERY
    SELECT 
        m.game_type,
        m.win_date,
        m.competition_type,
        v_days_until_reset
    FROM public.monthly_game_wins m
    WHERE m.user_id = p_user_id
      AND m.win_month = v_win_month
    ORDER BY m.win_date DESC;
END;
$$;

-- ============================================================================
-- FUNCTION: get_win_stats
-- ============================================================================
-- Gets win statistics for a user

CREATE OR REPLACE FUNCTION public.get_win_stats(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_win_month INTEGER;
    v_monthly_wins INTEGER;
    v_total_wins INTEGER;
    v_total_prize DECIMAL;
    v_locked_games TEXT[];
BEGIN
    v_win_month := public.get_current_win_month();
    
    -- Count wins this month
    SELECT COUNT(*) INTO v_monthly_wins
    FROM public.monthly_game_wins
    WHERE user_id = p_user_id AND win_month = v_win_month;
    
    -- Count total wins all time
    SELECT COUNT(*), COALESCE(SUM(prize_amount), 0)
    INTO v_total_wins, v_total_prize
    FROM public.monthly_game_wins
    WHERE user_id = p_user_id;
    
    -- Get locked game types
    SELECT ARRAY_AGG(game_type) INTO v_locked_games
    FROM public.monthly_game_wins
    WHERE user_id = p_user_id AND win_month = v_win_month;
    
    RETURN jsonb_build_object(
        'monthly_wins', v_monthly_wins,
        'total_wins', v_total_wins,
        'total_prize_amount', v_total_prize,
        'locked_game_types', COALESCE(v_locked_games, ARRAY[]::TEXT[]),
        'current_month', v_win_month,
        'days_until_reset', (
            DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - NOW()
        )::INTEGER / 86400 + 1
    );
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON public.monthly_game_wins TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_win_month() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_game_win TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_can_play_competitive TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_monthly_wins TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_locked_game_types TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_win_stats TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.monthly_game_wins IS 'Tracks user wins per game type per month for fair play limits';
COMMENT ON FUNCTION public.record_game_win IS 'Records a win and locks the game type for the user this month';
COMMENT ON FUNCTION public.check_can_play_competitive IS 'Checks if user can join competitive listing for a game type';
COMMENT ON FUNCTION public.get_locked_game_types IS 'Returns game types user cannot play competitively this month';

