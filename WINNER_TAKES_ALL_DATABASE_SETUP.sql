-- ============================================
-- WINNER TAKES IT ALL DATABASE SETUP
-- ============================================

-- 1. Create Winner Takes It All Sessions Table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id TEXT NOT NULL,
  current_pot INTEGER DEFAULT 0,
  base_price INTEGER NOT NULL,
  participants_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  timer_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Winner Takes It All Participants Table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.winner_takes_all_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER,
  accuracy DECIMAL(5,2),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id) -- Prevent duplicate entries
);

-- 3. Create Winner Takes It All Configurations Table
CREATE TABLE IF NOT EXISTS public.winner_takes_all_configs (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entry_fee INTEGER NOT NULL,
  prize_pool DECIMAL(10,2) NOT NULL,
  base_price INTEGER NOT NULL,
  game_duration INTEGER NOT NULL,
  rng_seed INTEGER NOT NULL,
  winner_prize DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_configs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (with IF EXISTS to handle existing policies)
-- Sessions: Anyone can view, authenticated users can create/update
DROP POLICY IF EXISTS "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions;
CREATE POLICY "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create winner takes all sessions" ON public.winner_takes_all_sessions;
CREATE POLICY "Authenticated users can create winner takes all sessions" ON public.winner_takes_all_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions;
CREATE POLICY "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Participants: Anyone can view, authenticated users can insert their own
DROP POLICY IF EXISTS "Anyone can view winner takes all participants" ON public.winner_takes_all_participants;
CREATE POLICY "Anyone can view winner takes all participants" ON public.winner_takes_all_participants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own winner takes all participation" ON public.winner_takes_all_participants;
CREATE POLICY "Users can insert their own winner takes all participation" ON public.winner_takes_all_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own winner takes all participation" ON public.winner_takes_all_participants;
CREATE POLICY "Users can update their own winner takes all participation" ON public.winner_takes_all_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Configs: Anyone can view
DROP POLICY IF EXISTS "Anyone can view winner takes all configs" ON public.winner_takes_all_configs;
CREATE POLICY "Anyone can view winner takes all configs" ON public.winner_takes_all_configs
  FOR SELECT USING (true);

-- 6. Create Indexes
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_sessions_config ON public.winner_takes_all_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_sessions_status ON public.winner_takes_all_sessions(status);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_session ON public.winner_takes_all_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_user ON public.winner_takes_all_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_winner_takes_all_participants_score ON public.winner_takes_all_participants(score DESC);

-- 7. Create Functions (with IF EXISTS to handle existing functions)

-- Function to create or get Winner Takes It All session
DROP FUNCTION IF EXISTS public.create_or_get_winner_takes_all_session(TEXT);
CREATE OR REPLACE FUNCTION public.create_or_get_winner_takes_all_session(
  p_config_id TEXT
)
RETURNS TABLE(
  session_id UUID,
  config_id TEXT,
  current_pot INTEGER,
  base_price INTEGER,
  participants_count INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_config RECORD;
BEGIN
  -- Get config details
  SELECT * INTO v_config FROM public.winner_takes_all_configs WHERE id = p_config_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', p_config_id;
  END IF;
  
  -- Try to find existing session
  SELECT id INTO v_session_id 
  FROM public.winner_takes_all_sessions 
  WHERE config_id = p_config_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- If no session exists, create one
  IF v_session_id IS NULL THEN
    INSERT INTO public.winner_takes_all_sessions (
      config_id, current_pot, base_price, participants_count, status
    ) VALUES (
      p_config_id, 0, v_config.base_price, 0, 'waiting'
    ) RETURNING id INTO v_session_id;
  END IF;
  
  -- Return session data
  RETURN QUERY
  SELECT 
    s.id, s.config_id, s.current_pot, s.base_price, 
    s.participants_count, s.status, s.timer_started_at, 
    s.created_at, s.updated_at
  FROM public.winner_takes_all_sessions s
  WHERE s.id = v_session_id;
END;
$$;

-- Function to join Winner Takes It All session
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
  p_session_id UUID,
  p_user_id UUID,
  p_entry_fee INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_pot INTEGER,
  participants_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_existing_participant RECORD;
  v_new_pot INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'User must be authenticated', 0, 0;
    RETURN;
  END IF;
  
  -- Get session details
  SELECT * INTO v_session FROM public.winner_takes_all_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Session not found', 0, 0;
    RETURN;
  END IF;
  
  -- Check if user already participated
  SELECT * INTO v_existing_participant 
  FROM public.winner_takes_all_participants 
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT false, 'User already participated in this session', 0, 0;
    RETURN;
  END IF;
  
  -- Add participant (without score initially)
  INSERT INTO public.winner_takes_all_participants (session_id, user_id)
  VALUES (p_session_id, p_user_id);
  
  -- Update session pot and count
  v_new_pot := v_session.current_pot + p_entry_fee;
  v_new_count := v_session.participants_count + 1;
  
  UPDATE public.winner_takes_all_sessions
  SET 
    current_pot = v_new_pot,
    participants_count = v_new_count,
    status = CASE 
      WHEN v_new_pot >= v_session.base_price THEN 'active'
      ELSE 'waiting'
    END,
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN QUERY SELECT true, 'Successfully joined session', v_new_pot, v_new_count;
END;
$$;

-- Function to update Winner Takes It All score
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(UUID, UUID, INTEGER, DECIMAL);
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
  p_session_id UUID,
  p_user_id UUID,
  p_score INTEGER,
  p_accuracy DECIMAL(5,2)
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'User must be authenticated';
    RETURN;
  END IF;
  
  -- Check if participant exists
  SELECT * INTO v_participant 
  FROM public.winner_takes_all_participants 
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Participant not found';
    RETURN;
  END IF;
  
  -- Update score
  UPDATE public.winner_takes_all_participants
  SET 
    score = p_score,
    accuracy = p_accuracy,
    completed_at = NOW()
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  RETURN QUERY SELECT true, 'Score updated successfully';
END;
$$;

-- Function to get Winner Takes It All session with participants
DROP FUNCTION IF EXISTS public.get_winner_takes_all_session(UUID);
CREATE OR REPLACE FUNCTION public.get_winner_takes_all_session(
  p_session_id UUID
)
RETURNS TABLE(
  session_id UUID,
  config_id TEXT,
  current_pot INTEGER,
  base_price INTEGER,
  participants_count INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.config_id,
    s.current_pot,
    s.base_price,
    s.participants_count,
    s.status,
    s.timer_started_at,
    s.created_at,
    s.updated_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'user_id', p.user_id,
          'score', p.score,
          'accuracy', p.accuracy,
          'joined_at', p.joined_at,
          'completed_at', p.completed_at
        )
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) as participants
  FROM public.winner_takes_all_sessions s
  LEFT JOIN public.winner_takes_all_participants p ON s.id = p.session_id
  WHERE s.id = p_session_id
  GROUP BY s.id, s.config_id, s.current_pot, s.base_price, s.participants_count, s.status, s.timer_started_at, s.created_at, s.updated_at;
END;
$$;

-- Function to get all Winner Takes It All sessions
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions();
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE(
  session_id UUID,
  config_id TEXT,
  current_pot INTEGER,
  base_price INTEGER,
  participants_count INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.config_id,
    s.current_pot,
    s.base_price,
    s.participants_count,
    s.status,
    s.timer_started_at,
    s.created_at,
    s.updated_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'user_id', p.user_id,
          'score', p.score,
          'accuracy', p.accuracy,
          'joined_at', p.joined_at,
          'completed_at', p.completed_at
        )
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) as participants
  FROM public.winner_takes_all_sessions s
  LEFT JOIN public.winner_takes_all_participants p ON s.id = p.session_id
  GROUP BY s.id, s.config_id, s.current_pot, s.base_price, s.participants_count, s.status, s.timer_started_at, s.created_at, s.updated_at
  ORDER BY s.created_at DESC;
