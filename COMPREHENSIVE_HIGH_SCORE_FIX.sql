-- COMPREHENSIVE HIGH SCORE FIX
-- This script fixes high score saving issues and ensures proper database triggers

-- ========================================
-- 1. CLEAN UP EXISTING TRIGGERS
-- ========================================

-- Drop all existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_high_score ON public.game_history;
DROP TRIGGER IF EXISTS update_high_scores_trigger ON public.game_sessions;
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.game_sessions;
DROP TRIGGER IF EXISTS update_game_statistics ON public.game_history;
DROP TRIGGER IF EXISTS update_high_score ON public.game_history;

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS update_high_score();
DROP FUNCTION IF EXISTS update_high_scores();
DROP FUNCTION IF EXISTS update_user_stats();
DROP FUNCTION IF EXISTS update_game_statistics();

-- ========================================
-- 2. ENSURE HIGH_SCORES TABLE EXISTS WITH CORRECT STRUCTURE
-- ========================================

-- Create high_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.high_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    best_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    best_accuracy DECIMAL(5,2) DEFAULT 0,
    best_reaction_time INTEGER DEFAULT 999999,
    last_score DECIMAL(10,2) DEFAULT 0,
    last_accuracy DECIMAL(5,2) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    practice_games INTEGER DEFAULT 0,
    competition_games INTEGER DEFAULT 0,
    listing_id TEXT,
    tournament_id UUID,
    hot_sell_id UUID,
    session_id UUID,
    difficulty_level TEXT DEFAULT 'normal',
    time_taken_seconds INTEGER DEFAULT 0,
    is_personal_best BOOLEAN DEFAULT false,
    is_global_record BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON public.high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);
