-- WINNER TRACKING AND PRIZE RESTRICTION SYSTEM
-- Tracks winners and enforces cash prize restrictions (once every 3 months)

-- 1. Create winner tracking table
DROP TABLE IF EXISTS public.winner_tracking CASCADE;
CREATE TABLE public.winner_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('hot_sell', '1v1', 'group_battle', 'scheduled_game')),
  tournament_id TEXT NOT NULL,
  prize_amount DECIMAL(10,2) NOT NULL,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('cash', 'tokens', 'physical')),
  placement INTEGER NOT NULL,
  won_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create fixed games configuration table
DROP TABLE IF EXISTS public.fixed_games_config CASCADE;
CREATE TABLE public.fixed_games_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('hot_sell', '1v1', 'group_battle', 'scheduled_game')),
  title TEXT NOT NULL,
  description TEXT,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  prize_pool DECIMAL(10,2) NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 50,
  game_duration INTEGER NOT NULL DEFAULT 60, -- seconds
  rng_seed INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create active fixed games table
DROP TABLE IF EXISTS public.active_fixed_games CASCADE;
CREATE TABLE public.active_fixed_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.fixed_games_config(id) ON DELETE CASCADE,
  tournament_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create fixed game participants table
DROP TABLE IF EXISTS public.fixed_game_participants CASCADE;
CREATE TABLE public.fixed_game_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.active_fixed_games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  entry_fee_paid INTEGER NOT NULL DEFAULT 0,
  score DECIMAL(10,2) DEFAULT NULL,
  accuracy DECIMAL(5,2) DEFAULT NULL,
  placement INTEGER DEFAULT NULL,
  prize_won DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- 5. Enable RLS
ALTER TABLE public.winner_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_games_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_fixed_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_game_participants ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Winner tracking is viewable by everyone" ON public.winner_tracking
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own winner records" ON public.winner_tracking
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Fixed games config is viewable by everyone" ON public.fixed_games_config
  FOR SELECT USING (true);

CREATE POLICY "Active fixed games are viewable by everyone" ON public.active_fixed_games
  FOR SELECT USING (true);

CREATE POLICY "Users can view fixed game participants" ON public.fixed_game_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join fixed games" ON public.fixed_game_participants
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own scores" ON public.fixed_game_participants
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 7. Create indexes
CREATE INDEX idx_winner_tracking_user ON public.winner_tracking(user_id);
CREATE INDEX idx_winner_tracking_tournament ON public.winner_tracking(tournament_type, tournament_id);
CREATE INDEX idx_winner_tracking_won_at ON public.winner_tracking(won_at);
CREATE INDEX idx_winner_tracking_prize_type ON public.winner_tracking(prize_type);

CREATE INDEX idx_fixed_games_config_type ON public.fixed_games_config(tournament_type);
CREATE INDEX idx_fixed_games_config_active ON public.fixed_games_config(is_active);

CREATE INDEX idx_active_fixed_games_status ON public.active_fixed_games(status);
CREATE INDEX idx_active_fixed_games_type ON public.active_fixed_games(tournament_type);

CREATE INDEX idx_fixed_game_participants_game ON public.fixed_game_participants(game_id);
CREATE INDEX idx_fixed_game_participants_user ON public.fixed_game_participants(user_id);
CREATE INDEX idx_fixed_game_participants_score ON public.fixed_game_participants(score DESC);

-- 8. Grant permissions
GRANT ALL ON public.winner_tracking TO authenticated;
GRANT ALL ON public.winner_tracking TO anon;
GRANT ALL ON public.fixed_games_config TO authenticated;
GRANT ALL ON public.fixed_games_config TO anon;
GRANT ALL ON public.active_fixed_games TO authenticated;
GRANT ALL ON public.active_fixed_games TO anon;
GRANT ALL ON public.fixed_game_participants TO authenticated;
GRANT ALL ON public.fixed_game_participants TO anon;

