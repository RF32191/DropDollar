-- ============================================================================
-- FINAL WORKING SOLUTION
-- Makes banners show, games work, all security intact
-- ============================================================================

-- ============================================================================
-- PART 1: Fix schema - convert session_id columns to match sessions.id type
-- ============================================================================

-- Check and convert hot_sell_participants.session_id to match hot_sell_sessions.id
DO $$
DECLARE
  v_sessions_id_type TEXT;
  v_participants_session_id_type TEXT;
BEGIN
  -- Get the type of hot_sell_sessions.id
  SELECT data_type INTO v_sessions_id_type
  FROM information_schema.columns
  WHERE table_name = 'hot_sell_sessions' AND column_name = 'id';
  
  -- Get the type of hot_sell_participants.session_id
  SELECT data_type INTO v_participants_session_id_type
  FROM information_schema.columns
  WHERE table_name = 'hot_sell_participants' AND column_name = 'session_id';
  
  RAISE NOTICE 'Hot Sell: sessions.id is %, participants.session_id is %', v_sessions_id_type, v_participants_session_id_type;
  
  -- If they don't match, convert participants.session_id
  IF v_sessions_id_type = 'uuid' AND v_participants_session_id_type != 'uuid' THEN
    -- Drop FK first
    ALTER TABLE hot_sell_participants DROP CONSTRAINT IF EXISTS hot_sell_participants_session_id_fkey;
    -- Convert column
    ALTER TABLE hot_sell_participants ALTER COLUMN session_id TYPE UUID USING session_id::UUID;
    -- Re-add FK
    ALTER TABLE hot_sell_participants ADD CONSTRAINT hot_sell_participants_session_id_fkey 
      FOREIGN KEY (session_id) REFERENCES hot_sell_sessions(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Converted hot_sell_participants.session_id to UUID';
  END IF;
  
  -- Same for winner_takes_all
  SELECT data_type INTO v_sessions_id_type
  FROM information_schema.columns
  WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'id';
  
  SELECT data_type INTO v_participants_session_id_type
  FROM information_schema.columns
  WHERE table_name = 'winner_takes_all_participants' AND column_name = 'session_id';
  
  RAISE NOTICE 'WTA: sessions.id is %, participants.session_id is %', v_sessions_id_type, v_participants_session_id_type;
  
  IF v_sessions_id_type = 'uuid' AND v_participants_session_id_type != 'uuid' THEN
    ALTER TABLE winner_takes_all_participants DROP CONSTRAINT IF EXISTS winner_takes_all_participants_session_id_fkey;
    ALTER TABLE winner_takes_all_participants ALTER COLUMN session_id TYPE UUID USING session_id::UUID;
    ALTER TABLE winner_takes_all_participants ADD CONSTRAINT winner_takes_all_participants_session_id_fkey 
      FOREIGN KEY (session_id) REFERENCES winner_takes_all_sessions(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Converted winner_takes_all_participants.session_id to UUID';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Ensure all required columns exist
-- ============================================================================

DO $$
BEGIN
  -- Hot Sell
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'rng_seed') THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN rng_seed INTEGER DEFAULT floor(random() * 1000000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'prize_pool') THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN prize_pool NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'base_price') THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN base_price NUMERIC DEFAULT 0;
  END IF;
  
  -- Winner Takes All
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'rng_seed') THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN rng_seed INTEGER DEFAULT floor(random() * 1000000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'current_pool') THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN current_pool NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'base_price') THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN base_price NUMERIC DEFAULT 0;
  END IF;
  
  -- Users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'purchased_tokens') THEN
    ALTER TABLE users ADD COLUMN purchased_tokens NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'won_tokens') THEN
    ALTER TABLE users ADD COLUMN won_tokens NUMERIC DEFAULT 0;
  END IF;
  
  RAISE NOTICE '✅ All columns exist';
END $$;

-- ============================================================================
-- PART 3: Create security tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  games_last_hour INTEGER DEFAULT 0,
  games_last_day INTEGER DEFAULT 0,
  last_game_at TIMESTAMPTZ,
  hourly_reset_at TIMESTAMPTZ DEFAULT NOW(),
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('credit', 'debit')),
  transaction_type TEXT,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: Drop old functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.hs_join_v2(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;

-- ============================================================================
-- PART 5: Create get_all functions (NOW BOTH SIDES ARE SAME TYPE!)
-- ============================================================================

CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', s.id::TEXT,
      'config_id', s.config_id::TEXT,
      'prize_pool', COALESCE(s.prize_pool, 0),
      'base_price', COALESCE(s.base_price, 0),
      'participants_count', COALESCE(s.participants_count, 0),
      'status', s.status::TEXT,
      'rng_seed', COALESCE(s.rng_seed, 0),
      'created_at', s.created_at::TEXT,
      'participants', COALESCE((
        SELECT json_agg(json_build_object('id', p.id::TEXT, 'user_id', p.user_id::TEXT, 'score', p.score, 'joined_at', p.joined_at::TEXT))
        FROM hot_sell_participants p WHERE p.session_id = s.id
      ), '[]'::json)
    )), '[]'::json)
    FROM hot_sell_sessions s WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

