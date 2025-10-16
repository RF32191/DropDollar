-- FIX FOR EXISTING TABLE STRUCTURE
-- This handles the case where game_history table already exists but has different columns

-- 1. Check what columns actually exist in game_history
DO $$
BEGIN
    -- Check if difficulty_level column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'difficulty_level'
    ) THEN
        -- Add missing columns to existing table
        ALTER TABLE public.game_history 
        ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS game_duration INTEGER,
        ADD COLUMN IF NOT EXISTS tokens_wagered INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tokens_won INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS listing_id TEXT,
        ADD COLUMN IF NOT EXISTS entry_number INTEGER,
        ADD COLUMN IF NOT EXISTS match_id UUID,
        ADD COLUMN IF NOT EXISTS opponent_id UUID,
        ADD COLUMN IF NOT EXISTS tournament_id TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added missing columns to existing game_history table';
    ELSE
        RAISE NOTICE 'game_history table already has all required columns';
    END IF;
END $$;

-- 2. Ensure high_scores table exists with correct structure
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

-- 3. Ensure user_game_stats table exists with correct structure
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

-- 4. Enable RLS on all tables
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies and create new ones
DROP POLICY IF EXISTS "game_history_policy" ON public.game_history;
DROP POLICY IF EXISTS "high_scores_policy" ON public.high_scores;
DROP POLICY IF EXISTS "user_game_stats_policy" ON public.user_game_stats;

CREATE POLICY "game_history_policy" ON public.game_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "high_scores_policy" ON public.high_scores
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_game_stats_policy" ON public.user_game_stats
    FOR ALL USING (auth.uid() = user_id);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON public.high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_type ON public.user_game_stats(game_type);

-- 7. Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_game_stats ON public.game_history;
DROP FUNCTION IF EXISTS update_game_stats();

-- 8. Create simple trigger function
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update high_scores table
    INSERT INTO public.high_scores (user_id, game_type, best_score, best_accuracy, best_reaction_time, last_score, last_accuracy, games_played, practice_games, competition_games)
    VALUES (
        NEW.user_id, 
        NEW.game_type, 
        NEW.score, 
        COALESCE(NEW.accuracy, 0), 
        NEW.avg_reaction_time, 
        NEW.score, 
        COALESCE(NEW.accuracy, 0), 
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
        last_accuracy = COALESCE(NEW.accuracy, 0),
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
        NEW.score, COALESCE(NEW.accuracy, 0), NEW.avg_reaction_time, NEW.score,
        COALESCE(NEW.tokens_wagered, 0), COALESCE(NEW.tokens_won, 0), 0,
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

-- 9. Create trigger
CREATE TRIGGER trigger_update_game_stats
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_game_stats();

-- 10. Grant permissions
GRANT ALL ON public.game_history TO authenticated;
GRANT ALL ON public.high_scores TO authenticated;
GRANT ALL ON public.user_game_stats TO authenticated;

-- 11. Test with sample data (using only existing columns)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test practice game (only using columns that definitely exist)
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time, 
            is_practice, created_at
        ) VALUES (
            test_user_id, 'sword-parry', 1500.00, 88.5, 250, 
            true, NOW()
        );
        
        -- Insert test competition game
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time,
            is_practice, created_at
        ) VALUES (
            test_user_id, 'quick-click', 2000.00, 92.0, 180,
            false, NOW()
        );
        
        RAISE NOTICE 'Test data inserted successfully for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 12. Verify everything works
SELECT 'Database Setup Complete!' as status;

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

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
