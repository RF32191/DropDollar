-- ============================================================================
-- COMPLETE 1V1 SYSTEM - ALL GAMES AT 5 PRICE TIERS
-- ============================================================================
-- 2 players max, winner takes 85%, platform takes 15%
-- NO TIMERS - game ends when both players complete
-- Price tiers: $1, $2, $5, $10, $25
-- ============================================================================

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS one_v_one_participants CASCADE;
DROP TABLE IF EXISTS one_v_one_sessions CASCADE;
DROP TABLE IF EXISTS one_v_one_configs CASCADE;

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

CREATE TABLE one_v_one_configs (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entry_fee NUMERIC DEFAULT 1,
  prize_pool NUMERIC NOT NULL,
  game_duration INTEGER DEFAULT 60,
  rng_seed INTEGER DEFAULT 1,
  winner_prize NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE one_v_one_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id TEXT NOT NULL REFERENCES one_v_one_configs(id) ON DELETE CASCADE,
  current_pot NUMERIC DEFAULT 0,
  prize_pool NUMERIC NOT NULL,
  participants_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 2,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  winner_user_id UUID REFERENCES public.users(id),
  prize_amount NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE one_v_one_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES one_v_one_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC,
  accuracy NUMERIC,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- Create indexes
CREATE INDEX idx_1v1_sessions_config ON one_v_one_sessions(config_id);
CREATE INDEX idx_1v1_sessions_status ON one_v_one_sessions(status);
CREATE INDEX idx_1v1_participants_session ON one_v_one_participants(session_id);
CREATE INDEX idx_1v1_participants_user ON one_v_one_participants(user_id);

-- ============================================================================
-- GAME CONFIGURATIONS - ALL 8 GAMES WITH 5 PRICE TIERS EACH
-- ============================================================================
-- Winner Prize: 85% of pot
-- Platform Fee: 15% of pot
-- Price tiers: $1, $2, $5, $10, $25
-- ============================================================================

INSERT INTO one_v_one_configs (id, game_type, title, description, entry_fee, prize_pool, game_duration, rng_seed, winner_prize, platform_fee) VALUES

-- SWORD PARRY - 5 tiers
('1v1-1-sword-parry', 'sword_parry', '$1 1v1 - Sword Slash', 'Winner takes 85%!', 1, 1, 60, 101, 0.85, 0.15),
('1v1-2-sword-parry', 'sword_parry', '$2 1v1 - Sword Slash', 'Winner takes 85%!', 1, 2, 60, 102, 1.70, 0.30),
('1v1-5-sword-parry', 'sword_parry', '$5 1v1 - Sword Slash', 'Winner takes 85%!', 1, 5, 60, 103, 4.25, 0.75),
('1v1-10-sword-parry', 'sword_parry', '$10 1v1 - Sword Slash', 'Winner takes 85%!', 1, 10, 60, 104, 8.50, 1.50),
('1v1-25-sword-parry', 'sword_parry', '$25 1v1 - Sword Slash', 'Winner takes 85%!', 1, 25, 60, 105, 21.25, 3.75),

-- BLADE BOUNCE - 5 tiers
('1v1-1-blade-bounce', 'blade_bounce', '$1 1v1 - Blade Bounce', 'Winner takes 85%!', 1, 1, 60, 201, 0.85, 0.15),
('1v1-2-blade-bounce', 'blade_bounce', '$2 1v1 - Blade Bounce', 'Winner takes 85%!', 1, 2, 60, 202, 1.70, 0.30),
('1v1-5-blade-bounce', 'blade_bounce', '$5 1v1 - Blade Bounce', 'Winner takes 85%!', 1, 5, 60, 203, 4.25, 0.75),
('1v1-10-blade-bounce', 'blade_bounce', '$10 1v1 - Blade Bounce', 'Winner takes 85%!', 1, 10, 60, 204, 8.50, 1.50),
('1v1-25-blade-bounce', 'blade_bounce', '$25 1v1 - Blade Bounce', 'Winner takes 85%!', 1, 25, 60, 205, 21.25, 3.75),

-- LASER DODGE - 5 tiers
('1v1-1-laser-dodge', 'laser_dodge', '$1 1v1 - Laser Dodge', 'Winner takes 85%!', 1, 1, 60, 301, 0.85, 0.15),
('1v1-2-laser-dodge', 'laser_dodge', '$2 1v1 - Laser Dodge', 'Winner takes 85%!', 1, 2, 60, 302, 1.70, 0.30),
('1v1-5-laser-dodge', 'laser_dodge', '$5 1v1 - Laser Dodge', 'Winner takes 85%!', 1, 5, 60, 303, 4.25, 0.75),
('1v1-10-laser-dodge', 'laser_dodge', '$10 1v1 - Laser Dodge', 'Winner takes 85%!', 1, 10, 60, 304, 8.50, 1.50),
('1v1-25-laser-dodge', 'laser_dodge', '$25 1v1 - Laser Dodge', 'Winner takes 85%!', 1, 25, 60, 305, 21.25, 3.75),

-- MULTI-TARGET REACTION - 5 tiers
('1v1-1-multi-target', 'multi_target_reaction', '$1 1v1 - Multi-Target', 'Winner takes 85%!', 1, 1, 60, 401, 0.85, 0.15),
('1v1-2-multi-target', 'multi_target_reaction', '$2 1v1 - Multi-Target', 'Winner takes 85%!', 1, 2, 60, 402, 1.70, 0.30),
('1v1-5-multi-target', 'multi_target_reaction', '$5 1v1 - Multi-Target', 'Winner takes 85%!', 1, 5, 60, 403, 4.25, 0.75),
('1v1-10-multi-target', 'multi_target_reaction', '$10 1v1 - Multi-Target', 'Winner takes 85%!', 1, 10, 60, 404, 8.50, 1.50),
('1v1-25-multi-target', 'multi_target_reaction', '$25 1v1 - Multi-Target', 'Winner takes 85%!', 1, 25, 60, 405, 21.25, 3.75),

-- FALLING OBJECT CATCH - 5 tiers
('1v1-1-falling-object', 'falling_object', '$1 1v1 - Coin Catch', 'Winner takes 85%!', 1, 1, 60, 501, 0.85, 0.15),
('1v1-2-falling-object', 'falling_object', '$2 1v1 - Coin Catch', 'Winner takes 85%!', 1, 2, 60, 502, 1.70, 0.30),
('1v1-5-falling-object', 'falling_object', '$5 1v1 - Coin Catch', 'Winner takes 85%!', 1, 5, 60, 503, 4.25, 0.75),
('1v1-10-falling-object', 'falling_object', '$10 1v1 - Coin Catch', 'Winner takes 85%!', 1, 10, 60, 504, 8.50, 1.50),
('1v1-25-falling-object', 'falling_object', '$25 1v1 - Coin Catch', 'Winner takes 85%!', 1, 25, 60, 505, 21.25, 3.75),

-- COLOR SEQUENCE MEMORY - 5 tiers
('1v1-1-color-sequence', 'color_sequence', '$1 1v1 - Color Memory', 'Winner takes 85%!', 1, 1, 60, 601, 0.85, 0.15),
('1v1-2-color-sequence', 'color_sequence', '$2 1v1 - Color Memory', 'Winner takes 85%!', 1, 2, 60, 602, 1.70, 0.30),
('1v1-5-color-sequence', 'color_sequence', '$5 1v1 - Color Memory', 'Winner takes 85%!', 1, 5, 60, 603, 4.25, 0.75),
('1v1-10-color-sequence', 'color_sequence', '$10 1v1 - Color Memory', 'Winner takes 85%!', 1, 10, 60, 604, 8.50, 1.50),
('1v1-25-color-sequence', 'color_sequence', '$25 1v1 - Color Memory', 'Winner takes 85%!', 1, 25, 60, 605, 21.25, 3.75),

-- CASH STACK CHALLENGE - 5 tiers
('1v1-1-cash-stack', 'cash_stack', '$1 1v1 - Cash Stack', 'Winner takes 85%!', 1, 1, 60, 701, 0.85, 0.15),
('1v1-2-cash-stack', 'cash_stack', '$2 1v1 - Cash Stack', 'Winner takes 85%!', 1, 2, 60, 702, 1.70, 0.30),
('1v1-5-cash-stack', 'cash_stack', '$5 1v1 - Cash Stack', 'Winner takes 85%!', 1, 5, 60, 703, 4.25, 0.75),
('1v1-10-cash-stack', 'cash_stack', '$10 1v1 - Cash Stack', 'Winner takes 85%!', 1, 10, 60, 704, 8.50, 1.50),
('1v1-25-cash-stack', 'cash_stack', '$25 1v1 - Cash Stack', 'Winner takes 85%!', 1, 25, 60, 705, 21.25, 3.75),

-- QUICK CLICK - 5 tiers
('1v1-1-quick-click', 'quick_click', '$1 1v1 - Quick Click', 'Winner takes 85%!', 1, 1, 60, 801, 0.85, 0.15),
('1v1-2-quick-click', 'quick_click', '$2 1v1 - Quick Click', 'Winner takes 85%!', 1, 2, 60, 802, 1.70, 0.30),
('1v1-5-quick-click', 'quick_click', '$5 1v1 - Quick Click', 'Winner takes 85%!', 1, 5, 60, 803, 4.25, 0.75),
('1v1-10-quick-click', 'quick_click', '$10 1v1 - Quick Click', 'Winner takes 85%!', 1, 10, 60, 804, 8.50, 1.50),
('1v1-25-quick-click', 'quick_click', '$25 1v1 - Quick Click', 'Winner takes 85%!', 1, 25, 60, 805, 21.25, 3.75);

-- ============================================================================
-- CREATE INITIAL WAITING SESSIONS FOR ALL CONFIGS
-- ============================================================================

INSERT INTO one_v_one_sessions (config_id, current_pot, prize_pool, status)
SELECT 
  id,
  0,
  prize_pool,
  'waiting'
FROM one_v_one_configs;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE one_v_one_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_v_one_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_v_one_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view 1v1 configs" ON one_v_one_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can view 1v1 sessions" ON one_v_one_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can view 1v1 participants" ON one_v_one_participants FOR SELECT USING (true);
CREATE POLICY "Users can join 1v1 sessions" ON one_v_one_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get all 1v1 sessions
CREATE OR REPLACE FUNCTION get_all_1v1_sessions()
RETURNS TABLE (
  id UUID,
  config_id TEXT,
  current_pot NUMERIC,
  prize_pool NUMERIC,
  participants_count INTEGER,
  max_participants INTEGER,
  status TEXT,
  winner_user_id UUID,
  prize_amount NUMERIC,
  platform_fee NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  participants JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.config_id,
    s.current_pot,
    s.prize_pool,
    s.participants_count,
    s.max_participants,
    s.status,
    s.winner_user_id,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    s.completed_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM one_v_one_participants p
        WHERE p.session_id = s.id
      ),
      '[]'::jsonb
    ) as participants
  FROM one_v_one_sessions s
  WHERE s.status IN ('waiting', 'active')
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a 1v1 session
CREATE OR REPLACE FUNCTION join_1v1_session(
  session_id_param UUID,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  user_record RECORD;
  new_pot NUMERIC;
  new_participants_count INTEGER;
BEGIN
  -- Get session
  SELECT * INTO session_record FROM one_v_one_sessions WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Session not found');
  END IF;

  -- Check if session is full
  IF session_record.participants_count >= 2 THEN
    RETURN json_build_object('success', false, 'message', 'Session is full');
  END IF;

  -- Get user
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Check user has enough tokens
  IF user_record.tokens < entry_fee_param THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;

  -- Deduct tokens
  UPDATE users SET tokens = tokens - entry_fee_param WHERE id = user_id_param;

  -- Add participant
  INSERT INTO one_v_one_participants (session_id, user_id)
  VALUES (session_id_param, user_id_param);

  -- Update session
  new_pot := session_record.current_pot + entry_fee_param;
  new_participants_count := session_record.participants_count + 1;

  UPDATE one_v_one_sessions
  SET 
    current_pot = new_pot,
    participants_count = new_participants_count,
    status = CASE WHEN new_participants_count >= 2 THEN 'active' ELSE 'waiting' END,
    updated_at = NOW()
  WHERE id = session_id_param;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined session',
    'newPot', new_pot,
    'participantsCount', new_participants_count,
    'status', CASE WHEN new_participants_count >= 2 THEN 'active' ELSE 'waiting' END
  );
