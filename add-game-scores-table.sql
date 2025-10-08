-- ADD GAME SCORES TABLE TO EXISTING SCHEMA
-- Run this in your Supabase SQL Editor to add game score tracking

-- ========================================
-- CREATE GAME_SCORES TABLE
-- ========================================
DROP TABLE IF EXISTS public.game_scores CASCADE;

CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('multi_target', 'falling_object', 'color_sequence')),
  score DECIMAL(10,2) NOT NULL,
  listing_id UUID,
  tournament_id UUID,
  session_id TEXT,
  attempt_number INTEGER DEFAULT 1,
  game_duration INTEGER, -- in seconds
  metadata JSONB, -- for storing game-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for game_scores
CREATE INDEX idx_game_scores_user_id ON public.game_scores (user_id);
CREATE INDEX idx_game_scores_game_type ON public.game_scores (game_type);
CREATE INDEX idx_game_scores_score ON public.game_scores (score DESC);
CREATE INDEX idx_game_scores_created_at ON public.game_scores (created_at DESC);
CREATE INDEX idx_game_scores_listing_id ON public.game_scores (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_game_scores_tournament_id ON public.game_scores (tournament_id) WHERE tournament_id IS NOT NULL;

-- Enable RLS for game_scores
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_scores
CREATE POLICY "Users can view own game scores" ON public.game_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game scores" ON public.game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_game_scores_updated_at BEFORE UPDATE ON public.game_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- UPDATE USER_LEVELS TABLE TRIGGER
-- ========================================
-- Function to update user level when game score is added
CREATE OR REPLACE FUNCTION update_user_level_on_game_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_levels table with new score
    INSERT INTO public.user_levels (user_id, current_level, total_points, games_played, daily_games_played, best_score, created_at, updated_at)
    VALUES (
        NEW.user_id, 
        1, 
        FLOOR(NEW.score)::INTEGER, 
        1, 
        1, 
        NEW.score, 
        NOW(), 
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = user_levels.total_points + FLOOR(NEW.score)::INTEGER,
        games_played = user_levels.games_played + 1,
        daily_games_played = CASE 
            WHEN DATE(user_levels.updated_at) = CURRENT_DATE THEN user_levels.daily_games_played + 1
            ELSE 1
        END,
        best_score = GREATEST(user_levels.best_score, NEW.score),
        current_level = LEAST(100, GREATEST(1, FLOOR((user_levels.total_points + FLOOR(NEW.score)::INTEGER) / 1000) + 1)),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user level when game score is added
DROP TRIGGER IF EXISTS trigger_update_user_level_on_game_score ON public.game_scores;
CREATE TRIGGER trigger_update_user_level_on_game_score
    AFTER INSERT ON public.game_scores
    FOR EACH ROW EXECUTE FUNCTION update_user_level_on_game_score();

-- ========================================
-- REFRESH SCHEMA
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 
    'game_scores' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'game_scores';

-- Success message
SELECT 'GAME SCORES TABLE ADDED SUCCESSFULLY! 🎮' as status,
       'Users can now track their game scores and level progress!' as message;
