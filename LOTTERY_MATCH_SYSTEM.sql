-- ============================================================================
-- LOTTERY MATCH SYSTEM - Pool-based 1v1 Matchmaking
-- Players play immediately, scores stored, matched retroactively
-- Each match has a unique lot number for tracking
-- ============================================================================

-- 1. First, fix all prerequisite issues
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS game_type TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS game_type TEXT;
ALTER TABLE public.game_history ALTER COLUMN score TYPE NUMERIC(10, 2);

-- 2. Create user_activities table if missing
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);

-- 3. Create user_stats table if missing
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  skill_rating INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score NUMERIC(12, 2) DEFAULT 0,
  avg_score NUMERIC(10, 2) DEFAULT 0,
  best_score NUMERIC(10, 2) DEFAULT 0,
  win_rate NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- 4. Modify matchmaking_queue to support lottery system
-- Add lot_number to track which match pool a player is in
ALTER TABLE public.matchmaking_queue 
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS player_score NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS score_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matched_with_queue_id UUID;

-- Create index for lot matching
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_lot_number ON public.matchmaking_queue(lot_number);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_type_status ON public.matchmaking_queue(game_type, status);

-- 5. Modify matches table to support lottery system
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payout_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_matches_lot_number ON public.matches(lot_number);
CREATE INDEX IF NOT EXISTS idx_matches_payout ON public.matches(payout_completed);

-- 6. Create function to generate unique lot numbers
CREATE OR REPLACE FUNCTION generate_lot_number(
  p_game_type TEXT,
  p_entry_fee INTEGER
)
RETURNS TEXT AS $$
DECLARE
  lot_num TEXT;
  date_part TEXT;
  random_part TEXT;
BEGIN
  -- Format: GAME-FEE-DATE-RANDOM
  -- Example: QUICK-1-20251014-A3F9
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  
  lot_num := p_game_type || '-' || p_entry_fee::TEXT || '-' || date_part || '-' || random_part;
  
  RETURN lot_num;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to find or create a lot for matching
CREATE OR REPLACE FUNCTION find_or_create_lot(
  p_game_type TEXT,
  p_entry_fee INTEGER,
  p_skill_rating INTEGER
)
RETURNS TEXT AS $$
DECLARE
  available_lot TEXT;
  new_lot TEXT;
BEGIN
  -- Try to find an available lot (waiting for opponent, similar skill rating)
  SELECT lot_number INTO available_lot
  FROM public.matchmaking_queue
  WHERE 
    game_type = p_game_type
    AND entry_fee = p_entry_fee
    AND status = 'waiting'
    AND lot_number IS NOT NULL
    AND matched_with_queue_id IS NULL
    AND player_score IS NOT NULL
    AND ABS(skill_rating - p_skill_rating) <= 200 -- Skill-based matching
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF available_lot IS NOT NULL THEN
    RETURN available_lot;
  END IF;
  
  -- No available lot found, create new one
  new_lot := generate_lot_number(p_game_type, p_entry_fee);
  RETURN new_lot;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to automatically match and payout when both players complete
CREATE OR REPLACE FUNCTION auto_match_and_payout()
RETURNS TRIGGER AS $$
DECLARE
  opponent_queue RECORD;
  match_id UUID;
  winner_id UUID;
  loser_id UUID;
  winner_score NUMERIC(10, 2);
  loser_score NUMERIC(10, 2);
  prize NUMERIC(10, 2);
  winner_name TEXT;
  loser_name TEXT;
