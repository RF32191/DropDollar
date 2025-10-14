-- ============================================================================
-- QUICK FIX FOR MATCHMAKING - Run this NOW to fix "Failed to join queue"
-- ============================================================================

-- Add missing columns to matchmaking_queue
ALTER TABLE public.matchmaking_queue 
  ADD COLUMN IF NOT EXISTS game_type TEXT,
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS player_score NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS score_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matched_with_queue_id UUID;

-- Add missing columns to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS game_type TEXT,
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payout_completed BOOLEAN DEFAULT FALSE;

-- Fix game_history score to support decimals
ALTER TABLE public.game_history 
  ALTER COLUMN score TYPE NUMERIC(10, 2);

-- Create missing tables
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  skill_rating INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill user_stats for existing users
INSERT INTO public.user_stats (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_stats)
ON CONFLICT (user_id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Anyone can view activities" ON public.user_activities;
CREATE POLICY "Anyone can view activities" ON public.user_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert activities" ON public.user_activities;
CREATE POLICY "Anyone can insert activities" ON public.user_activities FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view stats" ON public.user_stats;
CREATE POLICY "Anyone can view stats" ON public.user_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update stats" ON public.user_stats;
CREATE POLICY "Anyone can update stats" ON public.user_stats FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
SELECT '✅ Quick fix applied! You can now join matchmaking!' as status;
-- ============================================================================

