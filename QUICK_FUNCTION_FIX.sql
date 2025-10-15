-- Quick Fix for Function Parameter Conflict
-- Run this first if you get the parameter name error

-- Drop existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS get_user_game_history(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(UUID);
DROP FUNCTION IF EXISTS get_user_high_scores(uuid);
DROP FUNCTION IF EXISTS get_user_game_history(uuid);

-- Recreate the functions with correct parameter names
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_game_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_high_scores(UUID) TO authenticated;
