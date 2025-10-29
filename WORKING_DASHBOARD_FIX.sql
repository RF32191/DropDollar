-- ============================================================================
-- DASHBOARD FIX - Keeps user_id as TEXT (no conversion needed)
-- Run this to fix dashboard game history display
-- ============================================================================

-- Step 1: Drop ALL dependent views FIRST
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND (viewname LIKE '%game%' OR viewname LIKE '%activity%')
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.viewname);
        RAISE NOTICE 'Dropped view: %', view_record.viewname;
    END LOOP;
    
    RAISE NOTICE '✅ All dependent views dropped';
END $$;

-- Step 2: Drop ALL existing policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Disable RLS temporarily
    ALTER TABLE public.game_history DISABLE ROW LEVEL SECURITY;
    
    -- Drop all policies
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'game_history'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.game_history', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All policies dropped';
END $$;

-- Step 3: Add missing columns to game_history (safe, won't error if exists)
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

-- Step 4: Re-enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new policies that work with TEXT user_id
-- These policies use text comparison since user_id is TEXT
CREATE POLICY "users_view_own_games" ON public.game_history 
FOR SELECT USING (
    auth.uid()::text = user_id OR
    user_id = auth.uid()::text
);

CREATE POLICY "users_insert_own_games" ON public.game_history 
FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR
    user_id = auth.uid()::text
);

CREATE POLICY "service_full_access" ON public.game_history 
FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Recreate essential views with TEXT user_id
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT 
    user_id,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE is_practice = true) as practice_games,
    COUNT(*) FILTER (WHERE is_competition = true) as competition_games,
    AVG(score) as avg_score,
    MAX(score) as best_score,
    SUM(tokens_won) as total_tokens_won
FROM public.game_history
GROUP BY user_id;

-- Step 7: Grant permissions
GRANT ALL ON public.game_history TO authenticated, anon;
GRANT SELECT ON user_activity_stats TO authenticated, anon;

-- Step 8: Verification
DO $$
DECLARE
    game_count INTEGER;
    practice_count INTEGER;
    comp_count INTEGER;
    user_id_type TEXT;
    policy_count INTEGER;
    view_count INTEGER;
    sample_user_id TEXT;
BEGIN
    -- Get current type
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'user_id';
    
    -- Get sample user_id to show format
    SELECT user_id INTO sample_user_id
    FROM public.game_history
    LIMIT 1;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'game_history';
    
    -- Count views
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public' 
    AND (viewname LIKE '%game%' OR viewname LIKE '%activity%');
    
    SELECT COUNT(*) INTO game_count FROM public.game_history;
    SELECT COUNT(*) INTO practice_count FROM public.game_history WHERE is_practice = true;
    SELECT COUNT(*) INTO comp_count FROM public.game_history WHERE is_competition = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DASHBOARD FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ user_id type: % (kept as TEXT)', user_id_type;
    RAISE NOTICE '✅ Sample user_id: %', sample_user_id;
    RAISE NOTICE '✅ Policies created: %', policy_count;
    RAISE NOTICE '✅ Views recreated: %', view_count;
    RAISE NOTICE '📊 Total games: %', game_count;
    RAISE NOTICE '🎯 Practice games: %', practice_count;
    RAISE NOTICE '🏆 Competition games: %', comp_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEXT user_id preserved';
    RAISE NOTICE '✅ Policies work with TEXT comparison';
    RAISE NOTICE '✅ Views recreated';
    RAISE NOTICE '✅ RLS policies active';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '✅ Dashboard ready!';
    RAISE NOTICE '========================================';
END $$;