BEGIN
  -- Only process when score is submitted and lot_number exists
  IF NEW.player_score IS NOT NULL AND NEW.lot_number IS NOT NULL AND NEW.status = 'waiting' THEN
    
    -- Look for an opponent in the same lot who has also completed their game
    SELECT * INTO opponent_queue
    FROM public.matchmaking_queue
    WHERE 
      lot_number = NEW.lot_number
      AND id != NEW.id
      AND player_score IS NOT NULL
      AND status = 'waiting'
      AND matched_with_queue_id IS NULL
    ORDER BY score_submitted_at ASC
    LIMIT 1;
    
    -- Found a match!
    IF opponent_queue.id IS NOT NULL THEN
      
      RAISE NOTICE '🎰 LOT MATCH FOUND! Lot: %, Player 1: % (Score: %), Player 2: % (Score: %)', 
        NEW.lot_number, NEW.user_id, NEW.player_score, opponent_queue.user_id, opponent_queue.player_score;
      
      -- Determine winner
      IF NEW.player_score > opponent_queue.player_score THEN
        winner_id := NEW.user_id;
        loser_id := opponent_queue.user_id;
        winner_score := NEW.player_score;
        loser_score := opponent_queue.player_score;
      ELSIF opponent_queue.player_score > NEW.player_score THEN
        winner_id := opponent_queue.user_id;
        loser_id := NEW.user_id;
        winner_score := opponent_queue.player_score;
        loser_score := NEW.player_score;
      ELSE
        -- TIE - Refund both players
        UPDATE public.users 
        SET tokens = tokens + NEW.entry_fee
        WHERE id IN (NEW.user_id, opponent_queue.user_id);
        
        -- Mark both as matched
        UPDATE public.matchmaking_queue
        SET 
          status = 'matched',
          matched_with_queue_id = opponent_queue.id
        WHERE id = NEW.id;
        
        UPDATE public.matchmaking_queue
        SET 
          status = 'matched',
          matched_with_queue_id = NEW.id
        WHERE id = opponent_queue.id;
        
        RAISE NOTICE '🤝 TIE! Both players refunded.';
        RETURN NEW;
      END IF;
      
      -- Get player names
      SELECT username INTO winner_name FROM public.users WHERE id = winner_id;
      SELECT username INTO loser_name FROM public.users WHERE id = loser_id;
      
      -- Calculate prize (winner gets their stake + 85% of opponent's stake)
      prize := NEW.entry_fee + (NEW.entry_fee * 0.85);
      
      -- Create the match record
      INSERT INTO public.matches (
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        entry_fee,
        game_type,
        lot_number,
        prize_amount,
        status,
        completed_at
      ) VALUES (
        NEW.user_id,
        opponent_queue.user_id,
        NEW.player_score,
        opponent_queue.player_score,
        NEW.entry_fee,
        NEW.game_type,
        NEW.lot_number,
        prize,
        'completed',
        NOW()
      ) RETURNING id INTO match_id;
      
      -- Award winner
      UPDATE public.users 
      SET tokens = tokens + prize
      WHERE id = winner_id;
      
      -- Log winner transaction
      INSERT INTO public.token_transactions (
        user_id,
        amount,
        type,
        description,
        balance_before,
        balance_after,
        metadata
      )
      SELECT 
        winner_id,
        prize,
        'match_win',
        '🏆 1v1 Win vs ' || loser_name || ' (Lot: ' || NEW.lot_number || ')',
        tokens - prize,
        tokens,
        jsonb_build_object(
          'match_id', match_id,
          'lot_number', NEW.lot_number,
          'entry_fee', NEW.entry_fee,
          'prize_amount', prize,
          'opponent_id', loser_id,
          'opponent_name', loser_name,
          'winner_score', winner_score,
          'loser_score', loser_score,
          'game_type', NEW.game_type
        )
      FROM public.users
      WHERE id = winner_id;
      
      -- Update both queue entries as matched
      UPDATE public.matchmaking_queue
      SET 
        status = 'matched',
        matched_with_queue_id = opponent_queue.id
      WHERE id = NEW.id;
      
      UPDATE public.matchmaking_queue
      SET 
        status = 'matched',
        matched_with_queue_id = NEW.id
      WHERE id = opponent_queue.id;
      
      -- Update match record
      UPDATE public.matches
      SET payout_completed = TRUE, payout_completed_at = NOW()
      WHERE id = match_id;
      
      -- Update user stats
      UPDATE public.user_stats
      SET 
        games_won = games_won + 1,
        games_played = games_played + 1,
        total_score = total_score + winner_score,
        updated_at = NOW()
      WHERE user_id = winner_id;
      
      UPDATE public.user_stats
      SET 
        games_played = games_played + 1,
        total_score = total_score + loser_score,
        updated_at = NOW()
      WHERE user_id = loser_id;
      
      RAISE NOTICE '💰 PAYOUT COMPLETE! Winner: % receives % tokens for Lot: %', winner_name, prize, NEW.lot_number;
      
    ELSE
      RAISE NOTICE '⏳ Score recorded for Lot: %. Waiting for opponent...', NEW.lot_number;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for auto-matching and payout
DROP TRIGGER IF EXISTS auto_match_payout_trigger ON public.matchmaking_queue;
CREATE TRIGGER auto_match_payout_trigger
  AFTER INSERT OR UPDATE ON public.matchmaking_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_match_and_payout();

-- 10. Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activities" ON public.user_activities;
CREATE POLICY "Users can view activities" ON public.user_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert activities" ON public.user_activities;
CREATE POLICY "System can insert activities" ON public.user_activities FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view stats" ON public.user_stats;
CREATE POLICY "Users can view stats" ON public.user_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can update stats" ON public.user_stats;
CREATE POLICY "System can update stats" ON public.user_stats FOR ALL USING (true) WITH CHECK (true);

-- 11. Backfill user_stats
INSERT INTO public.user_stats (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_stats)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Lottery Match System Installed!' as status;
SELECT '💰 Automatic payouts enabled via lot-based matching' as info;
SELECT '🎰 Each match gets unique lot number for tracking' as info;
SELECT '⚡ Players can play multiple games simultaneously' as info;

-- Show schema
SELECT 
  'matchmaking_queue.lot_number' as column_check,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'matchmaking_queue' AND column_name = 'lot_number'
  ) as exists;

SELECT 
  'matchmaking_queue.player_score' as column_check,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'matchmaking_queue' AND column_name = 'player_score'
  ) as exists;

SELECT 
  'matches.lot_number' as column_check,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'lot_number'
  ) as exists;

