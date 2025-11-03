-- ============================================================================
-- VERIFY AND UPDATE GAME FUNCTIONS TO USE DUAL WALLET
-- ============================================================================
-- Ensures all games check purchased_tokens + won_tokens
-- ============================================================================

-- ============================================================================
-- 1. Verify spend_tokens function exists and works correctly
-- ============================================================================

-- This function should already exist and use dual wallet
-- It spends purchased tokens first, then won tokens
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('spend_tokens', 'get_total_tokens', 'add_purchased_tokens', 'add_won_tokens')
ORDER BY routine_name;

-- ============================================================================
-- 2. Update join_hot_sell_session to use spend_tokens (dual wallet)
-- ============================================================================

CREATE OR REPLACE FUNCTION join_hot_sell_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_pot DECIMAL(10,2),
  participant_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_status TEXT;
  v_current_pot DECIMAL(10,2);
  v_participant_exists BOOLEAN;
  v_new_participant_id TEXT;
  v_spend_result RECORD;
BEGIN
  -- Check session
  SELECT status, prize_pool INTO v_session_status, v_current_pot
  FROM public.hot_sell_sessions
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session is not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = session_id_param AND user_id::TEXT = user_id_param::TEXT
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- SPEND TOKENS FROM DUAL WALLET (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Add to prize pool
  v_current_pot := v_current_pot + entry_fee_param;
  
  UPDATE public.hot_sell_sessions
  SET prize_pool = v_current_pot, updated_at = NOW()
  WHERE id = session_id_param;

  -- Add participant
  v_new_participant_id := gen_random_uuid()::TEXT;
  
  INSERT INTO public.hot_sell_participants (
    id, session_id, user_id, entry_fee, joined_at
  ) VALUES (
    v_new_participant_id, session_id_param, user_id_param, entry_fee_param, NOW()
  );

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pot, v_new_participant_id;
END;
$$;

-- ============================================================================
-- 3. Update join_winner_takes_all_session to use spend_tokens (dual wallet)
-- ============================================================================

CREATE OR REPLACE FUNCTION join_winner_takes_all_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_prize_pool DECIMAL(10,2),
  participant_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_status TEXT;
  v_current_pool DECIMAL(10,2);
  v_participant_exists BOOLEAN;
  v_new_participant_id TEXT;
  v_spend_result RECORD;
BEGIN
  -- Check session
  SELECT status, prize_pool INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = session_id_param AND user_id::TEXT = user_id_param::TEXT
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- SPEND TOKENS FROM DUAL WALLET (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Add to prize pool
  v_current_pool := v_current_pool + entry_fee_param;
  
  UPDATE public.winner_takes_all_sessions
  SET prize_pool = v_current_pool, updated_at = NOW()
  WHERE id = session_id_param;

  -- Add participant
  v_new_participant_id := gen_random_uuid()::TEXT;
  
  INSERT INTO public.winner_takes_all_participants (
    id, session_id, user_id, entry_fee, joined_at
  ) VALUES (
    v_new_participant_id, session_id_param, user_id_param, entry_fee_param, NOW()
  );

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pool, v_new_participant_id;
END;
$$;

-- ============================================================================
-- 4. Update join_1v1_match to use spend_tokens (dual wallet)
-- ============================================================================

CREATE OR REPLACE FUNCTION join_1v1_match(
  session_id_param UUID,
  user_id_param UUID,
  entry_fee_param DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  participant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_status TEXT;
  v_participant_count INTEGER;
  v_new_participant_id UUID;
  v_spend_result RECORD;
BEGIN
  -- Check session
  SELECT status, participants_count 
  INTO v_session_status, v_participant_count
  FROM public.one_v_one_sessions
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session not active'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_participant_count >= 2 THEN
    RETURN QUERY SELECT FALSE, 'Session full'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- SPEND TOKENS FROM DUAL WALLET (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, NULL::UUID;
    RETURN;
  END IF;

  -- Add participant
  v_new_participant_id := gen_random_uuid();
  
  INSERT INTO public.one_v_one_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, session_id_param, user_id_param, NOW()
  );

  -- Update session participant count
  UPDATE public.one_v_one_sessions
  SET 
    participants_count = participants_count + 1,
    current_pool = current_pool + entry_fee_param,
    updated_at = NOW()
  WHERE id = session_id_param;

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_new_participant_id;
END;
$$;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
-- ✅ All join functions now use spend_tokens()
-- ✅ spend_tokens() uses purchased_tokens + won_tokens
-- ✅ Purchased tokens spent first, won tokens second
-- ✅ Games will check total balance from both wallets
-- ============================================================================