END;
$$;

-- 8. Insert Winner Takes It All Configurations
INSERT INTO public.winner_takes_all_configs (
  id, game_type, title, description, entry_fee, prize_pool, base_price, 
  game_duration, rng_seed, winner_prize, platform_fee
) VALUES 
  ('wta-100-laser-dodge', 'laser_dodge', '$100 Winner Takes It All - Laser Dodge', 'Winner takes the entire $100 prize pool!', 1, 100.00, 100, 60, 1, 85.00, 15.00),
  ('wta-250-multi-target', 'multi_target', '$250 Winner Takes It All - Multi Target', 'Winner takes the entire $250 prize pool!', 1, 250.00, 250, 90, 2, 212.50, 37.50),
  ('wta-1000-sword-parry', 'sword_parry', '$1000 Winner Takes It All - Sword Parry', 'Winner takes the entire $1000 prize pool!', 1, 1000.00, 1000, 120, 3, 850.00, 150.00),
  ('wta-2500-quick-click', 'quick_click', '$2500 Winner Takes It All - Quick Click', 'Winner takes the entire $2500 prize pool!', 1, 2500.00, 2500, 180, 4, 2125.00, 375.00),
  ('wta-2-color-sequence', 'color_sequence', '$2 Winner Takes It All - Color Sequence', 'Winner takes the entire $2 prize pool!', 1, 2.00, 2, 30, 5, 1.70, 0.30),
  ('wta-10-laser-dodge', 'laser_dodge', '$10 Winner Takes It All - Laser Dodge', 'Winner takes the entire $10 prize pool!', 1, 10.00, 10, 45, 6, 8.50, 1.50)
ON CONFLICT (id) DO UPDATE SET
  game_type = EXCLUDED.game_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  entry_fee = EXCLUDED.entry_fee,
  prize_pool = EXCLUDED.prize_pool,
  base_price = EXCLUDED.base_price,
  game_duration = EXCLUDED.game_duration,
  rng_seed = EXCLUDED.rng_seed,
  winner_prize = EXCLUDED.winner_prize,
  platform_fee = EXCLUDED.platform_fee,
  updated_at = NOW();

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.winner_takes_all_sessions TO authenticated;
GRANT ALL ON public.winner_takes_all_participants TO authenticated;
GRANT ALL ON public.winner_takes_all_configs TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_get_winner_takes_all_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_winner_takes_all_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated;

-- 10. Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_winner_takes_all_sessions_updated_at ON public.winner_takes_all_sessions;
CREATE TRIGGER update_winner_takes_all_sessions_updated_at
  BEFORE UPDATE ON public.winner_takes_all_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_winner_takes_all_configs_updated_at ON public.winner_takes_all_configs;
CREATE TRIGGER update_winner_takes_all_configs_updated_at
  BEFORE UPDATE ON public.winner_takes_all_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
