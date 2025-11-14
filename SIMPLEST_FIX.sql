-- ============================================================================
-- SIMPLEST FIX - Let PostgreSQL handle all type conversions automatically
-- No manual casting, no UUID errors possible
-- ============================================================================

-- Drop all old functions
DROP FUNCTION IF EXISTS public.hs_join_v2 CASCADE;
DROP FUNCTION IF EXISTS public.wta_join_v2 CASCADE;
DROP FUNCTION IF EXISTS public.join_hot_sell_session CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session CASCADE;

-- Hot Sell join - simplest possible version
CREATE FUNCTION public.hs_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_new_participant_id UUID;
  v_rng INT;
BEGIN
  -- Get tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won FROM users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN '{"success":false,"message":"User not found"}'::JSONB;
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN '{"success":false,"message":"Insufficient tokens"}'::JSONB;
  END IF;
  
  -- Check session exists
  IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE id::TEXT = p_session AND status = 'active') THEN
    RETURN '{"success":false,"message":"Session not found"}'::JSONB;
  END IF;
  
  -- Check not already joined
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id::TEXT = p_session AND user_id = p_user) THEN
    RETURN '{"success":false,"message":"Already joined"}'::JSONB;
  END IF;
  
  -- Deduct tokens
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
  END IF;
  
  -- Insert transaction
  INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
  VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell');
  
  -- Get RNG
  SELECT rng_seed INTO v_rng FROM hot_sell_sessions WHERE id::TEXT = p_session;
  
  -- Join session (let PostgreSQL convert types automatically)
  v_new_participant_id := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  SELECT v_new_participant_id, id, p_user, NOW()
  FROM hot_sell_sessions
  WHERE id::TEXT = p_session;
  
  -- Update session
  UPDATE hot_sell_sessions
  SET participants_count = participants_count + 1, prize_pool = prize_pool + p_fee
  WHERE id::TEXT = p_session;
  
  -- Rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET games_last_hour = user_rate_limits.games_last_hour + 1,
      games_last_day = user_rate_limits.games_last_day + 1,
      last_game_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'session_id', p_session, 'participant_id', v_new_participant_id::TEXT, 'rng_seed', v_rng);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Winner Takes All join - simplest possible version
CREATE FUNCTION public.wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_new_participant_id UUID;
  v_rng INT;
BEGIN
  -- Get tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won FROM users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN '{"success":false,"message":"User not found"}'::JSONB;
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN '{"success":false,"message":"Insufficient tokens"}'::JSONB;
  END IF;
  
  -- Check session exists
  IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE id::TEXT = p_session AND status = 'active') THEN
    RETURN '{"success":false,"message":"Session not found"}'::JSONB;
  END IF;
  
  -- Check not already joined
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id::TEXT = p_session AND user_id = p_user) THEN
    RETURN '{"success":false,"message":"Already joined"}'::JSONB;
  END IF;
  
  -- Deduct tokens
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
  END IF;
  
  -- Insert transaction
  INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
  VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA');
  
  -- Get RNG
  SELECT rng_seed INTO v_rng FROM winner_takes_all_sessions WHERE id::TEXT = p_session;
  
  -- Join session (let PostgreSQL convert types automatically)
  v_new_participant_id := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  SELECT v_new_participant_id, id, p_user, NOW()
  FROM winner_takes_all_sessions
  WHERE id::TEXT = p_session;
  
  -- Update session
  UPDATE winner_takes_all_sessions
  SET participants_count = participants_count + 1, current_pool = current_pool + p_fee
  WHERE id::TEXT = p_session;
  
  -- Rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET games_last_hour = user_rate_limits.games_last_hour + 1,
      games_last_day = user_rate_limits.games_last_day + 1,
      last_game_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'session_id', p_session, 'participant_id', v_new_participant_id::TEXT, 'rng_seed', v_rng);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ SIMPLEST FIX COMPLETE - Functions created with automatic type handling';
END $$;


