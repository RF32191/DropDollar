-- ============================================================================
-- FINAL FIX: EXACT PARAMETER NAMES MATCHING FRONTEND
-- ============================================================================

-- Drop old versions
DROP FUNCTION IF EXISTS public.join_hot_sell_session(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_hot_sell_session(session_id_param TEXT, user_id_param UUID, entry_fee_param NUMERIC);
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(session_id_param TEXT, user_id_param UUID, entry_fee_param NUMERIC);

-- ============================================================================
-- Join Hot Sell - EXACT FRONTEND SIGNATURE
-- ============================================================================
CREATE FUNCTION public.join_hot_sell_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sid UUID;
  v_pt NUMERIC;
  v_wt NUMERIC;
  v_pid UUID;
  v_hc INT;
  v_dc INT;
  v_rng INT;
BEGIN
  -- Convert session ID to UUID
  v_sid := session_id_param::UUID;
  
  RAISE NOTICE '🎮 JOIN HOT SELL: session=%, user=%, fee=%', session_id_param, user_id_param, entry_fee_param;
  
  -- Rate limit check
  SELECT COALESCE(games_last_hour, 0), COALESCE(games_last_day, 0)
  INTO v_hc, v_dc 
  FROM user_rate_limits 
  WHERE user_id = user_id_param;
  
  IF v_hc >= 30 THEN 
    RETURN '{"success":false,"message":"Rate limit: 30 games per hour"}'::JSON; 
  END IF;
  
  IF v_dc >= 200 THEN 
    RETURN '{"success":false,"message":"Rate limit: 200 games per day"}'::JSON; 
  END IF;
  
  -- Get user tokens
  SELECT purchased_tokens, won_tokens 
  INTO v_pt, v_wt 
  FROM users 
  WHERE id = user_id_param;
  
  IF v_pt IS NULL THEN 
    RETURN '{"success":false,"message":"User not found"}'::JSON; 
  END IF;
  
  IF COALESCE(v_pt,0) + COALESCE(v_wt,0) < entry_fee_param THEN 
    RETURN '{"success":false,"message":"Insufficient tokens"}'::JSON; 
  END IF;
  
  -- Check already joined
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id = v_sid AND user_id = user_id_param) THEN
    RETURN '{"success":false,"message":"Already joined this session"}'::JSON;
  END IF;
  
  -- Deduct tokens (purchased first)
  IF COALESCE(v_pt,0) >= entry_fee_param THEN
    UPDATE users 
    SET purchased_tokens = purchased_tokens - entry_fee_param 
    WHERE id = user_id_param;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (user_id_param, 'debit', 'game_entry', entry_fee_param, 'Hot Sell entry');
  ELSE
    UPDATE users 
    SET 
      purchased_tokens = 0, 
      won_tokens = won_tokens - (entry_fee_param - COALESCE(v_pt,0)) 
    WHERE id = user_id_param;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (user_id_param, 'debit', 'game_entry', entry_fee_param, 'Hot Sell entry (mixed wallets)');
  END IF;
  
  -- Get RNG seed from session
  SELECT rng_seed INTO v_rng FROM hot_sell_sessions WHERE id = v_sid;
  
  -- Add participant
  v_pid := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at) 
  VALUES (v_pid, v_sid, user_id_param, NOW());
  
  -- Update session
  UPDATE hot_sell_sessions 
  SET 
    participants_count = participants_count + 1, 
    prize_pool = COALESCE(prize_pool, 0) + entry_fee_param 
  WHERE id = v_sid;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (user_id_param, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET 
    games_last_hour = user_rate_limits.games_last_hour + 1, 
    games_last_day = user_rate_limits.games_last_day + 1, 
    last_game_at = NOW();
  
  RAISE NOTICE '✅ SUCCESS: participant_id=%', v_pid;
  
  RETURN json_build_object(
    'success', TRUE, 
    'message', 'Successfully joined session', 
    'session_id', v_sid::TEXT, 
    'participant_id', v_pid::TEXT, 
    'rng_seed', v_rng
  );
END;
$$;

-- ============================================================================
-- Join Winner Takes All - EXACT FRONTEND SIGNATURE
-- ============================================================================
CREATE FUNCTION public.join_winner_takes_all_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sid UUID;
  v_pt NUMERIC;
  v_wt NUMERIC;
  v_pid UUID;
  v_hc INT;
  v_dc INT;
  v_rng INT;
BEGIN
  v_sid := session_id_param::UUID;
  
  RAISE NOTICE '🎮 JOIN WTA: session=%, user=%, fee=%', session_id_param, user_id_param, entry_fee_param;
  
  -- Rate limit check
  SELECT COALESCE(games_last_hour, 0), COALESCE(games_last_day, 0)
  INTO v_hc, v_dc 
  FROM user_rate_limits 
  WHERE user_id = user_id_param;
  
  IF v_hc >= 30 THEN 
    RETURN '{"success":false,"message":"Rate limit: 30 games per hour"}'::JSON; 
  END IF;
  
  IF v_dc >= 200 THEN 
    RETURN '{"success":false,"message":"Rate limit: 200 games per day"}'::JSON; 
  END IF;
  
  -- Get user tokens
  SELECT purchased_tokens, won_tokens 
  INTO v_pt, v_wt 
  FROM users 
  WHERE id = user_id_param;
  
  IF v_pt IS NULL THEN 
    RETURN '{"success":false,"message":"User not found"}'::JSON; 
  END IF;
  
  IF COALESCE(v_pt,0) + COALESCE(v_wt,0) < entry_fee_param THEN 
    RETURN '{"success":false,"message":"Insufficient tokens"}'::JSON; 
  END IF;
  
  -- Check already joined
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_sid AND user_id = user_id_param) THEN
    RETURN '{"success":false,"message":"Already joined this session"}'::JSON;
  END IF;
  
  -- Deduct tokens (purchased first)
  IF COALESCE(v_pt,0) >= entry_fee_param THEN
    UPDATE users 
    SET purchased_tokens = purchased_tokens - entry_fee_param 
    WHERE id = user_id_param;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (user_id_param, 'debit', 'game_entry', entry_fee_param, 'Winner Takes All entry');
  ELSE
    UPDATE users 
    SET 
      purchased_tokens = 0, 
      won_tokens = won_tokens - (entry_fee_param - COALESCE(v_pt,0)) 
    WHERE id = user_id_param;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (user_id_param, 'debit', 'game_entry', entry_fee_param, 'WTA entry (mixed wallets)');
  END IF;
  
  -- Get RNG seed from session
  SELECT rng_seed INTO v_rng FROM winner_takes_all_sessions WHERE id = v_sid;
  
  -- Add participant
  v_pid := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at) 
  VALUES (v_pid, v_sid, user_id_param, NOW());
  
  -- Update session
  UPDATE winner_takes_all_sessions 
  SET 
    participants_count = participants_count + 1, 
    current_pool = COALESCE(current_pool, 0) + entry_fee_param 
  WHERE id = v_sid;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (user_id_param, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET 
    games_last_hour = user_rate_limits.games_last_hour + 1, 
    games_last_day = user_rate_limits.games_last_day + 1, 
    last_game_at = NOW();
  
  RAISE NOTICE '✅ SUCCESS: participant_id=%', v_pid;
  
  RETURN json_build_object(
    'success', TRUE, 
    'message', 'Successfully joined session', 
    'session_id', v_sid::TEXT, 
    'participant_id', v_pid::TEXT, 
    'rng_seed', v_rng
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 JOIN FUNCTIONS FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Parameter names now match frontend:';
    RAISE NOTICE '   • session_id_param (TEXT → UUID)';
    RAISE NOTICE '   • user_id_param (UUID)';
    RAISE NOTICE '   • entry_fee_param (NUMERIC)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL SECURITY ACTIVE:';
    RAISE NOTICE '   • Rate Limiting (30/hr, 200/day)';
    RAISE NOTICE '   • Dual Wallet (purchased first)';
    RAISE NOTICE '   • RNG Seeding (fair gameplay)';
    RAISE NOTICE '   • Audit Trail (logged)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TEST NOW!';
    RAISE NOTICE '';
END $$;

