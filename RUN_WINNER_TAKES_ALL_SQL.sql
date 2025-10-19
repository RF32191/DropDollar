-- Run this in Supabase SQL Editor to set up Winner Takes It All functionality

-- Step 1: Create Winner Takes It All sessions table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.fixed_games_config(id) ON DELETE CASCADE,
    current_pot INTEGER NOT NULL DEFAULT 0,
    base_price INTEGER NOT NULL,
    participants_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    timer_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create Winner Takes It All participants table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.winner_takes_all_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- Step 3: Enable RLS
ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Users can view all winner takes all sessions" ON public.winner_takes_all_sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can view all winner takes all participants" ON public.winner_takes_all_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own winner takes all participation" ON public.winner_takes_all_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own winner takes all participation" ON public.winner_takes_all_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 5: Create Winner Takes It All functions
CREATE OR REPLACE FUNCTION public.create_winner_takes_all_session(config_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    config_rec RECORD;
BEGIN
    -- Get config details
    SELECT * INTO config_rec FROM public.fixed_games_config WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuration not found';
    END IF;
    
    -- Create session
    INSERT INTO public.winner_takes_all_sessions (
        config_id,
        current_pot,
        base_price,
        participants_count,
        status
    ) VALUES (
        config_id_param,
        0,
        config_rec.prize_pool, -- Use prize_pool as base_price
        0,
        'waiting'
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(session_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    participant_id UUID;
    session_rec RECORD;
    config_rec RECORD;
BEGIN
    -- Check authentication
    user_id := auth.uid();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get session details
    SELECT * INTO session_rec FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Get config details
    SELECT * INTO config_rec FROM public.fixed_games_config WHERE id = session_rec.config_id;
    
    -- Check if user already joined
    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_param AND user_id = user_id) THEN
        RAISE EXCEPTION 'User already joined this session';
    END IF;
    
    -- Add participant
    INSERT INTO public.winner_takes_all_participants (session_id, user_id)
    VALUES (session_id_param, user_id)
    RETURNING id INTO participant_id;
    
    -- Update session
    UPDATE public.winner_takes_all_sessions 
    SET 
        participants_count = participants_count + 1,
        current_pot = current_pot + 1, -- Each participant adds 1 token to pot
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Deduct token from user
    INSERT INTO public.token_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        metadata
    ) VALUES (
        user_id,
        -1,
        'tournament_entry',
        'Winner Takes It All tournament entry',
        json_build_object('session_id', session_id_param, 'config_id', session_rec.config_id)
    );
    
    RETURN json_build_object(
        'participant_id', participant_id,
        'session_id', session_id_param,
        'current_pot', session_rec.current_pot + 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(session_id_param UUID, user_id_param UUID, score_param INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check authentication
    IF auth.uid() != user_id_param THEN
        RAISE EXCEPTION 'User can only update their own score';
    END IF;
    
    -- Update score
    UPDATE public.winner_takes_all_participants 
    SET score = score_param
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_winner_takes_all_session(session_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_rec RECORD;
    participants_json JSON;
BEGIN
    -- Get session details
    SELECT * INTO session_rec FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Get participants
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'score', p.score,
            'joined_at', p.joined_at
        )
    ) INTO participants_json
    FROM public.winner_takes_all_participants p
    WHERE p.session_id = session_id_param;
    
    RETURN json_build_object(
        'id', session_rec.id,
        'config_id', session_rec.config_id,
        'current_pot', session_rec.current_pot,
        'base_price', session_rec.base_price,
        'participants_count', session_rec.participants_count,
        'status', session_rec.status,
        'timer_started_at', session_rec.timer_started_at,
        'created_at', session_rec.created_at,
        'participants', COALESCE(participants_json, '[]'::json)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sessions_json JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'config_id', s.config_id,
            'current_pot', s.current_pot,
            'base_price', s.base_price,
            'participants_count', s.participants_count,
            'status', s.status,
            'timer_started_at', s.timer_started_at,
            'created_at', s.created_at
        )
    ) INTO sessions_json
    FROM public.winner_takes_all_sessions s
    ORDER BY s.created_at DESC;
    
    RETURN COALESCE(sessions_json, '[]'::json);
END;
$$;

-- Step 6: Create Winner Takes It All configurations
INSERT INTO public.fixed_games_config (
    game_type,
    tournament_type,
    title,
    description,
    entry_fee,
    prize_pool,
    max_participants,
    game_duration,
    rng_seed,
    is_active
) VALUES 
(
    'multi_target_reaction',
    'winner_takes_all',
    '$100 Winner Takes It All - Multi Target',
    'Winner takes the entire $100 prize pool!',
    1,
    100,
    NULL,
    90,
    1,
    true
),
(
    'laser_dodge',
    'winner_takes_all',
    '$250 Winner Takes It All - Laser Dodge',
    'Winner takes the entire $250 prize pool!',
    1,
    250,
    NULL,
    120,
    2,
    true
),
(
    'sword_parry',
    'winner_takes_all',
    '$1000 Winner Takes It All - Sword Parry',
    'Winner takes the entire $1000 prize pool!',
    1,
    1000,
    NULL,
    150,
    3,
    true
),
(
    'laser_dodge',
    'winner_takes_all',
    '$2500 Winner Takes It All - Laser Dodge',
    'Winner takes the entire $2500 prize pool!',
    1,
    2500,
    NULL,
    180,
    4,
    true
)
ON CONFLICT (title) DO NOTHING;

-- Step 7: Update tournament_type constraint to allow 'winner_takes_all'
ALTER TABLE public.fixed_games_config DROP CONSTRAINT IF EXISTS fixed_games_config_tournament_type_check;
ALTER TABLE public.fixed_games_config ADD CONSTRAINT fixed_games_config_tournament_type_check 
    CHECK (tournament_type IN ('hot_sell', 'winner_takes_all'));

-- Step 8: Make max_participants nullable for Winner Takes It All
ALTER TABLE public.fixed_games_config ALTER COLUMN max_participants DROP NOT NULL;

-- Success message
SELECT 'Winner Takes It All setup completed successfully!' as message;