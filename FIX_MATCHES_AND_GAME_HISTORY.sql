-- Ensure matches table exists with proper structure
-- This will fix the opponent assignment and results display issues

-- Create matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number TEXT NOT NULL,
    player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player1_name TEXT NOT NULL,
    player1_score DECIMAL(10,2) NOT NULL,
    player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player2_name TEXT NOT NULL,
    player2_score DECIMAL(10,2) NOT NULL,
    winner_id UUID REFERENCES auth.users(id),
    winner_score DECIMAL(10,2),
    loser_score DECIMAL(10,2),
    prize_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    game_type TEXT NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_lot_number ON matches(lot_number);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view all matches" ON matches
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert matches" ON matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update matches" ON matches
    FOR UPDATE USING (true);

-- Ensure game_history table has proper structure for V4 schema
DO $$ 
BEGIN
    -- Add mode column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'mode'
    ) THEN
        ALTER TABLE game_history ADD COLUMN mode TEXT DEFAULT 'practice';
    END IF;
    
    -- Add reaction_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'reaction_time'
    ) THEN
        ALTER TABLE game_history ADD COLUMN reaction_time DECIMAL(10,2);
    END IF;
    
    -- Add duration_seconds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'duration_seconds'
    ) THEN
        ALTER TABLE game_history ADD COLUMN duration_seconds INTEGER;
    END IF;
    
    -- Add tokens_wagered column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'tokens_wagered'
    ) THEN
        ALTER TABLE game_history ADD COLUMN tokens_wagered DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add tokens_won column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'tokens_won'
    ) THEN
        ALTER TABLE game_history ADD COLUMN tokens_won DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add result column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'result'
    ) THEN
        ALTER TABLE game_history ADD COLUMN result TEXT DEFAULT 'completed';
    END IF;
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE game_history ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Update existing game_history records to have proper mode values
UPDATE game_history 
SET mode = CASE 
    WHEN is_practice = true THEN 'practice'
    WHEN is_competition = true THEN 'competition'
    ELSE 'practice'
END
WHERE mode IS NULL;

-- Create indexes for game_history
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_mode ON game_history(mode);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);
CREATE INDEX IF NOT EXISTS idx_game_history_score ON game_history(score);
