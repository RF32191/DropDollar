-- Fix Game Saving Issues - Complete Database Repair
-- This fixes RLS policies, missing tables, and ensures proper game data saving

-- 1. Create missing game_scores table
CREATE TABLE IF NOT EXISTS public.game_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    is_practice BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create missing high_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.high_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    best_score DECIMAL(10,2) NOT NULL,
    last_score DECIMAL(10,2),
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- 3. Ensure game_history table exists with proper structure
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    accuracy DECIMAL(5,2),
    avg_reaction_time INTEGER,
    is_practice BOOLEAN DEFAULT true,
    listing_id TEXT,
    entry_number INTEGER,
    match_id UUID,
    opponent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Drop existing RLS policies that are causing issues
DROP POLICY IF EXISTS "Users can insert their own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can view their own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert their own game scores" ON public.game_scores;
DROP POLICY IF EXISTS "Users can view their own game scores" ON public.game_scores;
DROP POLICY IF EXISTS "Users can insert their own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can view their own high scores" ON public.high_scores;

-- 5. Enable RLS on all tables
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;

-- 6. Create new, working RLS policies
-- Game History Policies
CREATE POLICY "game_history_insert_policy" ON public.game_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "game_history_select_policy" ON public.game_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "game_history_update_policy" ON public.game_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "game_history_delete_policy" ON public.game_history
    FOR DELETE USING (auth.uid() = user_id);

-- Game Scores Policies
CREATE POLICY "game_scores_insert_policy" ON public.game_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "game_scores_select_policy" ON public.game_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "game_scores_update_policy" ON public.game_scores
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "game_scores_delete_policy" ON public.game_scores
    FOR DELETE USING (auth.uid() = user_id);

-- High Scores Policies
CREATE POLICY "high_scores_insert_policy" ON public.high_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "high_scores_select_policy" ON public.high_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "high_scores_update_policy" ON public.high_scores
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "high_scores_delete_policy" ON public.high_scores
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON public.game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_type ON public.game_scores(game_type);

CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON public.high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);

-- 8. Create function to update high scores automatically
CREATE OR REPLACE FUNCTION update_high_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update high score record
    INSERT INTO public.high_scores (user_id, game_type, best_score, last_score, games_played)
    VALUES (NEW.user_id, NEW.game_type, NEW.score, NEW.score, 1)
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
        best_score = GREATEST(high_scores.best_score, NEW.score),
        last_score = NEW.score,
        games_played = high_scores.games_played + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger to automatically update high scores
DROP TRIGGER IF EXISTS trigger_update_high_score ON public.game_history;
CREATE TRIGGER trigger_update_high_score
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_high_score();

-- 10. Grant necessary permissions
GRANT ALL ON public.game_history TO authenticated;
GRANT ALL ON public.game_scores TO authenticated;
GRANT ALL ON public.high_scores TO authenticated;

-- 11. Drop existing functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS get_user_game_history(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(uuid);

-- 12. Create RPC function for getting user game history
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
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gh.id,
        gh.game_type,
        gh.score,
        gh.accuracy,
        gh.avg_reaction_time,
        gh.is_practice,
        gh.listing_id,
        gh.entry_number,
        gh.match_id,
        gh.opponent_id,
        gh.created_at
    FROM public.game_history gh
    WHERE gh.user_id = user_uuid
    ORDER BY gh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create RPC function for getting user high scores
CREATE OR REPLACE FUNCTION get_user_high_scores(user_uuid UUID)
RETURNS TABLE (
    game_type TEXT,
    best_score DECIMAL(10,2),
    last_score DECIMAL(10,2),
    games_played INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hs.game_type,
        hs.best_score,
        hs.last_score,
        hs.games_played
    FROM public.high_scores hs
    WHERE hs.user_id = user_uuid
    ORDER BY hs.best_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_user_game_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_high_scores(UUID) TO authenticated;

-- 14. Test data insertion (optional - remove in production)
-- This ensures the tables work correctly
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID (replace with actual user ID if needed)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test game history
        INSERT INTO public.game_history (user_id, game_type, score, accuracy, is_practice)
        VALUES (test_user_id, 'sword-parry', 1000.00, 85.5, true)
        ON CONFLICT DO NOTHING;
        
        -- Insert test high score
        INSERT INTO public.high_scores (user_id, game_type, best_score, last_score, games_played)
        VALUES (test_user_id, 'sword-parry', 1000.00, 1000.00, 1)
        ON CONFLICT (user_id, game_type) DO NOTHING;
    END IF;
END $$;

-- 15. Verify tables exist and are accessible
SELECT 'game_history' as table_name, count(*) as row_count FROM public.game_history
UNION ALL
SELECT 'game_scores' as table_name, count(*) as row_count FROM public.game_scores
UNION ALL
SELECT 'high_scores' as table_name, count(*) as row_count FROM public.high_scores;