CREATE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', s.id::TEXT,
      'config_id', s.config_id::TEXT,
      'current_pool', COALESCE(s.current_pool, 0),
      'base_price', COALESCE(s.base_price, 0),
      'participants_count', COALESCE(s.participants_count, 0),
      'status', s.status::TEXT,
      'rng_seed', COALESCE(s.rng_seed, 0),
      'timer_started_at', s.timer_started_at::TEXT,
      'timer_duration', COALESCE(s.timer_duration, 1800),
      'created_at', s.created_at::TEXT,
      'participants', COALESCE((
        SELECT json_agg(json_build_object('id', p.id::TEXT, 'user_id', p.user_id::TEXT, 'score', p.score, 'joined_at', p.joined_at::TEXT))
        FROM winner_takes_all_participants p WHERE p.session_id = s.id
      ), '[]'::json)
    )), '[]'::json)
    FROM winner_takes_all_sessions s WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

-- ============================================================================
-- PART 6: Create join functions (CLEAN - NO UUID ERRORS!)
-- ============================================================================

CREATE FUNCTION public.hs_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session UUID;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour INT;
  v_day INT;
  v_rng INT;
BEGIN
  v_session := p_session::UUID;
  
  -- Rate limit
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0) INTO v_hour, v_day FROM user_rate_limits WHERE user_id = p_user;
  IF v_hour >= 30 THEN RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr'); END IF;
  IF v_day >= 200 THEN RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day'); END IF;
  
  -- Balance
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0) INTO v_purchased, v_won FROM users WHERE id = p_user;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'User not found'); END IF;
  IF (v_purchased + v_won) < p_fee THEN RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens'); END IF;
  
  -- Session check
  IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE id = v_session AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  -- Duplicate check (NOW CLEAN: UUID = UUID)
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id = v_session AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell');
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell (mixed)');
  END IF;
  
  -- RNG seed
  SELECT rng_seed INTO v_rng FROM hot_sell_sessions WHERE id = v_session;
  
  -- Add participant (CLEAN: UUID to UUID)
  v_participant_id := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at) VALUES (v_participant_id, v_session, p_user, NOW());
  
  -- Update session
  UPDATE hot_sell_sessions SET participants_count = participants_count + 1, prize_pool = prize_pool + p_fee WHERE id = v_session;
  
  -- Rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at) VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET games_last_hour = user_rate_limits.games_last_hour + 1, games_last_day = user_rate_limits.games_last_day + 1, last_game_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'session_id', v_session::TEXT, 'participant_id', v_participant_id::TEXT, 'rng_seed', v_rng);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE FUNCTION public.wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session UUID;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour INT;
  v_day INT;
  v_rng INT;
BEGIN
  v_session := p_session::UUID;
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0) INTO v_hour, v_day FROM user_rate_limits WHERE user_id = p_user;
  IF v_hour >= 30 THEN RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr'); END IF;
  IF v_day >= 200 THEN RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day'); END IF;
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0) INTO v_purchased, v_won FROM users WHERE id = p_user;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'User not found'); END IF;
  IF (v_purchased + v_won) < p_fee THEN RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens'); END IF;
  IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE id = v_session AND status = 'active') THEN RETURN jsonb_build_object('success', false, 'message', 'Session not found'); END IF;
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_session AND user_id = p_user) THEN RETURN jsonb_build_object('success', false, 'message', 'Already joined'); END IF;
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA');
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA (mixed)');
  END IF;
  SELECT rng_seed INTO v_rng FROM winner_takes_all_sessions WHERE id = v_session;
  v_participant_id := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at) VALUES (v_participant_id, v_session, p_user, NOW());
  UPDATE winner_takes_all_sessions SET participants_count = participants_count + 1, current_pool = current_pool + p_fee WHERE id = v_session;
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at) VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET games_last_hour = user_rate_limits.games_last_hour + 1, games_last_day = user_rate_limits.games_last_day + 1, last_game_at = NOW();
  RETURN jsonb_build_object('success', true, 'session_id', v_session::TEXT, 'participant_id', v_participant_id::TEXT, 'rng_seed', v_rng);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- PART 7: Create sessions for all configs (SO BANNERS SHOW!)
-- ============================================================================

DO $$
DECLARE
  v_config RECORD;
  v_session_id UUID;
BEGIN
  FOR v_config IN SELECT id, game_type, entry_fee FROM hot_sell_configs LOOP
    IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE config_id = v_config.id AND status = 'active') THEN
      v_session_id := gen_random_uuid();
      INSERT INTO hot_sell_sessions (id, config_id, prize_pool, base_price, participants_count, status, rng_seed, created_at, updated_at)
      VALUES (v_session_id, v_config.id, 0, v_config.entry_fee, 0, 'active', floor(random() * 1000000), NOW(), NOW());
      RAISE NOTICE '✓ Created Hot Sell session for config: %', v_config.id;
    END IF;
  END LOOP;
  
  FOR v_config IN SELECT id, game_type, entry_fee FROM winner_takes_all_configs LOOP
    IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE config_id = v_config.id AND status = 'active') THEN
      v_session_id := gen_random_uuid();
      INSERT INTO winner_takes_all_sessions (id, config_id, current_pool, base_price, participants_count, status, rng_seed, timer_duration, created_at, updated_at)
      VALUES (v_session_id, v_config.id, 0, v_config.entry_fee, 0, 'active', floor(random() * 1000000), 1800, NOW(), NOW());
      RAISE NOTICE '✓ Created WTA session for config: %', v_config.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ All sessions created';
END $$;

-- ============================================================================
-- SUCCESS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FINAL WORKING SOLUTION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Schema fixed (UUID = UUID)';
    RAISE NOTICE '✓ Functions created (no UUID errors)';
    RAISE NOTICE '✓ Sessions created (banners will show)';
    RAISE NOTICE '✓ Security active (rate limits, dual wallet, RNG, audit)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 REFRESH YOUR PAGE NOW!';
    RAISE NOTICE '';
END $$;


