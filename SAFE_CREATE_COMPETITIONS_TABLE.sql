-- Safe creation of competitions table for Winner Takes It All scores
-- Handles cases where table exists but missing columns

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create competitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    accuracy DECIMAL(5,2),
    tournament_type TEXT NOT NULL DEFAULT 'winner_takes_all',
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add tournament_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitions' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.competitions ADD COLUMN tournament_type TEXT NOT NULL DEFAULT 'winner_takes_all';
    END IF;
END $$;

-- 3. Add session_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitions' 
        AND column_name = 'session_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.competitions ADD COLUMN session_id TEXT;
    END IF;
END $$;

-- 4. Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitions' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.competitions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 5. Create indexes for performance (handles 100,000+ users)
CREATE INDEX IF NOT EXISTS idx_competitions_user_id ON public.competitions(user_id);
CREATE INDEX IF NOT EXISTS idx_competitions_tournament_type ON public.competitions(tournament_type);
CREATE INDEX IF NOT EXISTS idx_competitions_game_type ON public.competitions(game_type);
CREATE INDEX IF NOT EXISTS idx_competitions_created_at ON public.competitions(created_at);
CREATE INDEX IF NOT EXISTS idx_competitions_user_tournament ON public.competitions(user_id, tournament_type);
CREATE INDEX IF NOT EXISTS idx_competitions_score ON public.competitions(score DESC);

-- 6. RLS for competitions
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own competitions" ON public.competitions;
CREATE POLICY "Users can view their own competitions" ON public.competitions
FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own competitions" ON public.competitions;
CREATE POLICY "Users can insert their own competitions" ON public.competitions
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own competitions" ON public.competitions;
CREATE POLICY "Users can update their own competitions" ON public.competitions
FOR UPDATE USING (auth.uid()::text = user_id);

-- 7. Trigger for updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_competitions_updated_at ON public.competitions;
CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Ensure game_history table exists (for dashboard)
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    accuracy DECIMAL(5,2),
    tournament_type TEXT NOT NULL DEFAULT 'practice',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Add tournament_type column to game_history if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'tournament_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.game_history ADD COLUMN tournament_type TEXT NOT NULL DEFAULT 'practice';
    END IF;
END $$;

-- 10. Create indexes for game_history
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_tournament_type ON public.game_history(tournament_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at);

-- 11. RLS for game_history
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own game history" ON public.game_history;
CREATE POLICY "Users can view their own game history" ON public.game_history
FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own game history" ON public.game_history;
CREATE POLICY "Users can insert their own game history" ON public.game_history
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 12. Add comments for documentation
COMMENT ON TABLE public.competitions IS 'Stores Winner Takes It All tournament scores and results';
COMMENT ON TABLE public.game_history IS 'Stores all game scores for dashboard display';
COMMENT ON COLUMN public.competitions.tournament_type IS 'Type of tournament: winner_takes_all, hot_sell, practice';
COMMENT ON COLUMN public.game_history.tournament_type IS 'Type of game: winner_takes_all, hot_sell, practice';
