-- Complete Winner Takes It All Setup
-- This script creates all necessary tables, functions, and configurations

-- Step 1: Create Winner Takes It All sessions table
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

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Anyone can view winner takes all participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.winner_takes_all_participants;

-- Step 5: Create RLS Policies for winner_takes_all_sessions
CREATE POLICY "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert winner takes all sessions" ON public.winner_takes_all_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions FOR UPDATE USING (auth.role() = 'authenticated');

-- Step 6: Create RLS Policies for winner_takes_all_participants
CREATE POLICY "Anyone can view winner takes all participants" ON public.winner_takes_all_participants FOR SELECT USING (true);
CREATE POLICY "Users can insert their own participation" ON public.winner_takes_all_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON public.winner_takes_all_participants FOR UPDATE USING (auth.uid() = user_id);

-- Step 7: Fix tournament_type constraint
ALTER TABLE public.fixed_games_config DROP CONSTRAINT IF EXISTS fixed_games_config_tournament_type_check;
ALTER TABLE public.fixed_games_config 
ADD CONSTRAINT fixed_games_config_tournament_type_check 
CHECK (tournament_type IN ('hot_sell', '1v1', 'group_battle', 'winner_takes_all'));

-- Step 8: Remove NOT NULL constraint from max_participants
ALTER TABLE public.fixed_games_config ALTER COLUMN max_participants DROP NOT NULL;

-- Step 9: Create Winner Takes It All configurations
DELETE FROM public.fixed_games_config WHERE tournament_type = 'winner_takes_all';

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
    is_active,
    created_at,
    updated_at
) VALUES 
-- $2 Winner Takes It All
(
    'multi_target',
    'winner_takes_all',
    '$2 Winner Takes It All - Multi Target',
    'Winner takes the entire $2 prize pool!',
    1,
    2.00,
    NULL,
    90,
    1,
    true,
    NOW(),
    NOW()
),
-- $3 Winner Takes It All
(
    'laser_dodge',
    'winner_takes_all',
    '$3 Winner Takes It All - Laser Dodge',
    'Winner takes the entire $3 prize pool!',
    1,
    3.00,
    NULL,
    120,
    2,
    true,
    NOW(),
    NOW()
),
-- $10 Winner Takes It All
(
    'sword_parry',
    'winner_takes_all',
    '$10 Winner Takes It All - Sword Parry',
    'Winner takes the entire $10 prize pool!',
    1,
    10.00,
    NULL,
    60,
    3,
    true,
    NOW(),
    NOW()
),
-- $50 Winner Takes It All
(
    'color_sequence',
    'winner_takes_all',
    '$50 Winner Takes It All - Color Sequence',
    'Winner takes the entire $50 prize pool!',
    1,
    50.00,
    NULL,
    45,
    4,
    true,
    NOW(),
    NOW()
),
-- $100 Winner Takes It All
(
    'quick_click',
    'winner_takes_all',
    '$100 Winner Takes It All - Quick Click',
    'Winner takes the entire $100 prize pool!',
    1,
    100.00,
    NULL,
    30,
    5,
    true,
    NOW(),
    NOW()
),
-- $250 Winner Takes It All
(
    'multi_target',
    'winner_takes_all',
    '$250 Winner Takes It All - Multi Target',
    'Winner takes the entire $250 prize pool!',
    1,
    250.00,
    NULL,
    90,
    6,
    true,
    NOW(),
    NOW()
),
-- $500 Winner Takes It All
(
    'laser_dodge',
    'winner_takes_all',
    '$500 Winner Takes It All - Laser Dodge',
    'Winner takes the entire $500 prize pool!',
    1,
    500.00,
    NULL,
    120,
    7,
    true,
    NOW(),
    NOW()
),
-- $1000 Winner Takes It All
(
    'sword_parry',
    'winner_takes_all',
    '$1000 Winner Takes It All - Sword Parry',
    'Winner takes the entire $1000 prize pool!',
    1,
    1000.00,
    NULL,
    60,
    8,
    true,
    NOW(),
    NOW()
),
-- $2500 Winner Takes It All
(
    'color_sequence',
    'winner_takes_all',
    '$2500 Winner Takes It All - Color Sequence',
    'Winner takes the entire $2500 prize pool!',
    1,
    2500.00,
    NULL,
    45,
    9,
    true,
    NOW(),
    NOW()
);

-- Step 10: Create Winner Takes It All functions
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
        WHEN config_rec.title LIKE '%$3 Winner Takes It All%' THEN 3
        WHEN config_rec.title LIKE '%$2 Winner Takes It All%' THEN 2
        WHEN config_rec.title LIKE '%$10 Winner Takes It All%' THEN 10
        WHEN config_rec.title LIKE '%$50 Winner Takes It All%' THEN 50
        WHEN config_rec.title LIKE '%$500 Winner Takes It All%' THEN 500
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
    
    -- Debug logging
    RAISE NOTICE 'Attempting to join Winner Takes It All session: %, user_id: %', session_id_param, user_id_param;
    
    IF user_id_param IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated - auth.uid() returned NULL';
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

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_sessions_config_id ON public.winner_takes_all_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_session_id ON public.winner_takes_all_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_user_id ON public.winner_takes_all_participants(user_id);

-- Step 12: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated;

-- Step 13: Verify the setup
SELECT 
    'Winner Takes It All Setup Complete' as status,
    COUNT(*) as total_configs
FROM public.fixed_games_config 
WHERE tournament_type = 'winner_takes_all';

-- Step 14: Show all Winner Takes It All configs
SELECT 
    id,
    title,
    game_type,
    tournament_type,
    prize_pool,
    entry_fee,
    max_participants
FROM public.fixed_games_config 
WHERE tournament_type = 'winner_takes_all'
ORDER BY prize_pool;

-- Step 15: Test the functions
SELECT 'Testing get_all_winner_takes_all_sessions...' as test_step;
SELECT public.get_all_winner_takes_all_sessions();

-- Step 16: Test creating a session
DO $$
DECLARE
    config_id UUID;
    session_id UUID;
BEGIN
    -- Get the $2 Winner Takes It All config
    SELECT id INTO config_id 
    FROM public.fixed_games_config 
    WHERE title = '$2 Winner Takes It All - Multi Target'
    LIMIT 1;
    
    IF config_id IS NOT NULL THEN
        -- Test creating a session
        SELECT public.create_winner_takes_all_session(config_id) INTO session_id;
        RAISE NOTICE '✅ Created test session for $2 Winner Takes It All: %', session_id;
        
        -- Test getting the session
        PERFORM public.get_winner_takes_all_session(session_id);
        RAISE NOTICE '✅ Successfully retrieved session: %', session_id;
        
        -- Clean up test session
        DELETE FROM public.winner_takes_all_sessions WHERE id = session_id;
        RAISE NOTICE '✅ Cleaned up test session: %', session_id;
    ELSE
        RAISE NOTICE '❌ $2 Winner Takes It All config not found';
    END IF;
END $$;

-- Final verification
SELECT 'Winner Takes It All setup complete!' as status;
