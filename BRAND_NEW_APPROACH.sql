-- ============================================================================
-- BRAND NEW APPROACH: Create NEW functions with NEW names
-- Then we'll update frontend to use these new names
-- ============================================================================

-- ============================================================================
-- STEP 1: Create completely new function names (avoid all caching issues)
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
  v_session_uuid UUID;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
BEGIN
  -- Step 1: Convert session ID to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  RAISE NOTICE '🎮 HS_JOIN_V2: session=%, user=%, fee=%', p_session, p_user, p_fee;
  
  -- Step 2: Check rate limits
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
  
  -- Step 3: Get user tokens
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
  
  -- Step 4: Check if already joined (using explicit UUID comparison)
  PERFORM 1 
  FROM hot_sell_participants
  WHERE session_id::UUID = v_session_uuid
  AND user_id = p_user;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Step 5: Deduct tokens (purchased first)
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
  
  -- Step 6: Get RNG seed (using explicit UUID comparison)
  SELECT rng_seed
  INTO v_rng_seed
  FROM hot_sell_sessions
  WHERE id::UUID = v_session_uuid;
  
  -- Step 7: Add participant
  v_participant_id := gen_random_uuid();
  
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_uuid::TEXT, p_user, NOW());
  
  -- Step 8: Update session
  UPDATE hot_sell_sessions
  SET 
    participants_count = COALESCE(participants_count, 0) + 1,
    prize_pool = COALESCE(prize_pool, 0) + p_fee
  WHERE id::UUID = v_session_uuid;
  
  -- Step 9: Update rate limits
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
    'session_id', v_session_uuid::TEXT,
    'participant_id', v_participant_id::TEXT,
    'rng_seed', v_rng_seed
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ============================================================================
-- Winner Takes All V2
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
  v_session_uuid UUID;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
BEGIN
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  RAISE NOTICE '🎮 WTA_JOIN_V2: session=%, user=%, fee=%', p_session, p_user, p_fee;
  
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
  
  PERFORM 1 
  FROM winner_takes_all_participants
  WHERE session_id::UUID = v_session_uuid
  AND user_id = p_user;
  
  IF FOUND THEN
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
  
  SELECT rng_seed
  INTO v_rng_seed
  FROM winner_takes_all_sessions
  WHERE id::UUID = v_session_uuid;
  
  v_participant_id := gen_random_uuid();
  
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_uuid::TEXT, p_user, NOW());
  
  UPDATE winner_takes_all_sessions
  SET 
    participants_count = COALESCE(participants_count, 0) + 1,
    current_pool = COALESCE(current_pool, 0) + p_fee
  WHERE id::UUID = v_session_uuid;
  
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
    'session_id', v_session_uuid::TEXT,
    'participant_id', v_participant_id::TEXT,
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
    RAISE NOTICE '🎉 NEW FUNCTIONS CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ New function names:';
    RAISE NOTICE '   • hs_join_v2(session TEXT, user UUID, fee NUMERIC)';
    RAISE NOTICE '   • wta_join_v2(session TEXT, user UUID, fee NUMERIC)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NEXT STEP: Update frontend to call these new functions';
    RAISE NOTICE '';
END $$;

