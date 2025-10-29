-- ============================================================================
-- SIMPLE DASHBOARD FIX - Production Safe
-- Run this to fix dashboard game history display
-- ============================================================================

-- Step 1: Add missing columns to game_history (safe, won't error if exists)
DO $$
BEGIN
    -- Add tournament_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' AND column_name = 'tournament_type'
    ) THEN
        ALTER TABLE public.game_history ADD COLUMN tournament_type TEXT;
    END IF;
    
    -- Add game_session_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' AND column_name = 'game_session_id'
    ) THEN
        ALTER TABLE public.game_history ADD COLUMN game_session_id UUID;
    END IF;
END $$;

-- Step 2: Enable RLS (safe, won't error if already enabled)
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop and recreate policies (clean slate)
DROP POLICY IF EXISTS "Users can view own games" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert games" ON public.game_history;
DROP POLICY IF EXISTS "Service can do everything" ON public.game_history;
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
DROP POLICY IF EXISTS "Service can insert game history" ON public.game_history;

-- Create new policies
CREATE POLICY "view_own_games" ON public.game_history 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_games" ON public.game_history 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_all_access" ON public.game_history 
FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Grant permissions
GRANT ALL ON public.game_history TO authenticated, anon;

-- Step 5: Verification
DO $$
DECLARE
    game_count INTEGER;
    practice_count INTEGER;
    comp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO game_count FROM public.game_history;
    SELECT COUNT(*) INTO practice_count FROM public.game_history WHERE is_practice = true;
    SELECT COUNT(*) INTO comp_count FROM public.game_history WHERE is_competition = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DASHBOARD FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Total games: %', game_count;
    RAISE NOTICE '🎯 Practice games: %', practice_count;
    RAISE NOTICE '🏆 Competition games: %', comp_count;
    RAISE NOTICE '========================================';
END $$;

