-- Fix matchmaking_queue table to add missing columns
-- This will fix the "column game_type does not exist" error

-- Add game_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchmaking_queue' 
        AND column_name = 'game_type'
    ) THEN
        ALTER TABLE matchmaking_queue ADD COLUMN game_type TEXT;
    END IF;
END $$;

-- Add other missing columns that might be needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchmaking_queue' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE matchmaking_queue ADD COLUMN username TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchmaking_queue' 
        AND column_name = 'lot_number'
    ) THEN
        ALTER TABLE matchmaking_queue ADD COLUMN lot_number TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchmaking_queue' 
        AND column_name = 'player_score'
    ) THEN
        ALTER TABLE matchmaking_queue ADD COLUMN player_score DECIMAL(10,2);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchmaking_queue' 
        AND column_name = 'score_submitted_at'
    ) THEN
        ALTER TABLE matchmaking_queue ADD COLUMN score_submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchmaking_queue' 
        AND column_name = 'matched_with_queue_id'
    ) THEN
        ALTER TABLE matchmaking_queue ADD COLUMN matched_with_queue_id UUID;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matchmaking_lot_number ON matchmaking_queue(lot_number);
CREATE INDEX IF NOT EXISTS idx_matchmaking_game_type ON matchmaking_queue(game_type);
CREATE INDEX IF NOT EXISTS idx_matchmaking_status ON matchmaking_queue(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_player_score ON matchmaking_queue(player_score);

-- Update existing records to have default game_type
UPDATE matchmaking_queue 
SET game_type = 'quick-click' 
WHERE game_type IS NULL;

-- Make game_type NOT NULL after setting defaults
ALTER TABLE matchmaking_queue ALTER COLUMN game_type SET NOT NULL;
