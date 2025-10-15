-- Fix game_history score column type mismatch
ALTER TABLE public.game_history ALTER COLUMN score TYPE NUMERIC(10, 2);

-- Fix matchmaking_queue game_type column
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'laser-dodge';

-- Fix user_stats table missing columns
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update token_transactions to handle null user_id
ALTER TABLE public.token_transactions ALTER COLUMN user_id DROP NOT NULL;