END;
$$;

-- Function to update score
CREATE OR REPLACE FUNCTION update_1v1_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE one_v_one_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = session_id_param AND user_id = user_id_param;

  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Score updated');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Participant not found');
  END IF;
END;
$$;

-- Function to process 1v1 payout
CREATE OR REPLACE FUNCTION process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  config_record RECORD;
  winner_record RECORD;
  total_pot NUMERIC;
  winner_prize NUMERIC;
  platform_fee_amount NUMERIC;
  winner_username TEXT;
BEGIN
  RAISE NOTICE '🔍 [1v1 Payout] Starting for config: %', config_id_param;

  -- Find active/waiting session for this config
  SELECT * INTO session_record
  FROM one_v_one_sessions
  WHERE config_id = config_id_param
    AND status IN ('waiting', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE '❌ [1v1 Payout] No active session found';
    RETURN jsonb_build_object('success', false, 'message', 'No active session found');
  END IF;

  -- Check both players have played
  IF session_record.participants_count < 2 THEN
    RAISE NOTICE '⏸️ [1v1 Payout] Only % player(s), need 2', session_record.participants_count;
    RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
  END IF;

  -- Check both have scores
  SELECT COUNT(*) INTO winner_record FROM one_v_one_participants
  WHERE session_id = session_record.id AND score IS NOT NULL;
  
  IF winner_record.count < 2 THEN
    RAISE NOTICE '⏸️ [1v1 Payout] Only % score(s), need 2', winner_record.count;
    RETURN jsonb_build_object('success', false, 'message', 'Both players must complete the game');
  END IF;

  -- Get config
  SELECT * INTO config_record FROM one_v_one_configs WHERE id = config_id_param;

  -- Calculate prizes
  total_pot := session_record.current_pot;
  platform_fee_amount := total_pot * 0.15;
  winner_prize := total_pot * 0.85;

  -- Find winner (highest score)
  SELECT p.user_id, p.score, u.email INTO winner_record
  FROM one_v_one_participants p
  JOIN users u ON p.user_id = u.id
  WHERE p.session_id = session_record.id
  ORDER BY p.score DESC
  LIMIT 1;

  winner_username := COALESCE(winner_record.email, 'Unknown');

  RAISE NOTICE '🏆 [1v1 Payout] Winner: % with score %', winner_username, winner_record.score;

  -- Pay winner
  UPDATE users
  SET tokens = tokens + winner_prize
  WHERE id = winner_record.user_id;

  -- Mark session as completed
  UPDATE one_v_one_sessions
  SET 
    status = 'completed',
    winner_user_id = winner_record.user_id,
    prize_amount = winner_prize,
    platform_fee = platform_fee_amount,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = session_record.id;

  -- Create new waiting session
  INSERT INTO one_v_one_sessions (config_id, current_pot, prize_pool, status)
  VALUES (config_id_param, 0, config_record.prize_pool, 'waiting');

  RAISE NOTICE '✅ [1v1 Payout] Complete! New session created.';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payout successful',
    'winner', winner_username,
    'winner_score', winner_record.score,
    'prize_amount', winner_prize,
    'total_pot', total_pot,
    'platform_fee', platform_fee_amount
  );
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  game_count INTEGER;
  total_configs INTEGER;
BEGIN
  SELECT COUNT(DISTINCT game_type) INTO game_count FROM one_v_one_configs;
  SELECT COUNT(*) INTO total_configs FROM one_v_one_configs;
  
  RAISE NOTICE '✅ 1v1 system created successfully!';
  RAISE NOTICE '🎮 Total game types: %', game_count;
  RAISE NOTICE '📊 Total configurations: %', total_configs;
  RAISE NOTICE '👥 Max participants: 2 players per session';
  RAISE NOTICE '🏆 Winner takes: 85%% of pot';
  RAISE NOTICE '💰 Platform fee: 15%% of pot';
  RAISE NOTICE '💵 Price tiers: $1, $2, $5, $10, $25';
  RAISE NOTICE '⏱️  No timers - game ends when both players complete';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 All 8 games have 5 price tiers each = 40 total listings';
END $$;