-- 9. Create RPC functions
DROP FUNCTION IF EXISTS check_prize_eligibility(TEXT, DECIMAL);
CREATE OR REPLACE FUNCTION check_prize_eligibility(
  p_user_id TEXT,
  p_prize_amount DECIMAL(10,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  last_cash_win TIMESTAMPTZ;
  months_since_last_win INTEGER;
  is_eligible BOOLEAN;
BEGIN
  -- Check if this is a significant cash prize (> $100)
  IF p_prize_amount < 100 THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'reason', 'Prize amount below restriction threshold',
      'last_cash_win', null,
      'months_since_last_win', null
    );
  END IF;

  -- Get the last significant cash prize win
  SELECT MAX(won_at) INTO last_cash_win
  FROM public.winner_tracking
  WHERE user_id = p_user_id 
    AND prize_type = 'cash' 
    AND prize_amount >= 100;

  -- Calculate months since last win
  IF last_cash_win IS NULL THEN
    months_since_last_win := 999; -- Never won before
    is_eligible := true;
  ELSE
    months_since_last_win := EXTRACT(EPOCH FROM (NOW() - last_cash_win)) / (30 * 24 * 60 * 60);
    is_eligible := months_since_last_win >= 3;
  END IF;

  RETURN jsonb_build_object(
    'eligible', is_eligible,
    'reason', CASE 
      WHEN is_eligible THEN 'User is eligible for cash prize'
      ELSE 'User must wait 3 months between significant cash prizes'
    END,
    'last_cash_win', last_cash_win,
    'months_since_last_win', months_since_last_win
  );
END;
$$;

DROP FUNCTION IF EXISTS record_winner(TEXT, TEXT, TEXT, DECIMAL, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION record_winner(
  p_user_id TEXT,
  p_tournament_type TEXT,
  p_tournament_id TEXT,
  p_prize_amount DECIMAL(10,2),
  p_prize_type TEXT,
  p_placement INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.winner_tracking (
    user_id, tournament_type, tournament_id, prize_amount, 
    prize_type, placement, won_at
  ) VALUES (
    p_user_id, p_tournament_type, p_tournament_id, p_prize_amount,
    p_prize_type, p_placement, NOW()
  ) RETURNING to_jsonb(winner_tracking.*) INTO result;
  
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS create_fixed_game(TEXT, TEXT, TEXT, TEXT, INTEGER, DECIMAL, INTEGER, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION create_fixed_game(
  p_game_type TEXT,
  p_tournament_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_entry_fee INTEGER,
  p_prize_pool DECIMAL(10,2),
  p_max_participants INTEGER,
  p_game_duration INTEGER,
  p_rng_seed INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_result JSONB;
  game_result JSONB;
BEGIN
  -- Create fixed game config
  INSERT INTO public.fixed_games_config (
    game_type, tournament_type, title, description, entry_fee, prize_pool,
    max_participants, game_duration, rng_seed
  ) VALUES (
    p_game_type, p_tournament_type, p_title, p_description, p_entry_fee, p_prize_pool,
    p_max_participants, p_game_duration, p_rng_seed
  ) RETURNING to_jsonb(fixed_games_config.*) INTO config_result;

  -- Create active fixed game
  INSERT INTO public.active_fixed_games (
    config_id, tournament_type, status
  ) VALUES (
    (config_result->>'id')::UUID, p_tournament_type, 'waiting'
  ) RETURNING to_jsonb(active_fixed_games.*) INTO game_result;

  RETURN jsonb_build_object(
    'config', config_result,
    'game', game_result
  );
END;
$$;

DROP FUNCTION IF EXISTS join_fixed_game(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION join_fixed_game(
  p_game_id TEXT,
  p_user_id TEXT,
  p_entry_fee INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.fixed_game_participants (
    game_id, user_id, entry_fee_paid
  ) VALUES (
    p_game_id::UUID, p_user_id, p_entry_fee
  ) RETURNING to_jsonb(fixed_game_participants.*) INTO result;
  
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS update_fixed_game_score(TEXT, TEXT, DECIMAL, DECIMAL);
CREATE OR REPLACE FUNCTION update_fixed_game_score(
  p_game_id TEXT,
  p_user_id TEXT,
  p_score DECIMAL(10,2),
  p_accuracy DECIMAL(5,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE public.fixed_game_participants 
  SET 
    score = p_score,
    accuracy = p_accuracy,
    updated_at = NOW()
  WHERE game_id = p_game_id::UUID AND user_id = p_user_id
  RETURNING to_jsonb(fixed_game_participants.*) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_prize_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION check_prize_eligibility TO anon;
GRANT EXECUTE ON FUNCTION record_winner TO authenticated;
GRANT EXECUTE ON FUNCTION record_winner TO anon;
GRANT EXECUTE ON FUNCTION create_fixed_game TO authenticated;
GRANT EXECUTE ON FUNCTION create_fixed_game TO anon;
GRANT EXECUTE ON FUNCTION join_fixed_game TO authenticated;
GRANT EXECUTE ON FUNCTION join_fixed_game TO anon;
GRANT EXECUTE ON FUNCTION update_fixed_game_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_fixed_game_score TO anon;

-- 10. Insert default fixed games configurations
INSERT INTO public.fixed_games_config (game_type, tournament_type, title, description, entry_fee, prize_pool, max_participants, game_duration, rng_seed) VALUES
-- Hot Sell Fixed Games
('multi_target_reaction', 'hot_sell', '$100 Daily Hot Sell', 'Daily fixed hot sell tournament', 1, 100, 50, 60, 1),
('sword_parry', 'hot_sell', '$500 Weekend Hot Sell', 'Weekend fixed hot sell tournament', 3, 500, 100, 60, 2),
('laser_dodge', 'hot_sell', '$1,000 Weekly Hot Sell', 'Weekly fixed hot sell tournament', 5, 1000, 200, 60, 3),
('memory_color', 'hot_sell', '$5,000 Monthly Hot Sell', 'Monthly fixed hot sell tournament', 10, 5000, 500, 60, 4),
('number_tap', 'hot_sell', '$25,000 MEGA Hot Sell', 'MEGA fixed hot sell tournament', 25, 25000, 1000, 60, 5),

-- 1v1 Fixed Games
('multi_target_reaction', '1v1', '$50 Daily 1v1', 'Daily fixed 1v1 tournament', 1, 50, 2, 60, 6),
('sword_parry', '1v1', '$200 Weekend 1v1', 'Weekend fixed 1v1 tournament', 3, 200, 2, 60, 7),
('laser_dodge', '1v1', '$500 Weekly 1v1', 'Weekly fixed 1v1 tournament', 5, 500, 2, 60, 8),
('memory_color', '1v1', '$2,000 Monthly 1v1', 'Monthly fixed 1v1 tournament', 10, 2000, 2, 60, 9),
('number_tap', '1v1', '$10,000 MEGA 1v1', 'MEGA fixed 1v1 tournament', 25, 10000, 2, 60, 10);

-- 11. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_fixed_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fixed_games_config_updated_at
  BEFORE UPDATE ON public.fixed_games_config
  FOR EACH ROW
  EXECUTE FUNCTION update_fixed_games_updated_at();

CREATE TRIGGER trigger_fixed_game_participants_updated_at
  BEFORE UPDATE ON public.fixed_game_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_fixed_games_updated_at();

SELECT 'Winner tracking and fixed games system created successfully!' as status;
