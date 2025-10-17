-- ORIGINAL FIXED GAMES SYSTEM WITH BANNERS AND MATCHING
-- Recreates the original system with specific prize tiers and hot sell mechanics

-- 1. Drop existing tables to start fresh
DROP TABLE IF EXISTS public.fixed_game_participants CASCADE;
DROP TABLE IF EXISTS public.active_fixed_games CASCADE;
DROP TABLE IF EXISTS public.fixed_games_config CASCADE;

-- 2. Create fixed games configuration table (simplified)
CREATE TABLE public.fixed_games_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('hot_sell', '1v1')),
  title TEXT NOT NULL,
  description TEXT,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  prize_pool DECIMAL(10,2) NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 50,
  game_duration INTEGER NOT NULL DEFAULT 60,
  rng_seed INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create active fixed games table
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

-- 5. Create hot sell sessions table for timer management
CREATE TABLE public.hot_sell_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.fixed_games_config(id) ON DELETE CASCADE,
  current_pot DECIMAL(10,2) NOT NULL DEFAULT 0,
  target_pot DECIMAL(10,2) NOT NULL,
  participants_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'hot_sell', 'active', 'completed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  hot_sell_started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE public.fixed_games_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_fixed_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_sell_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
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

CREATE POLICY "Hot sell sessions are viewable by everyone" ON public.hot_sell_sessions
  FOR SELECT USING (true);

-- 8. Create indexes
CREATE INDEX idx_fixed_games_config_type ON public.fixed_games_config(tournament_type);
CREATE INDEX idx_fixed_games_config_active ON public.fixed_games_config(is_active);
CREATE INDEX idx_active_fixed_games_status ON public.active_fixed_games(status);
CREATE INDEX idx_active_fixed_games_type ON public.active_fixed_games(tournament_type);
CREATE INDEX idx_fixed_game_participants_game ON public.fixed_game_participants(game_id);
CREATE INDEX idx_fixed_game_participants_user ON public.fixed_game_participants(user_id);
CREATE INDEX idx_fixed_game_participants_score ON public.fixed_game_participants(score DESC);
CREATE INDEX idx_hot_sell_sessions_status ON public.hot_sell_sessions(status);
CREATE INDEX idx_hot_sell_sessions_expires ON public.hot_sell_sessions(expires_at);

-- 9. Grant permissions
GRANT ALL ON public.fixed_games_config TO authenticated;
GRANT ALL ON public.fixed_games_config TO anon;
GRANT ALL ON public.active_fixed_games TO authenticated;
GRANT ALL ON public.active_fixed_games TO anon;
GRANT ALL ON public.fixed_game_participants TO authenticated;
GRANT ALL ON public.fixed_game_participants TO anon;
GRANT ALL ON public.hot_sell_sessions TO authenticated;
GRANT ALL ON public.hot_sell_sessions TO anon;

