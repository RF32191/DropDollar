-- Winner Takes It All SQL Functions
-- Separate from hot sell but similar functionality

-- Create Winner Takes It All sessions table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.fixed_games_config(id) ON DELETE CASCADE,
    current_pot INTEGER NOT NULL DEFAULT 0,
    base_price INTEGER NOT NULL,
    participants_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Winner Takes It All participants table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.winner_takes_all_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for winner_takes_all_sessions
CREATE POLICY "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert winner takes all sessions" ON public.winner_takes_all_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for winner_takes_all_participants
CREATE POLICY "Anyone can view winner takes all participants" ON public.winner_takes_all_participants FOR SELECT USING (true);
CREATE POLICY "Users can insert their own participation" ON public.winner_takes_all_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON public.winner_takes_all_participants FOR UPDATE USING (auth.uid() = user_id);

-- Function to create Winner Takes It All session
CREATE OR REPLACE FUNCTION public.create_winner_takes_all_session(config_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    config_rec RECORD;
    base_price INTEGER;
BEGIN
    -- Get config details
    SELECT * INTO config_rec FROM public.fixed_games_config WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Config not found: %', config_id_param;
    END IF;
    
    -- Extract base price from title (e.g., "$100 Winner Takes It All" -> 100)
    base_price := CASE 
        WHEN config_rec.title LIKE '%$100 Winner Takes It All%' THEN 100
        WHEN config_rec.title LIKE '%$250 Winner Takes It All%' THEN 250
        WHEN config_rec.title LIKE '%$1000 Winner Takes It All%' THEN 1000
        WHEN config_rec.title LIKE '%$2500 Winner Takes It All%' THEN 2500
        ELSE 100 -- Default fallback
    END;
    
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
        base_price,
        0,
        'waiting'
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$;

-- Function to join Winner Takes It All session
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(session_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_param UUID;
    session_rec RECORD;
    participant_exists BOOLEAN;
    result JSON;
BEGIN
    -- Get current user
    user_id_param := auth.uid();
    
    IF user_id_param IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get session details
    SELECT * INTO session_rec FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', session_id_param;
    END IF;
    
    -- Check if user already joined
    SELECT EXISTS(
        SELECT 1 FROM public.winner_takes_all_participants 
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) INTO participant_exists;
    
    IF participant_exists THEN
        RAISE EXCEPTION 'User already joined this session';
    END IF;
    
    -- Add participant
    INSERT INTO public.winner_takes_all_participants (session_id, user_id)
    VALUES (session_id_param, user_id_param);
    
    -- Update session
    UPDATE public.winner_takes_all_sessions 
    SET 
        participants_count = participants_count + 1,
        current_pot = current_pot + 1, -- 1 token per participant
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Return success
    result := json_build_object(
        'success', true,
        'session_id', session_id_param,
        'message', 'Successfully joined Winner Takes It All session'
    );
    
    RETURN result;
END;
$$;

-- Function to update Winner Takes It All score
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(session_id_param UUID, score_param INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_param UUID;
    result JSON;
BEGIN
    -- Get current user
    user_id_param := auth.uid();
    
    IF user_id_param IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update score
    UPDATE public.winner_takes_all_participants 
    SET score = score_param
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Participant not found or not authorized';
    END IF;
    
    -- Return success
    result := json_build_object(
        'success', true,
        'message', 'Score updated successfully'
    );
    
    RETURN result;
END;
$$;

-- Function to get Winner Takes It All session details
CREATE OR REPLACE FUNCTION public.get_winner_takes_all_session(session_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_rec RECORD;
    participants JSON;
    result JSON;
BEGIN
    -- Get session details
    SELECT * INTO session_rec FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', session_id_param;
    END IF;
    
    -- Get participants
    SELECT json_agg(
        json_build_object(
            'id', id,
            'user_id', user_id,
            'score', score,
            'joined_at', joined_at
        )
    ) INTO participants
    FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param;
    
    -- Build result
    result := json_build_object(
        'id', session_rec.id,
        'config_id', session_rec.config_id,
        'current_pot', session_rec.current_pot,
        'base_price', session_rec.base_price,
        'participants_count', session_rec.participants_count,
        'status', session_rec.status,
        'created_at', session_rec.created_at,
        'updated_at', session_rec.updated_at,
        'participants', COALESCE(participants, '[]'::json)
    );
    
    RETURN result;
END;
$$;

-- Function to get all Winner Takes It All sessions
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sessions JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'config_id', s.config_id,
            'current_pot', s.current_pot,
            'base_price', s.base_price,
            'participants_count', s.participants_count,
            'status', s.status,
            'created_at', s.created_at,
            'updated_at', s.updated_at
        )
    ) INTO sessions
    FROM public.winner_takes_all_sessions s;
    
    RETURN COALESCE(sessions, '[]'::json);
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_sessions_config_id ON public.winner_takes_all_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_session_id ON public.winner_takes_all_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_user_id ON public.winner_takes_all_participants(user_id);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated;
