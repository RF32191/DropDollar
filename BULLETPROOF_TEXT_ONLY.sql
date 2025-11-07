-- ============================================================================
-- BULLETPROOF: Only use TEXT, never compare UUID types
-- ============================================================================

DROP FUNCTION IF EXISTS public.hs_join_v2(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC);

-- ============================================================================
-- Hot Sell Join - PURE TEXT comparisons only
-- ============================================================================
CREATE OR REPLACE FUNCTION public.hs_join_v2(
  p_session TEXT,
  p_user UUID,
  p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_text TEXT;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id TEXT;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
  v_session_exists BOOLEAN;
BEGIN
  -- Convert UUID to TEXT for all comparisons
  v_user_text := p_user::TEXT;
  
  RAISE NOTICE '🎮 HS_JOIN_V2: session=%, user=%, fee=%', p_session, v_user_text, p_fee;
  
  -- Rate limit check (UUID user_id is fine in user_rate_limits)
  SELECT 
    COALESCE(games_last_hour, 0),
    COALESCE(games_last_day, 0)
  INTO v_hour_count, v_day_count
  FROM user_rate_limits
  WHERE user_id = p_user;
  
  IF v_hour_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
  END IF;
  
  IF v_day_count >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
  END IF;
  
  -- Get user tokens (UUID user_id is fine in users table)
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check if session exists (PURE TEXT comparison)
  SELECT EXISTS(
    SELECT 1 FROM hot_sell_sessions WHERE id::TEXT = p_session
  ) INTO v_session_exists;
  
  IF NOT v_session_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  -- Check if already joined (PURE TEXT comparison for session_id, UUID for user_id)
  IF EXISTS(
    SELECT 1 FROM hot_sell_participants 
    WHERE session_id::TEXT = p_session
    AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens (UUID is fine here)
  IF v_purchased >= p_fee THEN
    UPDATE users
    SET purchased_tokens = purchased_tokens - p_fee
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell');
  ELSE
    UPDATE users
    SET 
      purchased_tokens = 0,
      won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell (mixed)');
  END IF;
  
  -- Get RNG seed (PURE TEXT comparison)
  SELECT rng_seed INTO v_rng_seed
  FROM hot_sell_sessions
  WHERE id::TEXT = p_session;
  
  -- Generate participant ID as TEXT
  v_participant_id := gen_random_uuid()::TEXT;
  
  -- Add participant (insert TEXT values)
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id::UUID, p_session, p_user, NOW());
  
  -- Update session (PURE TEXT comparison)
  UPDATE hot_sell_sessions
  SET 
    participants_count = COALESCE(participants_count, 0) + 1,
    prize_pool = COALESCE(prize_pool, 0) + p_fee
  WHERE id::TEXT = p_session;
  
  -- Update rate limits (UUID is fine)
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    games_last_hour = user_rate_limits.games_last_hour + 1,
    games_last_day = user_rate_limits.games_last_day + 1,
    last_game_at = NOW();
  
  RAISE NOTICE '✅ SUCCESS';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Success',
    'session_id', p_session,
    'participant_id', v_participant_id,
    'rng_seed', v_rng_seed
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ============================================================================
-- Winner Takes All Join - PURE TEXT comparisons only
-- ============================================================================
CREATE OR REPLACE FUNCTION public.wta_join_v2(
  p_session TEXT,
  p_user UUID,
  p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_text TEXT;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id TEXT;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
  v_session_exists BOOLEAN;
BEGIN
  v_user_text := p_user::TEXT;
  
  RAISE NOTICE '🎮 WTA_JOIN_V2: session=%, user=%, fee=%', p_session, v_user_text, p_fee;
  
  SELECT 
    COALESCE(games_last_hour, 0),
    COALESCE(games_last_day, 0)
  INTO v_hour_count, v_day_count
  FROM user_rate_limits
  WHERE user_id = p_user;
  
  IF v_hour_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
  END IF;
  
  IF v_day_count >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
  END IF;
  
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check if session exists (PURE TEXT)
  SELECT EXISTS(
    SELECT 1 FROM winner_takes_all_sessions WHERE id::TEXT = p_session
  ) INTO v_session_exists;
  
  IF NOT v_session_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  -- Check if already joined (PURE TEXT for session_id)
  IF EXISTS(
    SELECT 1 FROM winner_takes_all_participants 
    WHERE session_id::TEXT = p_session
    AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  IF v_purchased >= p_fee THEN
    UPDATE users
    SET purchased_tokens = purchased_tokens - p_fee
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Winner Takes All');
  ELSE
    UPDATE users
    SET 
      purchased_tokens = 0,
      won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA (mixed)');
  END IF;
  
  -- Get RNG seed (PURE TEXT)
  SELECT rng_seed INTO v_rng_seed
  FROM winner_takes_all_sessions
  WHERE id::TEXT = p_session;
  
  v_participant_id := gen_random_uuid()::TEXT;
  
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id::UUID, p_session, p_user, NOW());
  
  -- Update session (PURE TEXT)
  UPDATE winner_takes_all_sessions
  SET 
    participants_count = COALESCE(participants_count, 0) + 1,
    current_pool = COALESCE(current_pool, 0) + p_fee
  WHERE id::TEXT = p_session;
  
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    games_last_hour = user_rate_limits.games_last_hour + 1,
    games_last_day = user_rate_limits.games_last_day + 1,
    last_game_at = NOW();
  
  RAISE NOTICE '✅ SUCCESS';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Success',
    'session_id', p_session,
    'participant_id', v_participant_id,
    'rng_seed', v_rng_seed
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔒 BULLETPROOF FUNCTIONS CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Strategy: Cast session IDs to TEXT for ALL comparisons';
    RAISE NOTICE '✅ All security features active';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test now!';
    RAISE NOTICE '';
END $$;

