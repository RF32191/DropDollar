-- SCHEDULED GAMES SYSTEM
-- Professional scheduled tournament system with random game assignment

-- 1. Create scheduled games table
DROP TABLE IF EXISTS public.scheduled_games CASCADE;
CREATE TABLE public.scheduled_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL DEFAULT 'sword-parry',
  entry_fee INTEGER NOT NULL DEFAULT 1,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 100,
  max_participants INTEGER NOT NULL DEFAULT 50,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create scheduled game participants table
DROP TABLE IF EXISTS public.scheduled_game_participants CASCADE;
CREATE TABLE public.scheduled_game_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.scheduled_games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  entry_fee_paid INTEGER NOT NULL DEFAULT 0,
  score DECIMAL(10,2) DEFAULT NULL,
  accuracy DECIMAL(5,2) DEFAULT NULL,
  placement INTEGER DEFAULT NULL,
  prize_won DECIMAL(10,2) DEFAULT 0,
  game_type TEXT DEFAULT NULL,
  rng_seed INTEGER DEFAULT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.scheduled_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_game_participants ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Scheduled games are viewable by everyone" ON public.scheduled_games
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own scheduled game participation" ON public.scheduled_game_participants
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can join scheduled games" ON public.scheduled_game_participants
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own scores" ON public.scheduled_game_participants
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 5. Create indexes
CREATE INDEX idx_scheduled_games_time ON public.scheduled_games(scheduled_time);
CREATE INDEX idx_scheduled_games_status ON public.scheduled_games(status);
CREATE INDEX idx_scheduled_game_participants_game ON public.scheduled_game_participants(game_id);
CREATE INDEX idx_scheduled_game_participants_user ON public.scheduled_game_participants(user_id);
CREATE INDEX idx_scheduled_game_participants_score ON public.scheduled_game_participants(score DESC);

-- 6. Grant permissions
GRANT ALL ON public.scheduled_games TO authenticated;
GRANT ALL ON public.scheduled_games TO anon;
GRANT ALL ON public.scheduled_game_participants TO authenticated;
GRANT ALL ON public.scheduled_game_participants TO anon;

-- 7. Create RPC functions
DROP FUNCTION IF EXISTS join_scheduled_game(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION join_scheduled_game(
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
  INSERT INTO public.scheduled_game_participants (
    game_id, user_id, entry_fee_paid, joined_at
  ) VALUES (
    p_game_id::UUID, p_user_id, p_entry_fee, NOW()
  ) RETURNING to_jsonb(scheduled_game_participants.*) INTO result;
  
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS update_scheduled_game_score(TEXT, TEXT, DECIMAL, DECIMAL, INTEGER);
CREATE OR REPLACE FUNCTION update_scheduled_game_score(
  p_game_id TEXT,
  p_user_id TEXT,
  p_score DECIMAL(10,2),
  p_accuracy DECIMAL(5,2),
  p_rng_seed INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE public.scheduled_game_participants 
  SET 
    score = p_score,
    accuracy = p_accuracy,
    rng_seed = p_rng_seed,
    updated_at = NOW()
  WHERE game_id = p_game_id::UUID AND user_id = p_user_id
  RETURNING to_jsonb(scheduled_game_participants.*) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION join_scheduled_game TO authenticated;
GRANT EXECUTE ON FUNCTION join_scheduled_game TO anon;
GRANT EXECUTE ON FUNCTION update_scheduled_game_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_scheduled_game_score TO anon;

-- 8. Insert default scheduled games
INSERT INTO public.scheduled_games (title, description, game_type, entry_fee, prize_pool, max_participants, scheduled_time, status) VALUES
('$100 Daily Cash Tournament', 'Daily tournament with $100 prize pool', 'sword-parry', 1, 100, 50, NOW() + INTERVAL '1 day', 'scheduled'),
('$500 Weekend Tournament', 'Weekend tournament with $500 prize pool', 'quick-click', 3, 500, 100, NOW() + INTERVAL '3 days', 'scheduled'),
('$1,000 Weekly Tournament', 'Weekly tournament with $1,000 prize pool', 'memory-color', 5, 1000, 200, NOW() + INTERVAL '7 days', 'scheduled'),
('$5,000 Monthly Tournament', 'Monthly tournament with $5,000 prize pool', 'number-tap', 10, 5000, 500, NOW() + INTERVAL '30 days', 'scheduled'),
('$25,000 MEGA Tournament', 'MEGA tournament with $25,000 prize pool - 2 games per day', 'shape-tap', 25, 25000, 1000, NOW() + INTERVAL '14 days', 'scheduled');

-- 9. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_scheduled_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_games_updated_at
  BEFORE UPDATE ON public.scheduled_games
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_games_updated_at();

CREATE TRIGGER trigger_scheduled_game_participants_updated_at
  BEFORE UPDATE ON public.scheduled_game_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_games_updated_at();

SELECT 'Scheduled games system created successfully!' as status;
