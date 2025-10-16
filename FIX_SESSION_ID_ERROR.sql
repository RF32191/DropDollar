-- QUICK FIX FOR SESSION_ID ERROR
-- This fixes the session_id column issue

-- 1. Check if game_sessions table exists and fix it
DO $$
BEGIN
    -- Drop the table if it exists with issues
    DROP TABLE IF EXISTS public.game_sessions CASCADE;
    
    -- Recreate the game_sessions table with correct structure
    CREATE TABLE public.game_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        game_type TEXT NOT NULL,
        session_type TEXT NOT NULL, -- practice, competition, tournament
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE,
        total_games INTEGER DEFAULT 0,
        total_score DECIMAL(10,2) DEFAULT 0,
        average_score DECIMAL(10,2) DEFAULT 0,
        tokens_spent INTEGER DEFAULT 0,
        tokens_won INTEGER DEFAULT 0,
        session_status TEXT DEFAULT 'active', -- active, completed, abandoned
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policy
    DROP POLICY IF EXISTS "game_sessions_all_policy" ON public.game_sessions;
    CREATE POLICY "game_sessions_all_policy" ON public.game_sessions
        FOR ALL USING (auth.uid() = user_id);
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON public.game_sessions(session_id);
    
    -- Grant permissions
    GRANT ALL ON public.game_sessions TO authenticated;
    
    RAISE NOTICE 'game_sessions table recreated successfully';
END $$;

-- 2. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_sessions'
ORDER BY ordinal_position;

-- 3. Test insert to verify it works
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test session
        INSERT INTO public.game_sessions (
            user_id, session_id, game_type, session_type, 
            total_games, total_score, average_score
        ) VALUES (
            test_user_id, 'test-session-123', 'sword-parry', 'practice',
            1, 1500.00, 1500.00
        );
        
        RAISE NOTICE 'Test session inserted successfully';
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 4. Show final status
SELECT 'game_sessions table fixed successfully!' as status;
