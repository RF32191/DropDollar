-- FIX DASHBOARD SCORE SAVING - SEPARATE FIX
-- This ensures practice and competition scores are saved properly to dashboard

-- 1. Ensure game_history table has proper structure for score saving
DO $$
BEGIN
    -- Add any missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_history' AND column_name = 'is_practice') THEN
        ALTER TABLE public.game_history ADD COLUMN is_practice BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_history' AND column_name = 'is_competition') THEN
        ALTER TABLE public.game_history ADD COLUMN is_competition BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_history' AND column_name = 'listing_id') THEN
        ALTER TABLE public.game_history ADD COLUMN listing_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_history' AND column_name = 'metadata') THEN
        ALTER TABLE public.game_history ADD COLUMN metadata JSONB;
    END IF;
    
    RAISE NOTICE 'Game history table structure verified';
END $$;

-- 2. Ensure high_scores table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.high_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    accuracy DECIMAL(5,2),
    is_practice BOOLEAN DEFAULT false,
    is_competition BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create or update the function to update high scores from game history
CREATE OR REPLACE FUNCTION update_high_score_from_game_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert high score for this user and game type
    INSERT INTO public.high_scores (user_id, game_type, score, accuracy, is_practice, is_competition)
    VALUES (NEW.user_id, NEW.game_type, NEW.score, NEW.accuracy, NEW.is_practice, NEW.is_competition)
    ON CONFLICT (user_id, game_type, is_practice, is_competition) 
    DO UPDATE SET 
        score = GREATEST(high_scores.score, NEW.score),
        accuracy = CASE 
            WHEN NEW.score > high_scores.score THEN NEW.accuracy
            ELSE high_scores.accuracy
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_high_score_from_game_history ON public.game_history;
CREATE TRIGGER trigger_update_high_score_from_game_history
    AFTER INSERT ON public.game_history
    FOR EACH ROW
    EXECUTE FUNCTION update_high_score_from_game_history();

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.game_history TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.high_scores TO authenticated, anon;

SELECT 'Dashboard score saving fixed!' as status;