-- 10. Create RPC functions
DROP FUNCTION IF EXISTS create_fixed_game(TEXT, TEXT, TEXT, TEXT, INTEGER, DECIMAL, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS join_fixed_game(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS update_fixed_game_score(TEXT, TEXT, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS create_hot_sell_session(TEXT);
DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS update_hot_sell_pot(TEXT);

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

CREATE OR REPLACE FUNCTION create_hot_sell_session(
  p_config_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_record RECORD;
  session_result JSONB;
BEGIN
  -- Get config details
  SELECT * INTO config_record FROM public.fixed_games_config WHERE id = p_config_id::UUID;
  
  -- Create hot sell session
  INSERT INTO public.hot_sell_sessions (
    config_id, current_pot, target_pot, expires_at
  ) VALUES (
    p_config_id::UUID, 0, config_record.prize_pool, NOW() + INTERVAL '2 hours'
  ) RETURNING to_jsonb(hot_sell_sessions.*) INTO session_result;
  
  RETURN session_result;
END;
$$;

CREATE OR REPLACE FUNCTION join_hot_sell_session(
  p_session_id TEXT,
  p_user_id TEXT,
  p_entry_fee INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  participant_result JSONB;
BEGIN
  -- Get session details
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  
  -- Add participant to the session's game
  INSERT INTO public.fixed_game_participants (
    game_id, user_id, entry_fee_paid
  ) VALUES (
    session_record.config_id, p_user_id, p_entry_fee
  ) RETURNING to_jsonb(fixed_game_participants.*) INTO participant_result;
  
  -- Update session pot and participant count
  UPDATE public.hot_sell_sessions 
  SET 
    current_pot = current_pot + p_entry_fee,
    participants_count = participants_count + 1
  WHERE id = p_session_id::UUID;
  
  RETURN participant_result;
END;
$$;

CREATE OR REPLACE FUNCTION update_hot_sell_pot(
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  result JSONB;
BEGIN
  -- Get current session
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  
  -- Check if we should enter hot sell mode (2 hours passed)
  IF NOW() > session_record.expires_at AND session_record.status = 'waiting' THEN
    UPDATE public.hot_sell_sessions 
    SET 
      status = 'hot_sell',
      hot_sell_started_at = NOW(),
      expires_at = NOW() + INTERVAL '1 minute' -- Last minute joining
    WHERE id = p_session_id::UUID;
  END IF;
  
  -- Return updated session
  SELECT to_jsonb(hot_sell_sessions.*) INTO result FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_fixed_game TO authenticated;
GRANT EXECUTE ON FUNCTION create_fixed_game TO anon;
GRANT EXECUTE ON FUNCTION join_fixed_game TO authenticated;
GRANT EXECUTE ON FUNCTION join_fixed_game TO anon;
GRANT EXECUTE ON FUNCTION update_fixed_game_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_fixed_game_score TO anon;
GRANT EXECUTE ON FUNCTION create_hot_sell_session TO authenticated;
GRANT EXECUTE ON FUNCTION create_hot_sell_session TO anon;
GRANT EXECUTE ON FUNCTION join_hot_sell_session TO authenticated;
GRANT EXECUTE ON FUNCTION join_hot_sell_session TO anon;
GRANT EXECUTE ON FUNCTION update_hot_sell_pot TO authenticated;
GRANT EXECUTE ON FUNCTION update_hot_sell_pot TO anon;

-- 11. Insert FIXED game configurations (no custom creation)
INSERT INTO public.fixed_games_config (game_type, tournament_type, title, description, entry_fee, prize_pool, max_participants, game_duration, rng_seed) VALUES
-- Hot Sell Fixed Games (Original Tiers)
('multi_target_reaction', 'hot_sell', '$10 Hot Sell', 'Quick $10 tournament', 1, 10, 10, 60, 1),
('sword_parry', 'hot_sell', '$100 Hot Sell', 'Standard $100 tournament', 3, 100, 50, 60, 2),
('laser_dodge', 'hot_sell', '$250 Hot Sell', 'Mid-tier $250 tournament', 5, 250, 100, 60, 3),
('memory_color', 'hot_sell', '$500 Hot Sell', 'High-value $500 tournament', 10, 500, 200, 60, 4),
('number_tap', 'hot_sell', '$1,000 Hot Sell', 'Premium $1,000 tournament', 15, 1000, 300, 60, 5),
('multi_target_reaction', 'hot_sell', '$2,500 Hot Sell', 'Elite $2,500 tournament', 25, 2500, 500, 60, 6),
('sword_parry', 'hot_sell', '$25,000 MEGA Hot Sell', 'Ultimate $25,000 tournament', 50, 25000, 1000, 60, 7),

-- 1v1 Fixed Games (Original Tiers)
('multi_target_reaction', '1v1', '$10 1v1', 'Quick $10 head-to-head', 1, 10, 2, 60, 8),
('sword_parry', '1v1', '$100 1v1', 'Standard $100 head-to-head', 3, 100, 2, 60, 9),
('laser_dodge', '1v1', '$250 1v1', 'Mid-tier $250 head-to-head', 5, 250, 2, 60, 10),
('memory_color', '1v1', '$500 1v1', 'High-value $500 head-to-head', 10, 500, 2, 60, 11),
('number_tap', '1v1', '$1,000 1v1', 'Premium $1,000 head-to-head', 15, 1000, 2, 60, 12),
('multi_target_reaction', '1v1', '$2,500 1v1', 'Elite $2,500 head-to-head', 25, 2500, 2, 60, 13),
('sword_parry', '1v1', '$25,000 MEGA 1v1', 'Ultimate $25,000 head-to-head', 50, 25000, 2, 60, 14);

-- 12. Create triggers for updated_at
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

SELECT 'Original fixed games system with banners and matching created successfully!' as status;
