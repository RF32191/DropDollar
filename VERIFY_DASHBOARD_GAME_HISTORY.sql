-- ============================================================================
-- VERIFY AND FIX DASHBOARD GAME HISTORY
-- This script ensures game history is properly saved and displayed
-- ============================================================================

-- ============================================
-- 1. Check game_history table structure
-- ============================================
DO $$
DECLARE
    col_count INTEGER;
    game_count INTEGER;
    practice_count INTEGER;
    comp_count INTEGER;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_history') THEN
        RAISE NOTICE '❌ game_history table does NOT exist!';
        RAISE NOTICE '⚠️ This table is required for dashboard to show game results';
    ELSE
        -- Count columns
        SELECT COUNT(*) INTO col_count
        FROM information_schema.columns
        WHERE table_name = 'game_history';
        
        -- Count games
        SELECT COUNT(*) INTO game_count FROM public.game_history;
        SELECT COUNT(*) INTO practice_count FROM public.game_history WHERE is_practice = true;
        SELECT COUNT(*) INTO comp_count FROM public.game_history WHERE is_competition = true;
        
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ game_history table EXISTS';
        RAISE NOTICE '📊 Columns: %', col_count;
        RAISE NOTICE '🎮 Total games: %', game_count;
        RAISE NOTICE '🎯 Practice games: %', practice_count;
        RAISE NOTICE '🏆 Competition games: %', comp_count;
        RAISE NOTICE '========================================';
    END IF;
END $$;

-- ============================================
-- 2. Check user_game_history table
-- ============================================
DO $$
DECLARE
    game_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_game_history') THEN
        RAISE NOTICE '⚠️ user_game_history table does NOT exist';
    ELSE
        SELECT COUNT(*) INTO game_count FROM public.user_game_history;
        RAISE NOTICE '✅ user_game_history exists with % games', game_count;
    END IF;
END $$;

-- ============================================
-- 3. Verify RLS policies
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'game_history'
ORDER BY policyname;

-- ============================================
-- 4. Sample of recent game history
-- ============================================
SELECT 
    gh.id,
    u.username,
    u.email,
    gh.game_type,
    gh.score,
    gh.is_practice,
    gh.is_competition,
    gh.tokens_wagered,
    gh.tokens_won,
    gh.created_at
FROM public.game_history gh
LEFT JOIN public.users u ON gh.user_id = u.id
ORDER BY gh.created_at DESC
LIMIT 10;

-- ============================================
-- 5. Check if games from WTA/Hot Sell are saved
-- ============================================
DO $$
DECLARE
    wta_games INTEGER;
    hot_sell_games INTEGER;
    one_v_one_games INTEGER;
BEGIN
    -- Count WTA games in game_history
    SELECT COUNT(*) INTO wta_games
    FROM public.game_history
    WHERE tournament_type = 'winner_takes_all' OR game_type LIKE '%winner%';
    
    -- Count Hot Sell games
    SELECT COUNT(*) INTO hot_sell_games
    FROM public.game_history
    WHERE tournament_type = 'hot_sell' OR game_type LIKE '%hot_sell%';
    
    -- Count 1v1 games
    SELECT COUNT(*) INTO one_v_one_games
    FROM public.game_history
    WHERE tournament_type = '1v1' OR game_type LIKE '%1v1%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 COMPETITION GAMES IN game_history:';
    RAISE NOTICE '🏆 Winner Takes All: %', wta_games;
    RAISE NOTICE '🔥 Hot Sell: %', hot_sell_games;
    RAISE NOTICE '⚔️ 1v1: %', one_v_one_games;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 6. Fix: Ensure game_history has all columns
-- ============================================
DO $$
BEGIN
    -- Add tournament_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'tournament_type') THEN
        ALTER TABLE public.game_history ADD COLUMN tournament_type TEXT;
        RAISE NOTICE '✅ Added tournament_type column to game_history';
    END IF;
    
    -- Add game_session_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'game_session_id') THEN
        ALTER TABLE public.game_history ADD COLUMN game_session_id UUID;
        RAISE NOTICE '✅ Added game_session_id column to game_history';
    END IF;
    
    -- Ensure is_practice and is_competition exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'is_practice') THEN
        ALTER TABLE public.game_history ADD COLUMN is_practice BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_practice column to game_history';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'is_competition') THEN
        ALTER TABLE public.game_history ADD COLUMN is_competition BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_competition column to game_history';
    END IF;
    
    RAISE NOTICE '✅ game_history table structure verified';
END $$;

-- ============================================
-- 7. Verify/Fix RLS policies for game_history
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
DROP POLICY IF EXISTS "Service can insert game history" ON public.game_history;

-- Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own game history" 
ON public.game_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game history" 
ON public.game_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can insert game history" 
ON public.game_history FOR INSERT 
WITH CHECK (true);

-- ============================================
-- 8. Grant permissions
-- ============================================
GRANT SELECT, INSERT ON public.game_history TO authenticated, anon;

-- ============================================
-- 9. Final verification
-- ============================================
DO $$
DECLARE
    total_users INTEGER;
    users_with_games INTEGER;
    avg_games_per_user NUMERIC;
BEGIN
    SELECT COUNT(DISTINCT id) INTO total_users FROM public.users;
    SELECT COUNT(DISTINCT user_id) INTO users_with_games FROM public.game_history;
    
    IF users_with_games > 0 THEN
        SELECT ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0), 2) 
        INTO avg_games_per_user 
        FROM public.game_history;
    ELSE
        avg_games_per_user := 0;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DASHBOARD GAME HISTORY STATUS:';
    RAISE NOTICE '👥 Total users: %', total_users;
    RAISE NOTICE '🎮 Users with game history: %', users_with_games;
    RAISE NOTICE '📊 Avg games per user: %', avg_games_per_user;
    RAISE NOTICE '';
    
    IF users_with_games = 0 THEN
        RAISE NOTICE '⚠️ WARNING: No game history found!';
        RAISE NOTICE '💡 Games need to save to game_history table';
    ELSE
        RAISE NOTICE '✅ Game history is being saved!';
        RAISE NOTICE '✅ Dashboard should display game results';
    END IF;
    RAISE NOTICE '========================================';
END $$;

