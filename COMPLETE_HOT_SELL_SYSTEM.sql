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

-- Hot Sell Configurations (hardcoded game types with fixed prizes)
CREATE TABLE IF NOT EXISTS hot_sell_configs (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entry_fee NUMERIC DEFAULT 1, -- Token cost to enter
  base_price NUMERIC NOT NULL, -- Target pot amount (e.g., $2, $5, $10)
  max_participants INTEGER NOT NULL, -- Fixed number of participants
  game_duration INTEGER DEFAULT 30, -- Game duration in seconds
  rng_seed INTEGER DEFAULT 1,
  first_place_percent NUMERIC DEFAULT 60, -- 60% of pot
  second_place_percent NUMERIC DEFAULT 25, -- 25% of pot
  third_place_percent NUMERIC DEFAULT 15, -- 15% of pot
  platform_fee_percent NUMERIC DEFAULT 15, -- 15% platform fee
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hot Sell Sessions (one per config)
CREATE TABLE IF NOT EXISTS hot_sell_sessions (
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
CREATE TABLE IF NOT EXISTS hot_sell_participants (
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

-- Clear existing configs
DELETE FROM hot_sell_configs;

-- Insert Hot Sell configurations (NO 1v1, NO $50,000)
-- All games have 1st (60%), 2nd (25%), 3rd (15%) place prizes
-- Platform takes 15% fee before distribution

INSERT INTO hot_sell_configs (id, game_type, title, description, entry_fee, base_price, max_participants, game_duration, rng_seed, first_place_percent, second_place_percent, third_place_percent, platform_fee_percent) VALUES
('hs-2-sword-parry', 'sword_parry', '$2 Hot Sell - Sword Parry', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 2, 10, 30, 5, 60, 25, 15, 15),
('hs-5-blade-bounce', 'blade_bounce', '$5 Hot Sell - Blade Bounce', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 5, 15, 30, 7, 60, 25, 15, 15),
('hs-10-laser-dodge', 'laser_dodge', '$10 Hot Sell - Laser Dodge', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 10, 20, 30, 9, 60, 25, 15, 15),
('hs-25-multi-target', 'multi_target_reaction', '$25 Hot Sell - Multi Target', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 25, 30, 30, 11, 60, 25, 15, 15),
('hs-50-sword-parry', 'sword_parry', '$50 Hot Sell - Sword Parry', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 50, 40, 30, 13, 60, 25, 15, 15),
('hs-100-laser-dodge', 'laser_dodge', '$100 Hot Sell - Laser Dodge', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 100, 50, 30, 15, 60, 25, 15, 15),
('hs-250-multi-target', 'multi_target_reaction', '$250 Hot Sell - Multi Target', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 250, 75, 30, 17, 60, 25, 15, 15),
('hs-1000-cash-stack', 'cash_stack', '$1000 Hot Sell - Cash Stack', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 1000, 100, 30, 19, 60, 25, 15, 15),
('hs-2500-falling-objects', 'falling_object', '$2500 Hot Sell - Falling Objects', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 2500, 150, 30, 21, 60, 25, 15, 15),
('hs-5000-color-sequence', 'color_sequence', '$5000 Hot Sell - Color Sequence', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 5000, 200, 30, 23, 60, 25, 15, 15),
('hs-10000-laser-dodge', 'laser_dodge', '$10000 Hot Sell - Laser Dodge', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 10000, 250, 30, 25, 60, 25, 15, 15),
('hs-25000-multi-target', 'multi_target_reaction', '$25000 Hot Sell - Multi Target', '1st: 60%, 2nd: 25%, 3rd: 15%', 1, 25000, 300, 30, 27, 60, 25, 15, 15);

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
-- FUNCTION: Join Hot Sell Session
-- ============================================================================

CREATE OR REPLACE FUNCTION join_hot_sell_session(
  session_id_param UUID,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_pot NUMERIC,
  participants_count INTEGER,
  session_id UUID
) AS $$
DECLARE
  v_session_id UUID;
  v_config_id TEXT;
  v_current_pot NUMERIC;
  v_participants_count INTEGER;
  v_max_participants INTEGER;
  v_user_tokens NUMERIC;
  v_already_joined BOOLEAN;
  v_session_status TEXT;
BEGIN
  -- Get session details
  SELECT s.id, s.config_id, s.current_pot, s.participants_count, s.max_participants, s.status
  INTO v_session_id, v_config_id, v_current_pot, v_participants_count, v_max_participants, v_session_status
  FROM hot_sell_sessions s
  WHERE s.id = session_id_param;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found', 0::NUMERIC, 0, NULL::UUID;
    RETURN;
  END IF;

  -- Check if session is completed
  IF v_session_status = 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Session is already completed', v_current_pot, v_participants_count, v_session_id;
    RETURN;
  END IF;

  -- Check if user already joined this session
  SELECT EXISTS(
    SELECT 1 FROM hot_sell_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_already_joined;

  IF v_already_joined THEN
    RETURN QUERY SELECT FALSE, 'You have already joined this session', v_current_pot, v_participants_count, v_session_id;
    RETURN;
  END IF;

  -- Check if session is full
  IF v_participants_count >= v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Session is full', v_current_pot, v_participants_count, v_session_id;
    RETURN;
  END IF;

  -- Check user's token balance
  SELECT tokens INTO v_user_tokens FROM users WHERE id = user_id_param;
  
  IF v_user_tokens IS NULL OR v_user_tokens < entry_fee_param THEN
    RETURN QUERY SELECT FALSE, 'Insufficient tokens', v_current_pot, v_participants_count, v_session_id;
    RETURN;
  END IF;

  -- Deduct tokens from user
  UPDATE users SET tokens = tokens - entry_fee_param WHERE id = user_id_param;

  -- Add participant
  INSERT INTO hot_sell_participants (session_id, user_id)
  VALUES (v_session_id, user_id_param);

  -- Update session
  UPDATE hot_sell_sessions
  SET 
    current_pot = current_pot + entry_fee_param,
    participants_count = participants_count + 1,
    status = CASE 
      WHEN participants_count + 1 >= max_participants THEN 'active'
      ELSE 'waiting'
    END,
    updated_at = NOW()
  WHERE id = v_session_id
  RETURNING current_pot, participants_count INTO v_current_pot, v_participants_count;

  RETURN QUERY SELECT TRUE, 'Successfully joined session', v_current_pot, v_participants_count, v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Update Hot Sell Score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_hot_sell_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_participant_exists BOOLEAN;
  v_session_status TEXT;
  v_participants_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Check if participant exists
  SELECT EXISTS(
    SELECT 1 FROM hot_sell_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF NOT v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Participant not found in this session';
    RETURN;
  END IF;

  -- Update participant score
  UPDATE hot_sell_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = session_id_param AND user_id = user_id_param;

  -- Get session info
  SELECT status, participants_count, max_participants
  INTO v_session_status, v_participants_count, v_max_participants
  FROM hot_sell_sessions
  WHERE id = session_id_param;

  -- If all participants have joined and played, mark as completed
  IF v_participants_count >= v_max_participants THEN
    DECLARE
      v_completed_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_completed_count
      FROM hot_sell_participants
      WHERE session_id = session_id_param AND score IS NOT NULL;

      IF v_completed_count >= v_max_participants THEN
        UPDATE hot_sell_sessions
        SET 
          status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = session_id_param;
      END IF;
    END;
  END IF;

  RETURN QUERY SELECT TRUE, 'Score updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Process Hot Sell Payout (3 Winners)
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
  -- Get active session for this config
  SELECT id, current_pot INTO v_session_id, v_current_pot
  FROM hot_sell_sessions
  WHERE config_id = config_id_param AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No completed session found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get prize percentages
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

  -- Get top 3 winners
  SELECT user_id INTO v_first_user_id
  FROM hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  SELECT user_id INTO v_second_user_id
  FROM hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL AND user_id != v_first_user_id
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  SELECT user_id INTO v_third_user_id
  FROM hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL AND user_id NOT IN (v_first_user_id, v_second_user_id)
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  IF v_first_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No winners found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Award prizes
  UPDATE users SET tokens = tokens + v_first_prize WHERE id = v_first_user_id;
  
  IF v_second_user_id IS NOT NULL THEN
    UPDATE users SET tokens = tokens + v_second_prize WHERE id = v_second_user_id;
  END IF;
  
  IF v_third_user_id IS NOT NULL THEN
    UPDATE users SET tokens = tokens + v_third_prize WHERE id = v_third_user_id;
  END IF;

  -- Update session with winners
  UPDATE hot_sell_sessions
  SET
    first_place_user_id = v_first_user_id,
    second_place_user_id = v_second_user_id,
    third_place_user_id = v_third_user_id,
    first_place_prize = v_first_prize,
    second_place_prize = v_second_prize,
    third_place_prize = v_third_prize,
    platform_fee = v_platform_fee,
    updated_at = NOW()
  WHERE id = v_session_id;

  -- Get winner emails
  SELECT email INTO v_first_email FROM users WHERE id = v_first_user_id;
  SELECT email INTO v_second_email FROM users WHERE id = v_second_user_id;
  SELECT email INTO v_third_email FROM users WHERE id = v_third_user_id;

  RETURN QUERY SELECT 
    TRUE, 
    'Payout completed', 
    COALESCE(v_first_email, 'Unknown'),
    COALESCE(v_second_email, 'Unknown'),
    COALESCE(v_third_email, 'Unknown'),
    v_first_prize,
    v_second_prize,
    v_third_prize;
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

RAISE NOTICE '✅ Hot Sell system created successfully!';
RAISE NOTICE '📊 12 configurations added (NO 1v1, NO $50,000)';
RAISE NOTICE '🏆 3-place prize system: 1st (60%%), 2nd (25%%), 3rd (15%%)';
RAISE NOTICE '💰 Platform fee: 15%%';
RAISE NOTICE '⏱️  No timers - games complete when max participants reached';

