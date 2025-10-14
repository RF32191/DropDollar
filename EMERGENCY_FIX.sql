-- ============================================================================
-- EMERGENCY FIX - Run this immediately to fix critical errors
-- ============================================================================

-- 1. Fix game_history score column to accept decimal scores
ALTER TABLE public.game_history 
ALTER COLUMN score TYPE NUMERIC(10, 2);

-- 2. Add game_type column to matchmaking_queue if it doesn't exist
ALTER TABLE public.matchmaking_queue 
ADD COLUMN IF NOT EXISTS game_type TEXT;

-- 3. Fix user_stats table if it exists
ALTER TABLE IF EXISTS public.user_stats 
ADD COLUMN IF NOT EXISTS game_type TEXT;

-- 4. Make sure matches table has game_type
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS game_type TEXT;

-- Done! These changes fix the immediate errors.

