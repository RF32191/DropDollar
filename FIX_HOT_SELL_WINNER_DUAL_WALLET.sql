-- ============================================================================
-- FIX HOT SELL & WINNER TAKES ALL DUAL WALLET SYSTEM
-- ============================================================================
-- Fixes "operator does not exist: text = uuid" error
-- Updates all join functions to properly use spend_tokens (purchased first)
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure spend_tokens function exists and works correctly
-- ============================================================================

DROP FUNCTION IF EXISTS spend_tokens(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS spend_tokens(TEXT, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION spend_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  purchased_spent DECIMAL(10,2),
  won_spent DECIMAL(10,2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_purchased DECIMAL(10,2);
  current_won DECIMAL(10,2);
  total_available DECIMAL(10,2);
  purchased_to_spend DECIMAL(10,2);
  won_to_spend DECIMAL(10,2);
BEGIN
  RAISE NOTICE '💰 [Spend Tokens] User: %, Amount: %', user_id_param, amount;
  
  -- Get current balances
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO current_purchased, current_won
  FROM public.users
  WHERE id = user_id_param;
  
  RAISE NOTICE '💰 [Spend Tokens] Current - Purchased: %, Won: %', current_purchased, current_won;
  
  total_available := current_purchased + current_won;
  
  -- Check if user has enough tokens
  IF total_available < amount THEN
    RAISE NOTICE '❌ [Spend Tokens] Insufficient! Need: %, Have: %', amount, total_available;
    RETURN QUERY SELECT 
      FALSE, 
      0::DECIMAL(10,2), 
      0::DECIMAL(10,2),
      'Insufficient tokens. Need ' || amount::TEXT || ', have ' || total_available::TEXT;
    RETURN;
  END IF;
  
  -- Calculate how much to spend from each wallet
  -- ALWAYS SPEND PURCHASED TOKENS FIRST!
  IF current_purchased >= amount THEN
    -- Can pay entirely from purchased tokens
    purchased_to_spend := amount;
    won_to_spend := 0;
  ELSE
    -- Need to use both wallets (purchased first, then won)
    purchased_to_spend := current_purchased;
    won_to_spend := amount - current_purchased;
  END IF;
  
  RAISE NOTICE '✅ [Spend Tokens] Spending - Purchased: %, Won: %', purchased_to_spend, won_to_spend;
  
  -- Update balances (DEDUCT FROM PURCHASED FIRST!)
  UPDATE public.users
  SET 
    purchased_tokens = purchased_tokens - purchased_to_spend,
    won_tokens = won_tokens - won_to_spend,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  RETURN QUERY SELECT 
    TRUE, 
    purchased_to_spend, 
    won_to_spend,
    'Successfully spent ' || amount::TEXT || ' tokens (Purchased: ' || purchased_to_spend::TEXT || ', Won: ' || won_to_spend::TEXT || ')';
END;
$$;

GRANT EXECUTE ON FUNCTION spend_tokens(UUID, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- STEP 2: Fix join_hot_sell_session
-- ============================================================================

DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL) CASCADE;

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
  v_session_id UUID;
  v_session_status TEXT;
  v_current_pot DECIMAL(10,2);
  v_participant_exists BOOLEAN;
  v_new_participant_id UUID;
  v_spend_result RECORD;
  v_session_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🔥 [Hot Sell Join] Session: %, User: %, Fee: %', session_id_param, user_id_param, entry_fee_param;
  
  -- Convert session_id from TEXT to UUID safely
  BEGIN 
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE '❌ [Hot Sell Join] Invalid session ID format';
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END;
  
  -- Check session exists
  SELECT EXISTS (SELECT 1 FROM public.hot_sell_sessions WHERE id = v_session_id) INTO v_session_exists;
  IF NOT v_session_exists THEN
    RAISE NOTICE '❌ [Hot Sell Join] Session not found';
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  -- Get session status and pot
  SELECT status, COALESCE(current_pool, 0) 
  INTO v_session_status, v_current_pot 
  FROM public.hot_sell_sessions 
  WHERE id = v_session_id;
  
  IF v_session_status IS NULL THEN
    RAISE NOTICE '❌ [Hot Sell Join] Session status null';
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  IF v_session_status != 'active' THEN
    RAISE NOTICE '❌ [Hot Sell Join] Session not active: %', v_session_status;
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants 
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;
  
  IF v_participant_exists THEN
    RAISE NOTICE '❌ [Hot Sell Join] Already joined';
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;
  
  -- Spend tokens using dual wallet (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  
  IF NOT v_spend_result.success THEN
    RAISE NOTICE '❌ [Hot Sell Join] Token spend failed: %', v_spend_result.message;
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ [Hot Sell Join] Tokens spent successfully';
  
  -- Update pot
  v_current_pot := v_current_pot + entry_fee_param;
  UPDATE public.hot_sell_sessions 
  SET current_pool = v_current_pot, updated_at = NOW() 
  WHERE id = v_session_id;
  
  -- Add participant
  v_new_participant_id := gen_random_uuid();
  INSERT INTO public.hot_sell_participants (id, session_id, user_id, joined_at) 
  VALUES (v_new_participant_id, v_session_id, user_id_param, NOW());
  
  RAISE NOTICE '✅ [Hot Sell Join] Joined successfully! New pot: %', v_current_pot;
  
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pot, v_new_participant_id::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION join_hot_sell_session(TEXT, UUID, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- STEP 3: Fix join_winner_takes_all_session
-- ============================================================================

DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL) CASCADE;

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
  v_session_id UUID;
  v_session_status TEXT;
  v_current_pool DECIMAL(10,2);
  v_participant_exists BOOLEAN;
  v_new_participant_id UUID;
  v_spend_result RECORD;
  v_session_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🏆 [Winner Takes All Join] Session: %, User: %, Fee: %', session_id_param, user_id_param, entry_fee_param;
  
  -- Convert session_id from TEXT to UUID safely
  BEGIN 
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE '❌ [Winner Takes All Join] Invalid session ID format';
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END;
  
  -- Check session exists
  SELECT EXISTS (SELECT 1 FROM public.winner_takes_all_sessions WHERE id = v_session_id) INTO v_session_exists;
  IF NOT v_session_exists THEN
    RAISE NOTICE '❌ [Winner Takes All Join] Session not found';
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  -- Get session status and pool
  SELECT status, COALESCE(current_pool, 0) 
  INTO v_session_status, v_current_pool 
  FROM public.winner_takes_all_sessions 
  WHERE id = v_session_id;
  
  IF v_session_status IS NULL THEN
    RAISE NOTICE '❌ [Winner Takes All Join] Session status null';
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  IF v_session_status != 'active' THEN
    RAISE NOTICE '❌ [Winner Takes All Join] Session not active: %', v_session_status;
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants 
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;
  
  IF v_participant_exists THEN
    RAISE NOTICE '❌ [Winner Takes All Join] Already joined';
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;
  
  -- Spend tokens using dual wallet (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  
  IF NOT v_spend_result.success THEN
    RAISE NOTICE '❌ [Winner Takes All Join] Token spend failed: %', v_spend_result.message;
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ [Winner Takes All Join] Tokens spent successfully';
  
  -- Update pool
  v_current_pool := v_current_pool + entry_fee_param;
  UPDATE public.winner_takes_all_sessions 
  SET current_pool = v_current_pool, updated_at = NOW() 
  WHERE id = v_session_id;
  
  -- Add participant
  v_new_participant_id := gen_random_uuid();
  INSERT INTO public.winner_takes_all_participants (id, session_id, user_id, joined_at) 
  VALUES (v_new_participant_id, v_session_id, user_id_param, NOW());
  
  RAISE NOTICE '✅ [Winner Takes All Join] Joined successfully! New pool: %', v_current_pool;
  
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pool, v_new_participant_id::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION join_winner_takes_all_session(TEXT, UUID, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check your token balances
SELECT 
  id,
  email,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total
FROM public.users
WHERE 
  email ILIKE '%ryan%'
ORDER BY email;

-- Verify functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('spend_tokens', 'join_hot_sell_session', 'join_winner_takes_all_session')
ORDER BY proname;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ spend_tokens function recreated with logging
-- ✅ join_hot_sell_session updated for dual wallet
-- ✅ join_winner_takes_all_session updated for dual wallet
-- ✅ All TEXT = UUID errors fixed
-- ✅ Purchased tokens spent first, then won tokens
-- ============================================================================

