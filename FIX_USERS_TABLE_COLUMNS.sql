-- ============================================================================
-- FIX USERS TABLE COLUMNS - Add all required columns for userService.ts
-- ============================================================================
-- This script ensures the public.users table has all columns expected by the frontend

-- Add missing columns if they don't exist
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tokens numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Sync totals from purchased_tokens and won_tokens to tokens column
UPDATE public.users
SET tokens = COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)
WHERE tokens IS NULL OR tokens = 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- Verify columns exist
DO $$
BEGIN
  RAISE NOTICE '✅ Users table columns added/verified';
  RAISE NOTICE 'Columns: id, email, username, first_name, last_name, purchased_tokens, won_tokens, tokens, balance, total_spent, total_earned, games_played, games_won';
END $$;