CREATE INDEX IF NOT EXISTS idx_high_scores_best_score ON public.high_scores(game_type, best_score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_created_at ON public.high_scores(created_at DESC);

-- ========================================
-- 3. CREATE COMPREHENSIVE HIGH SCORE UPDATE FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION update_high_score_from_game_history()
RETURNS TRIGGER AS $$
DECLARE
    existing_record RECORD;
    is_new_best BOOLEAN := false;
    is_new_global BOOLEAN := false;
BEGIN
    -- Get existing high score record
    SELECT * INTO existing_record
    FROM public.high_scores
    WHERE user_id = NEW.user_id 
      AND game_type = NEW.game_type;
    
    -- Check if this is a new personal best
    IF existing_record IS NULL OR NEW.score > existing_record.best_score THEN
        is_new_best := true;
        
        -- Check if this is a new global record
        SELECT COUNT(*) INTO is_new_global
        FROM public.high_scores
        WHERE game_type = NEW.game_type 
          AND best_score >= NEW.score
          AND user_id != NEW.user_id;
        
        is_new_global := (is_new_global = 0);
    END IF;
    
    -- Insert or update high score record
    INSERT INTO public.high_scores (
        user_id, game_type, best_score, best_accuracy, best_reaction_time,
        last_score, last_accuracy, games_played, practice_games, competition_games,
        listing_id, tournament_id, hot_sell_id, session_id, difficulty_level,
        time_taken_seconds, is_personal_best, is_global_record
    )
    VALUES (
        NEW.user_id, NEW.game_type, 
        CASE WHEN is_new_best THEN NEW.score ELSE COALESCE(existing_record.best_score, 0) END,
        CASE WHEN is_new_best THEN COALESCE(NEW.accuracy, 0) ELSE COALESCE(existing_record.best_accuracy, 0) END,
        CASE WHEN is_new_best THEN COALESCE(NEW.avg_reaction_time, 999999) ELSE COALESCE(existing_record.best_reaction_time, 999999) END,
        NEW.score, COALESCE(NEW.accuracy, 0),
        COALESCE(existing_record.games_played, 0) + 1,
        COALESCE(existing_record.practice_games, 0) + CASE WHEN NEW.is_practice THEN 1 ELSE 0 END,
        COALESCE(existing_record.competition_games, 0) + CASE WHEN NEW.is_practice THEN 0 ELSE 1 END,
        NEW.listing_id, NEW.tournament_id, NEW.hot_sell_id, NEW.id,
        COALESCE(NEW.difficulty_level, 'normal'), COALESCE(NEW.game_duration, 60),
        is_new_best, is_new_global
    )
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
        best_score = GREATEST(high_scores.best_score, NEW.score),
        best_accuracy = GREATEST(high_scores.best_accuracy, COALESCE(NEW.accuracy, 0)),
        best_reaction_time = LEAST(high_scores.best_reaction_time, COALESCE(NEW.avg_reaction_time, 999999)),
        last_score = NEW.score,
        last_accuracy = COALESCE(NEW.accuracy, 0),
        games_played = high_scores.games_played + 1,
        practice_games = high_scores.practice_games + CASE WHEN NEW.is_practice THEN 1 ELSE 0 END,
        competition_games = high_scores.competition_games + CASE WHEN NEW.is_practice THEN 0 ELSE 1 END,
        listing_id = COALESCE(NEW.listing_id, high_scores.listing_id),
        tournament_id = COALESCE(NEW.tournament_id, high_scores.tournament_id),
        hot_sell_id = COALESCE(NEW.hot_sell_id, high_scores.hot_sell_id),
        session_id = NEW.id,
        difficulty_level = COALESCE(NEW.difficulty_level, high_scores.difficulty_level),
        time_taken_seconds = COALESCE(NEW.game_duration, high_scores.time_taken_seconds),
        is_personal_best = (NEW.score > high_scores.best_score),
        is_global_record = is_new_global,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. CREATE TRIGGER ON GAME_HISTORY TABLE
-- ========================================

-- Create trigger to update high scores when game_history records are inserted
CREATE TRIGGER trigger_update_high_score_from_game_history
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_high_score_from_game_history();

-- ========================================
-- 5. CREATE MANUAL HIGH SCORE UPDATE FUNCTION
-- ========================================

-- Function to manually update high scores (for testing and fixing existing data)
CREATE OR REPLACE FUNCTION update_all_high_scores()
RETURNS TEXT AS $$
DECLARE
    game_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Process all game_history records to update high scores
    FOR game_record IN 
        SELECT DISTINCT user_id, game_type, MAX(score) as best_score, MAX(accuracy) as best_accuracy, MIN(avg_reaction_time) as best_reaction_time
        FROM public.game_history
        GROUP BY user_id, game_type
    LOOP
        -- Insert or update high score
        INSERT INTO public.high_scores (
            user_id, game_type, best_score, best_accuracy, best_reaction_time,
            last_score, last_accuracy, games_played, practice_games, competition_games
        )
        VALUES (
            game_record.user_id, game_record.game_type, game_record.best_score,
            COALESCE(game_record.best_accuracy, 0), COALESCE(game_record.best_reaction_time, 999999),
            game_record.best_score, COALESCE(game_record.best_accuracy, 0),
            (SELECT COUNT(*) FROM public.game_history WHERE user_id = game_record.user_id AND game_type = game_record.game_type),
            (SELECT COUNT(*) FROM public.game_history WHERE user_id = game_record.user_id AND game_type = game_record.game_type AND is_practice = true),
            (SELECT COUNT(*) FROM public.game_history WHERE user_id = game_record.user_id AND game_type = game_record.game_type AND is_practice = false)
        )
        ON CONFLICT (user_id, game_type)
        DO UPDATE SET
            best_score = GREATEST(high_scores.best_score, game_record.best_score),
            best_accuracy = GREATEST(high_scores.best_accuracy, COALESCE(game_record.best_accuracy, 0)),
            best_reaction_time = LEAST(high_scores.best_reaction_time, COALESCE(game_record.best_reaction_time, 999999)),
            games_played = (SELECT COUNT(*) FROM public.game_history WHERE user_id = game_record.user_id AND game_type = game_record.game_type),
            practice_games = (SELECT COUNT(*) FROM public.game_history WHERE user_id = game_record.user_id AND game_type = game_record.game_type AND is_practice = true),
            competition_games = (SELECT COUNT(*) FROM public.game_history WHERE user_id = game_record.user_id AND game_type = game_record.game_type AND is_practice = false),
            updated_at = NOW();
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN 'Updated ' || updated_count || ' high score records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. CREATE RPC FUNCTIONS FOR FRONTEND
-- ========================================

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_user_high_scores(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(uuid);
DROP FUNCTION IF EXISTS get_global_leaderboard(TEXT);
DROP FUNCTION IF EXISTS update_all_high_scores();

-- Function to get user high scores
CREATE OR REPLACE FUNCTION get_user_high_scores(user_uuid UUID)
RETURNS TABLE (
    game_type TEXT,
    best_score DECIMAL(10,2),
    best_accuracy DECIMAL(5,2),
    best_reaction_time INTEGER,
    last_score DECIMAL(10,2),
    last_accuracy DECIMAL(5,2),
    games_played INTEGER,
    practice_games INTEGER,
    competition_games INTEGER,
    is_personal_best BOOLEAN,
    is_global_record BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hs.game_type,
        hs.best_score,
        hs.best_accuracy,
        hs.best_reaction_time,
        hs.last_score,
        hs.last_accuracy,
        hs.games_played,
        hs.practice_games,
        hs.competition_games,
        hs.is_personal_best,
        hs.is_global_record,
        hs.created_at,
        hs.updated_at
    FROM public.high_scores hs
    WHERE hs.user_id = user_uuid
    ORDER BY hs.game_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get global leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard(game_type_param TEXT)
RETURNS TABLE (
    rank INTEGER,
    user_id UUID,
    username TEXT,
    best_score DECIMAL(10,2),
    best_accuracy DECIMAL(5,2),
    games_played INTEGER,
    is_global_record BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY hs.best_score DESC)::INTEGER as rank,
        hs.user_id,
        u.username,
        hs.best_score,
        hs.best_accuracy,
        hs.games_played,
        hs.is_global_record,
        hs.created_at
    FROM public.high_scores hs
    JOIN public.users u ON hs.user_id = u.id
    WHERE hs.game_type = game_type_param
    ORDER BY hs.best_score DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. ENABLE RLS AND GRANT PERMISSIONS
-- ========================================

-- Enable RLS on high_scores table
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can insert own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can update own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Public can view high scores" ON public.high_scores;

CREATE POLICY "Users can view own high scores" ON public.high_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own high scores" ON public.high_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own high scores" ON public.high_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view high scores" ON public.high_scores FOR SELECT USING (true); -- For leaderboards

-- Grant permissions
GRANT ALL ON public.high_scores TO authenticated;
GRANT SELECT ON public.high_scores TO anon;
GRANT EXECUTE ON FUNCTION get_user_high_scores TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard TO anon;
GRANT EXECUTE ON FUNCTION update_all_high_scores TO authenticated;

-- ========================================
-- 8. RUN MANUAL UPDATE TO FIX EXISTING DATA
-- ========================================

-- Update all existing high scores from game_history
SELECT update_all_high_scores();

-- ========================================
-- 9. VERIFY THE FIX
-- ========================================

-- Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name LIKE '%high_score%';

-- Check high_scores table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'high_scores'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'high_scores';

-- ========================================
-- 10. SUMMARY
-- ========================================

SELECT 'High Score Fix Complete!' as status,
       'High scores will now be automatically updated when game_history records are inserted' as message,
       'Run SELECT update_all_high_scores(); to fix existing data' as note;
