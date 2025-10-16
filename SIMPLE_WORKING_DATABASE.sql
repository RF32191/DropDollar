-- SIMPLE WORKING DATABASE SETUP
-- This creates a minimal, working database structure that actually works

-- 1. Drop existing problematic tables/functions
DROP TABLE IF EXISTS public.game_sessions CASCADE;
DROP FUNCTION IF EXISTS get_user_game_history(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(UUID);
DROP FUNCTION IF EXISTS get_user_practice_history(UUID);
DROP FUNCTION IF EXISTS get_user_competition_history(UUID);
DROP FUNCTION IF EXISTS get_user_game_statistics(UUID);
DROP FUNCTION IF EXISTS update_game_statistics();
DROP TRIGGER IF EXISTS trigger_update_game_statistics ON public.game_history;

-- 2. Create simple game_history table (main table)
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    is_practice BOOLEAN NOT NULL DEFAULT true,
    listing_id TEXT,
    entry_number INTEGER,
    match_id UUID,
    opponent_id UUID,
    tournament_id TEXT,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    tokens_wagered INTEGER DEFAULT 0,
    tokens_won INTEGER DEFAULT 0,
    game_duration INTEGER,
    difficulty_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create simple high_scores table
CREATE TABLE IF NOT EXISTS public.high_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    best_score DECIMAL(10,2) NOT NULL,
    best_accuracy DECIMAL(5,2),
    best_reaction_time INTEGER,
    last_score DECIMAL(10,2),
    last_accuracy DECIMAL(5,2),
    games_played INTEGER DEFAULT 0,
    practice_games INTEGER DEFAULT 0,
    competition_games INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- 4. Create simple user_game_stats table
CREATE TABLE IF NOT EXISTS public.user_game_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    total_games_played INTEGER DEFAULT 0,
    practice_games_played INTEGER DEFAULT 0,
    competition_games_played INTEGER DEFAULT 0,
    best_score DECIMAL(10,2) DEFAULT 0,
    best_accuracy DECIMAL(5,2) DEFAULT 0,
    best_reaction_time INTEGER,
    average_score DECIMAL(10,2) DEFAULT 0,
    total_tokens_wagered INTEGER DEFAULT 0,
    total_tokens_won INTEGER DEFAULT 0,
    total_prize_money DECIMAL(10,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    last_played_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- 5. Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies
DROP POLICY IF EXISTS "game_history_all_policy" ON public.game_history;
DROP POLICY IF EXISTS "high_scores_all_policy" ON public.high_scores;
DROP POLICY IF EXISTS "user_game_stats_all_policy" ON public.user_game_stats;

-- 7. Create simple RLS policies
CREATE POLICY "game_history_policy" ON public.game_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "high_scores_policy" ON public.high_scores
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_game_stats_policy" ON public.user_game_stats
    FOR ALL USING (auth.uid() = user_id);

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON public.high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_type ON public.user_game_stats(game_type);

-- 9. Create simple trigger function
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update high_scores table
    INSERT INTO public.high_scores (user_id, game_type, best_score, best_accuracy, best_reaction_time, last_score, last_accuracy, games_played, practice_games, competition_games)
    VALUES (
        NEW.user_id, 
        NEW.game_type, 
        NEW.score, 
        NEW.accuracy, 
        NEW.avg_reaction_time, 
        NEW.score, 
        NEW.accuracy, 
        1, 
        CASE WHEN NEW.is_practice THEN 1 ELSE 0 END,
        CASE WHEN NEW.is_practice THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
        best_score = GREATEST(high_scores.best_score, NEW.score),
        best_accuracy = GREATEST(high_scores.best_accuracy, COALESCE(NEW.accuracy, 0)),
        best_reaction_time = LEAST(high_scores.best_reaction_time, COALESCE(NEW.avg_reaction_time, 999999)),
        last_score = NEW.score,
        last_accuracy = NEW.accuracy,
        games_played = high_scores.games_played + 1,
        practice_games = high_scores.practice_games + CASE WHEN NEW.is_practice THEN 1 ELSE 0 END,
        competition_games = high_scores.competition_games + CASE WHEN NEW.is_practice THEN 0 ELSE 1 END,
        updated_at = NOW();
    
    -- Update user_game_stats table
    INSERT INTO public.user_game_stats (
        user_id, game_type, total_games_played, practice_games_played, competition_games_played,
        best_score, best_accuracy, best_reaction_time, average_score,
        total_tokens_wagered, total_tokens_won, total_prize_money,
        last_played_at, created_at, updated_at
    )
    VALUES (
        NEW.user_id, NEW.game_type, 1,
        CASE WHEN NEW.is_practice THEN 1 ELSE 0 END,
        CASE WHEN NEW.is_practice THEN 0 ELSE 1 END,
        NEW.score, NEW.accuracy, NEW.avg_reaction_time, NEW.score,
        NEW.tokens_wagered, NEW.tokens_won, 0,
        NEW.created_at, NEW.created_at, NEW.created_at
    )
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
        total_games_played = user_game_stats.total_games_played + 1,
        practice_games_played = user_game_stats.practice_games_played + CASE WHEN NEW.is_practice THEN 1 ELSE 0 END,
        competition_games_played = user_game_stats.competition_games_played + CASE WHEN NEW.is_practice THEN 0 ELSE 1 END,
        best_score = GREATEST(user_game_stats.best_score, NEW.score),
        best_accuracy = GREATEST(user_game_stats.best_accuracy, COALESCE(NEW.accuracy, 0)),
        best_reaction_time = LEAST(user_game_stats.best_reaction_time, COALESCE(NEW.avg_reaction_time, 999999)),
        average_score = (user_game_stats.average_score * user_game_stats.total_games_played + NEW.score) / (user_game_stats.total_games_played + 1),
        total_tokens_wagered = user_game_stats.total_tokens_wagered + COALESCE(NEW.tokens_wagered, 0),
        total_tokens_won = user_game_stats.total_tokens_won + COALESCE(NEW.tokens_won, 0),
        last_played_at = NEW.created_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger
CREATE TRIGGER trigger_update_game_stats
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_game_stats();

-- 11. Grant permissions
GRANT ALL ON public.game_history TO authenticated;
GRANT ALL ON public.high_scores TO authenticated;
GRANT ALL ON public.user_game_stats TO authenticated;

-- 12. Test with sample data
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test practice game
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time, 
            is_practice, game_duration, difficulty_level, tokens_wagered, tokens_won
        ) VALUES (
            test_user_id, 'sword-parry', 1500.00, 88.5, 250, 
            true, 60, 1, 0, 0
        );
        
        -- Insert test competition game
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time,
            is_practice, listing_id, entry_number, entry_fee, 
            tokens_wagered, tokens_won, game_duration
        ) VALUES (
            test_user_id, 'quick-click', 2000.00, 92.0, 180,
            false, 'test-listing-123', 1, 1.00, 1, 2, 60
        );
        
        RAISE NOTICE 'Test data inserted successfully for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 13. Verify everything works
SELECT 'Simple Database Setup Complete!' as status;

-- Show table counts
SELECT 
    'game_history' as table_name, 
    count(*) as row_count 
FROM public.game_history
UNION ALL
SELECT 
    'high_scores' as table_name, 
    count(*) as row_count 
FROM public.high_scores
UNION ALL
SELECT 
    'user_game_stats' as table_name, 
    count(*) as row_count 
FROM public.user_game_stats;
