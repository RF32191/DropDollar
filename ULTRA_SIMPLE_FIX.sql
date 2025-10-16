-- ULTRA SIMPLE FIX - WORK WITH EXISTING TABLES
-- This creates minimal tables that actually work with your existing structure

-- 1. Drop problematic triggers and functions first
DROP TRIGGER IF EXISTS trigger_update_game_stats ON public.game_history;
DROP FUNCTION IF EXISTS update_game_stats();

-- 2. Check what columns exist in high_scores table
DO $$
BEGIN
    -- Check if high_scores table exists and what columns it has
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'high_scores'
    ) THEN
        -- Drop the existing high_scores table if it has wrong structure
        DROP TABLE public.high_scores CASCADE;
        RAISE NOTICE 'Dropped existing high_scores table with wrong structure';
    END IF;
END $$;

-- 3. Create simple high_scores table with correct structure
CREATE TABLE public.high_scores (
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

-- 4. Check what columns exist in user_game_stats table
DO $$
BEGIN
    -- Check if user_game_stats table exists and what columns it has
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_game_stats'
    ) THEN
        -- Drop the existing user_game_stats table if it has wrong structure
        DROP TABLE public.user_game_stats CASCADE;
        RAISE NOTICE 'Dropped existing user_game_stats table with wrong structure';
    END IF;
END $$;

-- 5. Create simple user_game_stats table with correct structure
CREATE TABLE public.user_game_stats (
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

-- 6. Enable RLS
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DROP POLICY IF EXISTS "high_scores_policy" ON public.high_scores;
DROP POLICY IF EXISTS "user_game_stats_policy" ON public.user_game_stats;

CREATE POLICY "high_scores_policy" ON public.high_scores
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_game_stats_policy" ON public.user_game_stats
    FOR ALL USING (auth.uid() = user_id);

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON public.high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_type ON public.user_game_stats(game_type);

-- 9. Create simple trigger function that works with existing game_history structure
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

-- 10. Create trigger
CREATE TRIGGER trigger_update_game_stats
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_game_stats();

-- 11. Grant permissions
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

-- 13. Verify everything works
SELECT 'Ultra Simple Database Setup Complete!' as status;

-- Show table structures
SELECT 'game_history structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

SELECT 'high_scores structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'high_scores'
ORDER BY ordinal_position;

SELECT 'user_game_stats structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_game_stats'
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
