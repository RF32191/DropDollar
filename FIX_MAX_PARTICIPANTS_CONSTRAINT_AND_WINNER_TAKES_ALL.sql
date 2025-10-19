-- Fix max_participants constraint for Winner Takes It All tournaments
-- This script removes the NOT NULL constraint and creates Winner Takes It All configs

-- Step 1: Remove the NOT NULL constraint from max_participants
ALTER TABLE public.fixed_games_config ALTER COLUMN max_participants DROP NOT NULL;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Anyone can view winner takes all participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.winner_takes_all_participants;

-- Step 3: Recreate RLS Policies for winner_takes_all_sessions
CREATE POLICY "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert winner takes all sessions" ON public.winner_takes_all_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions FOR UPDATE USING (auth.role() = 'authenticated');

-- Step 4: Recreate RLS Policies for winner_takes_all_participants
CREATE POLICY "Anyone can view winner takes all participants" ON public.winner_takes_all_participants FOR SELECT USING (true);
CREATE POLICY "Users can insert their own participation" ON public.winner_takes_all_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON public.winner_takes_all_participants FOR UPDATE USING (auth.uid() = user_id);

-- Step 5: Create Winner Takes It All configurations
-- First, delete any existing Winner Takes It All configs to avoid duplicates
DELETE FROM public.fixed_games_config WHERE tournament_type = 'winner_takes_all';

-- Insert Winner Takes It All configurations
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
    NULL, -- No max participants for Winner Takes It All
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

-- Step 6: Verify the configurations were created
SELECT 
    'Winner Takes It All Configurations Created' as status,
    COUNT(*) as total_configs
FROM public.fixed_games_config 
WHERE tournament_type = 'winner_takes_all';

-- Step 7: Show all Winner Takes It All configs
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

-- Step 8: Test the functions
SELECT 'Testing get_all_winner_takes_all_sessions...' as test_step;
SELECT public.get_all_winner_takes_all_sessions();

-- Step 9: Test creating a session for the $2 Winner Takes It All
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

-- Step 10: Final verification
SELECT 'Winner Takes It All setup complete!' as status;
