-- ============================================================================
-- ULTIMATE DASHBOARD FIX - Works with ANY user_id type (UUID or TEXT)
-- Run this to fix dashboard game history display
-- ============================================================================

-- Step 1: Check and fix user_id column type
DO $$
DECLARE
    user_id_type TEXT;
BEGIN
    -- Get the data type of user_id column
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'user_id';
    
    RAISE NOTICE 'Current user_id type: %', user_id_type;
    
    -- If user_id is TEXT, convert it to UUID for consistency
    IF user_id_type = 'text' OR user_id_type = 'character varying' THEN
        RAISE NOTICE 'Converting user_id from TEXT to UUID...';
        
        -- Disable RLS temporarily for the conversion
        ALTER TABLE public.game_history DISABLE ROW LEVEL SECURITY;
        
        -- Convert the column type
        ALTER TABLE public.game_history 
        ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
        
        RAISE NOTICE '✅ user_id converted to UUID';
    ELSE
        RAISE NOTICE '✅ user_id is already UUID type';
    END IF;
END $$;

-- Step 2: Add missing columns to game_history (safe, won't error if exists)
DO $$
BEGIN
    -- Add tournament_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' AND column_name = 'tournament_type'
    ) THEN
        ALTER TABLE public.game_history ADD COLUMN tournament_type TEXT;
        RAISE NOTICE '✅ Added tournament_type column';
    END IF;
    
    -- Add game_session_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' AND column_name = 'game_session_id'
    ) THEN
        ALTER TABLE public.game_history ADD COLUMN game_session_id UUID;
        RAISE NOTICE '✅ Added game_session_id column';
    END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies (clean slate)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'game_history'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.game_history', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 5: Create new policies (now user_id is UUID, so no casting needed)
CREATE POLICY "users_view_own_games" ON public.game_history 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_games" ON public.game_history 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_full_access" ON public.game_history 
FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Grant permissions
GRANT ALL ON public.game_history TO authenticated, anon;

-- Step 7: Verification
DO $$
DECLARE
    game_count INTEGER;
    practice_count INTEGER;
    comp_count INTEGER;
    user_id_type TEXT;
BEGIN
    -- Get current type
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'user_id';
    
    SELECT COUNT(*) INTO game_count FROM public.game_history;
    SELECT COUNT(*) INTO practice_count FROM public.game_history WHERE is_practice = true;
    SELECT COUNT(*) INTO comp_count FROM public.game_history WHERE is_competition = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DASHBOARD FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ user_id type: %', user_id_type;
    RAISE NOTICE '📊 Total games: %', game_count;
    RAISE NOTICE '🎯 Practice games: %', practice_count;
    RAISE NOTICE '🏆 Competition games: %', comp_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS policies created';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '✅ Dashboard ready!';
    RAISE NOTICE '========================================';
END $$;

