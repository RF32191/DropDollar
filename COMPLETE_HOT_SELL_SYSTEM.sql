-- ============================================================================
-- COMPLETE HOT SELL SYSTEM WITH WINNER TAKES ALL STRUCTURE
-- This creates a complete Hot Sell system with 1st, 2nd, 3rd place prizes
-- No timers - games complete when max participants is reached
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_hot_sell_score(UUID, UUID, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS update_hot_sell_score(UUID, UUID, INTEGER, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS process_hot_sell_payout(TEXT) CASCADE;
DROP FUNCTION IF EXISTS reset_hot_sell_session_by_config_id(TEXT) CASCADE;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS hot_sell_participants CASCADE;
DROP TABLE IF EXISTS hot_sell_sessions CASCADE;
DROP TABLE IF EXISTS hot_sell_configs CASCADE;

-- Hot Sell Configurations (hardcoded game types with fixed prizes)
CREATE TABLE hot_sell_configs (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entry_fee NUMERIC DEFAULT 1, -- Token cost to enter
  base_price NUMERIC NOT NULL, -- Target pot amount (e.g., $2, $5, $10)
  max_participants INTEGER NOT NULL, -- Fixed number of participants
  game_duration INTEGER DEFAULT 30, -- Game duration in seconds
  rng_seed INTEGER DEFAULT 1,
  first_place_percent NUMERIC DEFAULT 50, -- 50% of pot
  second_place_percent NUMERIC DEFAULT 20, -- 20% of pot
  third_place_percent NUMERIC DEFAULT 15, -- 15% of pot
  platform_fee_percent NUMERIC DEFAULT 15, -- 15% platform fee
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hot Sell Sessions (one per config)
CREATE TABLE hot_sell_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id TEXT NOT NULL REFERENCES hot_sell_configs(id),
  current_pot NUMERIC DEFAULT 0,
  base_price NUMERIC NOT NULL,
  max_participants INTEGER NOT NULL,
  participants_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  
  -- Winners (no timer, completes when max participants reached)
  first_place_user_id UUID,
  second_place_user_id UUID,
  third_place_user_id UUID,
  first_place_prize NUMERIC,
  second_place_prize NUMERIC,
  third_place_prize NUMERIC,
  platform_fee NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Hot Sell Participants
CREATE TABLE hot_sell_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES hot_sell_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score NUMERIC,
  accuracy NUMERIC,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- ============================================================================
-- INSERT HOT SELL CONFIGURATIONS
-- ============================================================================

-- Insert Hot Sell configurations (NO 1v1, NO $50,000)
-- All games have 1st (50%), 2nd (20%), 3rd (15%) place prizes
-- Platform takes 15% fee before distribution

-- Max participants = base_price (so $3 = 3 players, $5 = 5 players, etc.)
-- All games now have 3-place prizes: 1st: 50%, 2nd: 20%, 3rd: 15%, Platform: 15%
INSERT INTO hot_sell_configs (id, game_type, title, description, entry_fee, base_price, max_participants, game_duration, rng_seed, first_place_percent, second_place_percent, third_place_percent, platform_fee_percent) VALUES
('hs-3-sword-parry', 'sword_parry', '$3 Hot Sell - Sword Parry', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 3, 3, 30, 5, 50, 20, 15, 15),
('hs-3-blade-bounce', 'blade_bounce', '$3 Hot Sell - Blade Bounce', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 3, 3, 30, 6, 50, 20, 15, 15),
('hs-5-laser-dodge', 'laser_dodge', '$5 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 5, 5, 30, 7, 50, 20, 15, 15),
('hs-10-laser-dodge', 'laser_dodge', '$10 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 10, 10, 30, 9, 50, 20, 15, 15),
('hs-25-multi-target', 'multi_target_reaction', '$25 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 25, 25, 30, 11, 50, 20, 15, 15),
('hs-50-sword-parry', 'sword_parry', '$50 Hot Sell - Sword Parry', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 50, 50, 30, 13, 50, 20, 15, 15),
('hs-100-laser-dodge', 'laser_dodge', '$100 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 100, 100, 30, 15, 50, 20, 15, 15),
('hs-250-multi-target', 'multi_target_reaction', '$250 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 250, 250, 30, 17, 50, 20, 15, 15),
('hs-1000-cash-stack', 'cash_stack', '$1000 Hot Sell - Cash Stack', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 1000, 1000, 30, 19, 50, 20, 15, 15),
('hs-2500-falling-objects', 'falling_object', '$2500 Hot Sell - Falling Objects', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 2500, 2500, 30, 21, 50, 20, 15, 15),
('hs-5000-color-sequence', 'color_sequence', '$5000 Hot Sell - Color Sequence', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 5000, 5000, 30, 23, 50, 20, 15, 15),
('hs-10000-laser-dodge', 'laser_dodge', '$10000 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 10000, 10000, 30, 25, 50, 20, 15, 15),
('hs-25000-multi-target', 'multi_target_reaction', '$25000 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 25000, 25000, 30, 27, 50, 20, 15, 15);

-- ============================================================================
-- FUNCTION: Get All Hot Sell Sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_all_hot_sell_sessions()
RETURNS TABLE (
  id UUID,
  config_id TEXT,
  current_pot NUMERIC,
  base_price NUMERIC,
  max_participants INTEGER,
  participants_count INTEGER,
  status TEXT,
  first_place_user_id UUID,
  second_place_user_id UUID,
  third_place_user_id UUID,
  first_place_prize NUMERIC,
  second_place_prize NUMERIC,
  third_place_prize NUMERIC,
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
    s.base_price,
    s.max_participants,
    s.participants_count,
    s.status,
    s.first_place_user_id,
    s.second_place_user_id,
    s.third_place_user_id,
    s.first_place_prize,
    s.second_place_prize,
    s.third_place_prize,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    s.completed_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'user_id', p.user_id,
          'score', p.score,
          'accuracy', p.accuracy,
          'joined_at', p.joined_at,
          'completed_at', p.completed_at
        )
      )
      FROM hot_sell_participants p
      WHERE p.session_id = s.id),
      '[]'::jsonb
    ) as participants
  FROM hot_sell_sessions s
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Join Hot Sell Session (Emulates Winner Takes All pattern)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
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
  result JSON;
BEGIN
  -- Get session info
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  -- Check if session is completed
  IF session_record.status = 'completed' THEN
    RETURN json_build_object('success', false, 'message', 'Session is already completed');
  END IF;
  
  -- Check if session is full
  IF session_record.participants_count >= session_record.max_participants THEN
    RETURN json_build_object('success', false, 'message', 'Session is full');
  END IF;
  
  -- Check if user already joined
  IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
    RETURN json_build_object('success', false, 'message', 'User already joined this session');
  END IF;
  
  -- Get user info and check token balance
  SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF user_record.tokens < entry_fee_param THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Deduct tokens from user
  UPDATE public.users 
  SET tokens = tokens - entry_fee_param,
      updated_at = NOW()
  WHERE id = user_id_param;
  
  -- Add participant
  INSERT INTO public.hot_sell_participants (session_id, user_id)
  VALUES (session_id_param, user_id_param);
  
  -- Update session pot and participant count
  new_pot := session_record.current_pot + entry_fee_param;
  new_participants_count := session_record.participants_count + 1;
  
  UPDATE public.hot_sell_sessions 
  SET current_pot = new_pot,
      participants_count = new_participants_count,
      status = CASE 
        WHEN new_participants_count >= max_participants THEN 'active'
        ELSE 'waiting'
      END,
      updated_at = NOW()
  WHERE id = session_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined session',
    'newPot', new_pot,
    'participantsCount', new_participants_count,
    'status', CASE WHEN new_participants_count >= session_record.max_participants THEN 'active' ELSE 'waiting' END
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Update Hot Sell Score
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_hot_sell_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update participant score
  UPDATE public.hot_sell_participants 
  SET score = score_param,
      accuracy = accuracy_param,
      completed_at = NOW()
  WHERE session_id = session_id_param AND user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Participant not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Score updated successfully'
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Save Hot Sell Result to Dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION save_hot_sell_to_dashboard(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  config_id_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Save to user_game_history for dashboard
  INSERT INTO user_game_history (
    user_id,
    game_type,
    score,
    accuracy,
    tokens_won,
    created_at
  ) VALUES (
    user_id_param,
    'hot_sell_' || config_id_param,
    score_param,
    0, -- accuracy not tracked for hot sell
    0, -- tokens_won updated after payout
    NOW()
  )
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Process Hot Sell Payout (3 Winners) + Auto Reset
-- ============================================================================

CREATE OR REPLACE FUNCTION process_hot_sell_payout(config_id_param TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_place_winner TEXT,
  second_place_winner TEXT,
  third_place_winner TEXT,
  first_place_amount NUMERIC,
  second_place_amount NUMERIC,
  third_place_amount NUMERIC
) AS $$
DECLARE
  v_session_id UUID;
  v_current_pot NUMERIC;
  v_max_participants INTEGER;
  v_participants_count INTEGER;
  v_completed_count INTEGER;
  v_platform_fee_percent NUMERIC;
  v_first_percent NUMERIC;
  v_second_percent NUMERIC;
  v_third_percent NUMERIC;
  v_platform_fee NUMERIC;
  v_distributable_pot NUMERIC;
  v_first_prize NUMERIC;
  v_second_prize NUMERIC;
  v_third_prize NUMERIC;
  v_first_user_id UUID;
  v_second_user_id UUID;
  v_third_user_id UUID;
  v_first_email TEXT;
  v_second_email TEXT;
  v_third_email TEXT;
BEGIN
  -- Get the ACTIVE session for this config (not completed, not waiting)
  SELECT s.id, s.current_pot, s.max_participants, s.participants_count
  INTO v_session_id, v_current_pot, v_max_participants, v_participants_count
  FROM hot_sell_sessions s
  WHERE s.config_id = config_id_param 
    AND s.status IN ('waiting', 'active')
    AND s.first_place_user_id IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No active session found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if session is full
  IF v_participants_count < v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Session not full yet', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if all participants have scores
  SELECT COUNT(*) INTO v_completed_count
  FROM hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL;

  IF v_completed_count < v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Not all players have completed', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get prize percentages from config
  SELECT platform_fee_percent, first_place_percent, second_place_percent, third_place_percent
  INTO v_platform_fee_percent, v_first_percent, v_second_percent, v_third_percent
  FROM hot_sell_configs
  WHERE id = config_id_param;

  -- Calculate platform fee and distributable pot
  v_platform_fee := v_current_pot * (v_platform_fee_percent / 100);
  v_distributable_pot := v_current_pot - v_platform_fee;

  -- Calculate prizes
  v_first_prize := v_distributable_pot * (v_first_percent / 100);
  v_second_prize := v_distributable_pot * (v_second_percent / 100);
  v_third_prize := v_distributable_pot * (v_third_percent / 100);

  -- Get 1st place winner (highest score)
  SELECT user_id INTO v_first_user_id
  FROM hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  -- Get 2nd place winner (second highest score, excluding 1st)
  SELECT user_id INTO v_second_user_id
  FROM hot_sell_participants
  WHERE session_id = v_session_id 
    AND score IS NOT NULL 
    AND user_id != v_first_user_id
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  -- Get 3rd place winner (third highest score, excluding 1st and 2nd) - only if third_place_percent > 0
  IF v_third_percent > 0 THEN
    SELECT user_id INTO v_third_user_id
    FROM hot_sell_participants
    WHERE session_id = v_session_id 
      AND score IS NOT NULL 
      AND user_id NOT IN (v_first_user_id, COALESCE(v_second_user_id, '00000000-0000-0000-0000-000000000000'::UUID))
    ORDER BY score DESC, completed_at ASC
    LIMIT 1;
  END IF;

  IF v_first_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No winners found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Award prizes to winners
  UPDATE users SET tokens = tokens + v_first_prize, updated_at = NOW() 
  WHERE id = v_first_user_id;
  
  IF v_second_user_id IS NOT NULL AND v_second_prize > 0 THEN
    UPDATE users SET tokens = tokens + v_second_prize, updated_at = NOW() 
    WHERE id = v_second_user_id;
  END IF;
  
  IF v_third_user_id IS NOT NULL AND v_third_prize > 0 THEN
    UPDATE users SET tokens = tokens + v_third_prize, updated_at = NOW() 
    WHERE id = v_third_user_id;
  END IF;

  -- Mark session as completed with winner info
  UPDATE hot_sell_sessions
  SET
    status = 'completed',
    first_place_user_id = v_first_user_id,
    second_place_user_id = v_second_user_id,
    third_place_user_id = v_third_user_id,
    first_place_prize = v_first_prize,
    second_place_prize = v_second_prize,
    third_place_prize = v_third_prize,
    platform_fee = v_platform_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session_id;

  -- Create a NEW waiting session for this config (auto-reset)
  INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
  SELECT 
    config_id_param,
    0,
    base_price,
    max_participants,
    'waiting'
  FROM hot_sell_configs
  WHERE id = config_id_param;

  -- Get winner emails for display
  SELECT email INTO v_first_email FROM users WHERE id = v_first_user_id;
  SELECT email INTO v_second_email FROM users WHERE id = v_second_user_id;
  SELECT email INTO v_third_email FROM users WHERE id = v_third_user_id;

  RETURN QUERY SELECT 
    TRUE, 
    'Payout completed and session reset', 
    COALESCE(v_first_email, 'Unknown'),
    COALESCE(v_second_email, 'Unknown'),
    COALESCE(v_third_email, 'N/A'),
    v_first_prize,
    COALESCE(v_second_prize, 0::NUMERIC),
    COALESCE(v_third_prize, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Reset Hot Sell Session
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_hot_sell_session_by_config_id(config_id_param TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_session_id UUID;
  v_new_session_id UUID;
  v_base_price NUMERIC;
  v_max_participants INTEGER;
BEGIN
  -- Get existing session
  SELECT id INTO v_session_id
  FROM hot_sell_sessions
  WHERE config_id = config_id_param
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    -- Delete participants
    DELETE FROM hot_sell_participants WHERE session_id = v_session_id;
    
    -- Delete session
    DELETE FROM hot_sell_sessions WHERE id = v_session_id;
  END IF;

  -- Get config details
  SELECT base_price, max_participants INTO v_base_price, v_max_participants
  FROM hot_sell_configs
  WHERE id = config_id_param;

  -- Create new session
  INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
  VALUES (config_id_param, 0, v_base_price, v_max_participants, 'waiting')
  RETURNING id INTO v_new_session_id;

  RETURN QUERY SELECT TRUE, 'Session reset successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE INITIAL SESSIONS
-- ============================================================================

DO $$
DECLARE
  config_record RECORD;
BEGIN
  FOR config_record IN SELECT * FROM hot_sell_configs LOOP
    -- Create initial session for each config
    INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
    VALUES (config_record.id, 0, config_record.base_price, config_record.max_participants, 'waiting');
    
    RAISE NOTICE 'Created session for: %', config_record.title;
  END LOOP;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON hot_sell_configs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON hot_sell_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON hot_sell_participants TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_all_hot_sell_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION join_hot_sell_session(UUID, UUID, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_hot_sell_score(UUID, UUID, NUMERIC, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_hot_sell_payout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_hot_sell_session_by_config_id(TEXT) TO anon, authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Hot Sell system created successfully!';
  RAISE NOTICE '📊 13 configurations added (NO 1v1, NO $2, NO $50,000)';
  RAISE NOTICE '🏆 All games: 3-place prizes (1st: 50%%, 2nd: 20%%, 3rd: 15%%)';
  RAISE NOTICE '💰 Platform fee: 15%% across all games';
  RAISE NOTICE '💵 Price tiers: $3, $5, $10, $25, $50, $100, $250, $500, $1k, $2.5k, $5k, $10k';
  RAISE NOTICE '⏱️  No timers - games complete when max participants reached';
END $$;

