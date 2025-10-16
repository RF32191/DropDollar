-- COMPREHENSIVE GAME HISTORY SYSTEM
-- Complete user-specific game data storage like transaction history
-- This ensures ALL game data is permanently stored in Supabase

-- 1. Drop existing functions and triggers to avoid conflicts
DROP FUNCTION IF EXISTS get_user_game_history(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(uuid);
DROP FUNCTION IF EXISTS get_user_game_history(uuid);
DROP FUNCTION IF EXISTS update_high_score();
DROP TRIGGER IF EXISTS trigger_update_high_score ON public.game_history;

-- 2. Create comprehensive game_history table (main table for all games)
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
    game_duration INTEGER, -- in seconds
    difficulty_level INTEGER DEFAULT 1,
    game_session_id TEXT,
    device_info JSONB,
    location_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create practice_games table (specific to practice mode)
CREATE TABLE IF NOT EXISTS public.practice_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    game_duration INTEGER,
    difficulty_level INTEGER DEFAULT 1,
    attempts_count INTEGER DEFAULT 1,
    improvement_percentage DECIMAL(5,2),
    best_score_session BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create competition_games table (specific to competitions/tournaments)
CREATE TABLE IF NOT EXISTS public.competition_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    listing_id TEXT NOT NULL,
    entry_number INTEGER NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL,
    tokens_wagered INTEGER NOT NULL,
    tokens_won INTEGER DEFAULT 0,
    match_id UUID,
    opponent_id UUID,
    tournament_id TEXT,
    rank_position INTEGER,
    prize_amount DECIMAL(10,2) DEFAULT 0,
    game_duration INTEGER,
    competition_status TEXT DEFAULT 'completed', -- completed, forfeited, disqualified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create user_game_stats table (aggregated statistics)
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

-- 6. Create high_scores table (best scores per game type)
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

-- 7. Create game_sessions table (for tracking game sessions)
CREATE TABLE IF NOT EXISTS public.game_sessions (
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

-- 8. Enable RLS on all tables
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies
DROP POLICY IF EXISTS "game_history_insert_policy" ON public.game_history;
DROP POLICY IF EXISTS "game_history_select_policy" ON public.game_history;
DROP POLICY IF EXISTS "game_history_update_policy" ON public.game_history;
DROP POLICY IF EXISTS "game_history_delete_policy" ON public.game_history;
DROP POLICY IF EXISTS "high_scores_insert_policy" ON public.high_scores;
DROP POLICY IF EXISTS "high_scores_select_policy" ON public.high_scores;
DROP POLICY IF EXISTS "high_scores_update_policy" ON public.high_scores;
DROP POLICY IF EXISTS "high_scores_delete_policy" ON public.high_scores;

-- 10. Create comprehensive RLS policies for all tables
-- Game History Policies
CREATE POLICY "game_history_all_policy" ON public.game_history
    FOR ALL USING (auth.uid() = user_id);

-- Practice Games Policies
CREATE POLICY "practice_games_all_policy" ON public.practice_games
    FOR ALL USING (auth.uid() = user_id);

-- Competition Games Policies
CREATE POLICY "competition_games_all_policy" ON public.competition_games
    FOR ALL USING (auth.uid() = user_id);

-- User Game Stats Policies
CREATE POLICY "user_game_stats_all_policy" ON public.user_game_stats
    FOR ALL USING (auth.uid() = user_id);

-- High Scores Policies
CREATE POLICY "high_scores_all_policy" ON public.high_scores
    FOR ALL USING (auth.uid() = user_id);

-- Game Sessions Policies
CREATE POLICY "game_sessions_all_policy" ON public.game_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 11. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_is_practice ON public.game_history(is_practice);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_listing_id ON public.game_history(listing_id);

CREATE INDEX IF NOT EXISTS idx_practice_games_user_id ON public.practice_games(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_games_game_type ON public.practice_games(game_type);
CREATE INDEX IF NOT EXISTS idx_practice_games_created_at ON public.practice_games(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competition_games_user_id ON public.competition_games(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_games_listing_id ON public.competition_games(listing_id);
CREATE INDEX IF NOT EXISTS idx_competition_games_tournament_id ON public.competition_games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_competition_games_created_at ON public.competition_games(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_type ON public.user_game_stats(game_type);

CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON public.high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON public.game_sessions(session_id);

-- 12. Create comprehensive trigger function for updating all related tables
CREATE OR REPLACE FUNCTION update_game_statistics()
RETURNS TRIGGER AS $$
DECLARE
    is_practice_game BOOLEAN;
    current_stats RECORD;
    new_best_score BOOLEAN := false;
    new_best_accuracy BOOLEAN := false;
    new_best_reaction BOOLEAN := false;
BEGIN
    is_practice_game := NEW.is_practice;
    
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
        CASE WHEN is_practice_game THEN 1 ELSE 0 END,
        CASE WHEN is_practice_game THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
        best_score = GREATEST(high_scores.best_score, NEW.score),
        best_accuracy = GREATEST(high_scores.best_accuracy, COALESCE(NEW.accuracy, 0)),
        best_reaction_time = LEAST(high_scores.best_reaction_time, COALESCE(NEW.avg_reaction_time, 999999)),
        last_score = NEW.score,
        last_accuracy = NEW.accuracy,
        games_played = high_scores.games_played + 1,
        practice_games = high_scores.practice_games + CASE WHEN is_practice_game THEN 1 ELSE 0 END,
        competition_games = high_scores.competition_games + CASE WHEN is_practice_game THEN 0 ELSE 1 END,
        updated_at = NOW();
    
    -- Insert into specific practice or competition table
    IF is_practice_game THEN
        INSERT INTO public.practice_games (
            user_id, game_type, score, accuracy, avg_reaction_time, 
            game_duration, difficulty_level, attempts_count, 
            best_score_session, created_at
        )
        VALUES (
            NEW.user_id, NEW.game_type, NEW.score, NEW.accuracy, NEW.avg_reaction_time,
            NEW.game_duration, NEW.difficulty_level, 1, false, NEW.created_at
        );
    ELSE
        INSERT INTO public.competition_games (
            user_id, game_type, score, accuracy, avg_reaction_time,
            listing_id, entry_number, entry_fee, tokens_wagered, tokens_won,
            match_id, opponent_id, tournament_id, game_duration,
            competition_status, created_at
        )
        VALUES (
            NEW.user_id, NEW.game_type, NEW.score, NEW.accuracy, NEW.avg_reaction_time,
            NEW.listing_id, NEW.entry_number, NEW.entry_fee, NEW.tokens_wagered, NEW.tokens_won,
            NEW.match_id, NEW.opponent_id, NEW.tournament_id, NEW.game_duration,
            'completed', NEW.created_at
        );
    END IF;
    
    -- Update user_game_stats table
    INSERT INTO public.user_game_stats (
        user_id, game_type, total_games_played, practice_games_played, competition_games_played,
        best_score, best_accuracy, best_reaction_time, average_score,
        total_tokens_wagered, total_tokens_won, total_prize_money,
        last_played_at, created_at, updated_at
    )
    VALUES (
        NEW.user_id, NEW.game_type, 1,
        CASE WHEN is_practice_game THEN 1 ELSE 0 END,
        CASE WHEN is_practice_game THEN 0 ELSE 1 END,
        NEW.score, NEW.accuracy, NEW.avg_reaction_time, NEW.score,
        NEW.tokens_wagered, NEW.tokens_won, 0,
        NEW.created_at, NEW.created_at, NEW.created_at
    )
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
        total_games_played = user_game_stats.total_games_played + 1,
        practice_games_played = user_game_stats.practice_games_played + CASE WHEN is_practice_game THEN 1 ELSE 0 END,
        competition_games_played = user_game_stats.competition_games_played + CASE WHEN is_practice_game THEN 0 ELSE 1 END,
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

-- 13. Create trigger to automatically update all statistics
CREATE TRIGGER trigger_update_game_statistics
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_game_statistics();

-- 14. Create RPC functions for comprehensive data retrieval
CREATE OR REPLACE FUNCTION get_user_game_history(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    game_type TEXT,
    score DECIMAL(10,2),
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    is_practice BOOLEAN,
    listing_id TEXT,
    entry_number INTEGER,
    match_id UUID,
    opponent_id UUID,
    tournament_id TEXT,
    entry_fee DECIMAL(10,2),
    tokens_wagered INTEGER,
    tokens_won INTEGER,
    game_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gh.id, gh.game_type, gh.score, gh.accuracy, gh.avg_reaction_time,
        gh.is_practice, gh.listing_id, gh.entry_number, gh.match_id, gh.opponent_id,
        gh.tournament_id, gh.entry_fee, gh.tokens_wagered, gh.tokens_won,
        gh.game_duration, gh.created_at
    FROM public.game_history gh
    WHERE gh.user_id = user_uuid
    ORDER BY gh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_practice_history(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    game_type TEXT,
    score DECIMAL(10,2),
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    game_duration INTEGER,
    difficulty_level INTEGER,
    attempts_count INTEGER,
    improvement_percentage DECIMAL(5,2),
    best_score_session BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg.id, pg.game_type, pg.score, pg.accuracy, pg.avg_reaction_time,
        pg.game_duration, pg.difficulty_level, pg.attempts_count,
        pg.improvement_percentage, pg.best_score_session, pg.created_at
    FROM public.practice_games pg
    WHERE pg.user_id = user_uuid
    ORDER BY pg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_competition_history(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    game_type TEXT,
    score DECIMAL(10,2),
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    listing_id TEXT,
    entry_number INTEGER,
    entry_fee DECIMAL(10,2),
    tokens_wagered INTEGER,
    tokens_won INTEGER,
    match_id UUID,
    opponent_id UUID,
    tournament_id TEXT,
    rank_position INTEGER,
    prize_amount DECIMAL(10,2),
    competition_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cg.id, cg.game_type, cg.score, cg.accuracy, cg.avg_reaction_time,
        cg.listing_id, cg.entry_number, cg.entry_fee, cg.tokens_wagered, cg.tokens_won,
        cg.match_id, cg.opponent_id, cg.tournament_id, cg.rank_position,
        cg.prize_amount, cg.competition_status, cg.created_at
    FROM public.competition_games cg
    WHERE cg.user_id = user_uuid
    ORDER BY cg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_game_statistics(user_uuid UUID)
RETURNS TABLE (
    game_type TEXT,
    total_games_played INTEGER,
    practice_games_played INTEGER,
    competition_games_played INTEGER,
    best_score DECIMAL(10,2),
    best_accuracy DECIMAL(5,2),
    best_reaction_time INTEGER,
    average_score DECIMAL(10,2),
    total_tokens_wagered INTEGER,
    total_tokens_won INTEGER,
    total_prize_money DECIMAL(10,2),
    win_rate DECIMAL(5,2),
    last_played_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ugs.game_type, ugs.total_games_played, ugs.practice_games_played, ugs.competition_games_played,
        ugs.best_score, ugs.best_accuracy, ugs.best_reaction_time, ugs.average_score,
        ugs.total_tokens_wagered, ugs.total_tokens_won, ugs.total_prize_money,
        ugs.win_rate, ugs.last_played_at
    FROM public.user_game_stats ugs
    WHERE ugs.user_id = user_uuid
    ORDER BY ugs.total_games_played DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    competition_games INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hs.game_type, hs.best_score, hs.best_accuracy, hs.best_reaction_time,
        hs.last_score, hs.last_accuracy, hs.games_played,
        hs.practice_games, hs.competition_games
    FROM public.high_scores hs
    WHERE hs.user_id = user_uuid
    ORDER BY hs.best_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Grant necessary permissions
GRANT ALL ON public.game_history TO authenticated;
GRANT ALL ON public.practice_games TO authenticated;
GRANT ALL ON public.competition_games TO authenticated;
GRANT ALL ON public.user_game_stats TO authenticated;
GRANT ALL ON public.high_scores TO authenticated;
GRANT ALL ON public.game_sessions TO authenticated;

-- 16. Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_user_game_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_practice_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_competition_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_game_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_high_scores(UUID) TO authenticated;

-- 17. Create a test insert to verify everything works
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID (replace with actual user ID if needed)
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

-- 18. Verify the system works
SELECT 'Comprehensive Game History System Created Successfully!' as status;

-- Show table counts
SELECT 
    'game_history' as table_name, 
    count(*) as row_count 
FROM public.game_history
UNION ALL
SELECT 
    'practice_games' as table_name, 
    count(*) as row_count 
FROM public.practice_games
UNION ALL
SELECT 
    'competition_games' as table_name, 
    count(*) as row_count 
FROM public.competition_games
UNION ALL
SELECT 
    'user_game_stats' as table_name, 
    count(*) as row_count 
FROM public.user_game_stats
UNION ALL
SELECT 
    'high_scores' as table_name, 
    count(*) as row_count 
FROM public.high_scores
UNION ALL
SELECT 
    'game_sessions' as table_name, 
    count(*) as row_count 
FROM public.game_sessions;
