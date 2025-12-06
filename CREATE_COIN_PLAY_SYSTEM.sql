-- ============================================================================
-- COIN PLAY TOURNAMENT SYSTEM
-- ============================================================================
-- 25 cent entry fee (0.25 tokens)
-- All 9 games available
-- Prize tiers: $1, $5, $10, $25, $50, $100, $250, $500, $1000
-- Same structure as Winner Takes All but separate system
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🪙 CREATING COIN PLAY SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Creating Coin Play tables...';
END $$;

-- Coin Play Configs (listing templates)
CREATE TABLE IF NOT EXISTS public.coin_play_configs (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    entry_fee NUMERIC DEFAULT 0.25, -- 25 cents
    min_participants INTEGER DEFAULT 4,
    max_participants INTEGER NOT NULL,
    prize_pool NUMERIC NOT NULL,
    rng_seed INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coin Play Sessions
CREATE TABLE IF NOT EXISTS public.coin_play_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id TEXT NOT NULL REFERENCES public.coin_play_configs(id),
    status TEXT DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
    participants_count INTEGER DEFAULT 0,
    prize_pool NUMERIC DEFAULT 0,
    timer_duration INTEGER DEFAULT 120, -- 2 minutes
    timer_started_at TIMESTAMPTZ,
    winner_user_id UUID,
    winner_prize NUMERIC,
    platform_fee NUMERIC,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coin Play Participants
CREATE TABLE IF NOT EXISTS public.coin_play_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.coin_play_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username TEXT NOT NULL,
    score INTEGER,
    prize_amount NUMERIC,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Tables created!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 2: ENABLE RLS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 Enabling RLS...';
END $$;

ALTER TABLE public.coin_play_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_play_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_play_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view Coin Play configs" ON public.coin_play_configs;
CREATE POLICY "Anyone can view Coin Play configs"
ON public.coin_play_configs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view Coin Play sessions" ON public.coin_play_sessions;
CREATE POLICY "Anyone can view Coin Play sessions"
ON public.coin_play_sessions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view Coin Play participants" ON public.coin_play_participants;
CREATE POLICY "Anyone can view Coin Play participants"
ON public.coin_play_participants FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can join Coin Play" ON public.coin_play_participants;
CREATE POLICY "Users can join Coin Play"
ON public.coin_play_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Coin Play scores" ON public.coin_play_participants;
CREATE POLICY "Users can update own Coin Play scores"
ON public.coin_play_participants FOR UPDATE
USING (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 3: CREATE CONFIGS (9 GAMES, 9 PRIZE TIERS = 81 LISTINGS)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎮 Creating Coin Play configs for all games...';
END $$;

-- Clear existing configs
DELETE FROM public.coin_play_participants;
DELETE FROM public.coin_play_sessions;
DELETE FROM public.coin_play_configs;

-- All 9 games
INSERT INTO public.coin_play_configs (id, game_type, entry_fee, min_participants, max_participants, prize_pool, rng_seed) VALUES
-- Multi-Target Reaction ($1-$1000)
('cp-multi-target-1', 'multi_target', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-5', 'multi_target', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-10', 'multi_target', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-25', 'multi_target', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-50', 'multi_target', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-100', 'multi_target', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-250', 'multi_target', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-500', 'multi_target', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-multi-target-1000', 'multi_target', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Falling Objects ($1-$1000)
('cp-falling-objects-1', 'falling_object', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-5', 'falling_object', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-10', 'falling_object', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-25', 'falling_object', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-50', 'falling_object', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-100', 'falling_object', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-250', 'falling_object', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-500', 'falling_object', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-falling-objects-1000', 'falling_object', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Color Sequence ($1-$1000)
('cp-color-sequence-1', 'color_sequence', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-5', 'color_sequence', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-10', 'color_sequence', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-25', 'color_sequence', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-50', 'color_sequence', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-100', 'color_sequence', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-250', 'color_sequence', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-500', 'color_sequence', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-color-sequence-1000', 'color_sequence', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Laser Dodge ($1-$1000)
('cp-laser-dodge-1', 'laser_dodge', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-5', 'laser_dodge', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-10', 'laser_dodge', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-25', 'laser_dodge', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-50', 'laser_dodge', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-100', 'laser_dodge', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-250', 'laser_dodge', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-500', 'laser_dodge', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-laser-dodge-1000', 'laser_dodge', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Quick Click ($1-$1000)
('cp-quick-click-1', 'quick_click', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-5', 'quick_click', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-10', 'quick_click', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-25', 'quick_click', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-50', 'quick_click', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-100', 'quick_click', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-250', 'quick_click', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-500', 'quick_click', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-quick-click-1000', 'quick_click', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Sword Parry ($1-$1000)
('cp-sword-parry-1', 'sword_parry', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-5', 'sword_parry', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-10', 'sword_parry', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-25', 'sword_parry', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-50', 'sword_parry', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-100', 'sword_parry', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-250', 'sword_parry', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-500', 'sword_parry', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-sword-parry-1000', 'sword_parry', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Blade Bounce ($1-$1000)
('cp-blade-bounce-1', 'blade_bounce', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-5', 'blade_bounce', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-10', 'blade_bounce', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-25', 'blade_bounce', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-50', 'blade_bounce', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-100', 'blade_bounce', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-250', 'blade_bounce', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-500', 'blade_bounce', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-blade-bounce-1000', 'blade_bounce', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Cash Stack ($1-$1000)
('cp-cash-stack-1', 'cash_stack', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-5', 'cash_stack', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-10', 'cash_stack', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-25', 'cash_stack', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-50', 'cash_stack', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-100', 'cash_stack', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-250', 'cash_stack', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-500', 'cash_stack', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-cash-stack-1000', 'cash_stack', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int),

-- Penny Passer ($1-$1000)
('cp-penny-passer-1', 'penny_passer', 0.25, 4, 4, 1.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-5', 'penny_passer', 0.25, 4, 20, 5.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-10', 'penny_passer', 0.25, 4, 40, 10.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-25', 'penny_passer', 0.25, 4, 100, 25.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-50', 'penny_passer', 0.25, 4, 200, 50.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-100', 'penny_passer', 0.25, 4, 400, 100.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-250', 'penny_passer', 0.25, 4, 1000, 250.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-500', 'penny_passer', 0.25, 4, 2000, 500.00, floor(random() * 1000000 + 1)::int),
('cp-penny-passer-1000', 'penny_passer', 0.25, 4, 4000, 1000.00, floor(random() * 1000000 + 1)::int);

DO $$
BEGIN
    RAISE NOTICE '✅ Created 81 Coin Play configs (9 games × 9 prize tiers)!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 4: CREATE WAITING SESSIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎲 Creating waiting sessions for all configs...';
END $$;

-- Create one waiting session per config
INSERT INTO public.coin_play_sessions (config_id, status, prize_pool)
SELECT 
    id,
    'waiting',
    0
FROM public.coin_play_configs;

DO $$
BEGIN
    RAISE NOTICE '✅ Created 81 waiting sessions!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 5: CREATE RPC FUNCTIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Creating RPC functions...';
END $$;

-- Get Coin Play sessions (similar to WTA)
CREATE OR REPLACE FUNCTION public.get_coin_play_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    game_type TEXT,
    entry_fee NUMERIC,
    prize_pool NUMERIC,
    max_participants INTEGER,
    participants_count INTEGER,
    status TEXT,
    timer_duration INTEGER,
    timer_started_at TIMESTAMPTZ,
    winner_user_id UUID,
    winner_prize NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        c.game_type,
        c.entry_fee,
        s.prize_pool,
        c.max_participants,
        s.participants_count,
        s.status,
        s.timer_duration,
        s.timer_started_at,
        s.winner_user_id,
        s.winner_prize,
        s.created_at
    FROM public.coin_play_sessions s
    JOIN public.coin_play_configs c ON s.config_id = c.id
    WHERE s.status IN ('waiting', 'active')
    ORDER BY c.game_type, c.prize_pool;
END;
$$;

-- Join Coin Play session (similar to wta_join_v2)
CREATE OR REPLACE FUNCTION public.coin_play_join_v2(
    p_session UUID,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_id TEXT;
    v_purchased_tokens NUMERIC;
    v_won_tokens NUMERIC;
    v_total_tokens NUMERIC;
    v_participants_count INTEGER;
    v_max_participants INTEGER;
    v_session_status TEXT;
BEGIN
    -- Get session details
    SELECT config_id, participants_count, status
    INTO v_config_id, v_participants_count, v_session_status
    FROM public.coin_play_sessions
    WHERE id = p_session;

    -- Check if session exists
    IF v_config_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Check if session is still waiting
    IF v_session_status != 'waiting' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is no longer accepting participants');
    END IF;

    -- Get max participants from config
    SELECT max_participants INTO v_max_participants
    FROM public.coin_play_configs
    WHERE id = v_config_id;

    -- Check if session is full
    IF v_participants_count >= v_max_participants THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is full');
    END IF;

    -- Check if user already joined
    IF EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = p_session AND user_id = p_user
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Get user's token balance
    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_purchased_tokens, v_won_tokens
    FROM public.users
    WHERE id = p_user;

    v_total_tokens := v_purchased_tokens + v_won_tokens;

    -- Check if user has enough tokens
    IF v_total_tokens < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    -- Deduct entry fee (prioritize won_tokens)
    IF v_won_tokens >= p_fee THEN
        UPDATE public.users
        SET won_tokens = won_tokens - p_fee
        WHERE id = p_user;
    ELSE
        UPDATE public.users
        SET 
            won_tokens = 0,
            purchased_tokens = purchased_tokens - (p_fee - v_won_tokens)
        WHERE id = p_user;
    END IF;

    -- Add participant (username will be fetched from users table via trigger or set to email)
    INSERT INTO public.coin_play_participants (session_id, user_id, username)
    SELECT p_session, p_user, COALESCE(u.username, u.email, 'Player')
    FROM public.users u
    WHERE u.id = p_user;

    -- Update session counts and prize pool
    UPDATE public.coin_play_sessions
    SET 
        participants_count = participants_count + 1,
        prize_pool = prize_pool + p_fee
    WHERE id = p_session;

    -- Check if session should start
    UPDATE public.coin_play_sessions
    SET 
        status = 'active',
        timer_started_at = NOW()
    WHERE id = p_session
    AND participants_count >= (SELECT min_participants FROM public.coin_play_configs WHERE id = v_config_id);

    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined session');
END;
$$;

-- Update Coin Play score
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
BEGIN
    -- Check if session exists and is active
    SELECT status INTO v_session_status
    FROM public.coin_play_sessions
    WHERE id = session_id_param;

    IF v_session_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    IF v_session_status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is not active');
    END IF;

    -- Check if user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not in this session');
    END IF;

    -- Update score (removed accuracy as column doesn't exist)
    UPDATE public.coin_play_participants
    SET 
        score = score_param,
        completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;

    RETURN jsonb_build_object('success', true, 'message', 'Score updated successfully');
END;
$$;

-- Process Coin Play payout
CREATE OR REPLACE FUNCTION public.process_coin_play_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_session_status TEXT;
    v_timer_started_at TIMESTAMPTZ;
    v_timer_duration INTEGER;
    v_winner_id UUID;
    v_winner_username TEXT;
    v_winner_score NUMERIC;
    v_prize_pool NUMERIC;
    v_participants_count INTEGER;
    v_min_participants INTEGER;
BEGIN
    -- Get active session for this config
    SELECT id, status, timer_started_at, timer_duration, prize_pool, participants_count
    INTO v_session_id, v_session_status, v_timer_started_at, v_timer_duration, v_prize_pool, v_participants_count
    FROM public.coin_play_sessions
    WHERE config_id = config_id_param AND status = 'active'
    LIMIT 1;

    -- Check if session exists
    IF v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if timer has expired
    IF v_timer_started_at IS NULL OR (NOW() - v_timer_started_at) < (v_timer_duration || ' seconds')::INTERVAL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer has not expired yet');
    END IF;

    -- Check if already paid out
    IF v_session_status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session already paid out');
    END IF;

    -- Get minimum participants requirement
    SELECT min_participants INTO v_min_participants
    FROM public.coin_play_configs
    WHERE id = config_id_param;

    -- If no scores submitted, refund all participants
    IF NOT EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = v_session_id AND score IS NOT NULL
    ) THEN
        -- Refund all participants
        UPDATE public.users u
        SET won_tokens = won_tokens + p.entry_fee
        FROM public.coin_play_participants p
        WHERE p.session_id = v_session_id AND p.user_id = u.id;

        -- Mark session as completed
        UPDATE public.coin_play_sessions
        SET status = 'completed'
        WHERE id = v_session_id;

        -- Create new waiting session
        INSERT INTO public.coin_play_sessions (config_id, status, timer_duration)
        SELECT config_id, 'waiting', timer_duration
        FROM public.coin_play_sessions
        WHERE id = v_session_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'No scores submitted - all participants refunded',
            'refunded', v_participants_count
        );
    END IF;

    -- Get winner (highest score)
    SELECT p.user_id, u.username, p.score
    INTO v_winner_id, v_winner_username, v_winner_score
    FROM public.coin_play_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    -- Award prize to winner
    UPDATE public.users
    SET won_tokens = won_tokens + v_prize_pool
    WHERE id = v_winner_id;

    -- Mark session as completed
    UPDATE public.coin_play_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner_id,
        winner_prize = v_prize_pool
    WHERE id = v_session_id;

    -- Create new waiting session
    INSERT INTO public.coin_play_sessions (config_id, status, timer_duration)
    SELECT config_id, 'waiting', timer_duration
    FROM public.coin_play_sessions
    WHERE id = v_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_id', v_winner_id,
        'winner_username', v_winner_username,
        'winner_score', v_winner_score,
        'payout_amount', v_prize_pool
    );
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ RPC functions created!';
    RAISE NOTICE '   - get_coin_play_sessions()';
    RAISE NOTICE '   - coin_play_join_v2()';
    RAISE NOTICE '   - update_coin_play_score()';
    RAISE NOTICE '   - process_coin_play_payout()';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 6: VERIFY SETUP
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COIN PLAY SYSTEM READY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Show summary
SELECT 
    game_type,
    COUNT(*) as config_count,
    MIN(prize_pool) as min_prize,
    MAX(prize_pool) as max_prize
FROM public.coin_play_configs
GROUP BY game_type
ORDER BY game_type;

SELECT 
    COUNT(*) as total_sessions,
    SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
FROM public.coin_play_sessions;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🪙 Coin Play System Summary:';
    RAISE NOTICE '   📊 81 configs created (9 games × 9 prizes)';
    RAISE NOTICE '   💰 Entry fee: $0.25 (25 cents)';
    RAISE NOTICE '   🏆 Prize range: $1 to $1,000';
    RAISE NOTICE '   ⏱️ Timer: 2 minutes';
    RAISE NOTICE '   👥 Min players: 4, Max varies by prize';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 Games included:';
    RAISE NOTICE '   1. Multi-Target Reaction';
    RAISE NOTICE '   2. Falling Objects';
    RAISE NOTICE '   3. Color Sequence';
    RAISE NOTICE '   4. Laser Dodge';
    RAISE NOTICE '   5. Quick Click';
    RAISE NOTICE '   6. Sword Parry';
    RAISE NOTICE '   7. Blade Bounce';
    RAISE NOTICE '   8. Cash Stack';
    RAISE NOTICE '   9. Penny Passer';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next step: Create frontend page at /coin-play';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

