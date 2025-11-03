-- ============================================================================
-- UPDATE ALL ENTRY FUNCTIONS TO USE DUAL WALLET SYSTEM
-- ============================================================================
-- This updates all competition entry functions to use the new dual wallet
-- system where purchased tokens are spent first, then won tokens
-- ============================================================================

-- ============================================================================
-- 1. Update Hot Sell join function
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
  -- Check session exists and is active
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

  -- Check if user already in session
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- Spend tokens using dual wallet system (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Add to prize pool
  v_current_pot := v_current_pot + entry_fee_param;
  
  UPDATE public.hot_sell_sessions
  SET prize_pool = v_current_pot,
      updated_at = NOW()
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
-- 2. Update Winner Takes All join function
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
  -- Check session exists and is active
  SELECT status, prize_pool INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session is not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if user already in session
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- Spend tokens using dual wallet system
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Add to prize pool
  v_current_pool := v_current_pool + entry_fee_param;
  
  UPDATE public.winner_takes_all_sessions
  SET prize_pool = v_current_pool,
      updated_at = NOW()
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
-- 3. Update 1v1 match join function
-- ============================================================================

CREATE OR REPLACE FUNCTION join_1v1_match(
  match_id_param TEXT,
  user_id_param UUID,
  entry_fee_param DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  match_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_status TEXT;
  v_player1_id UUID;
  v_player2_id UUID;
  v_spend_result RECORD;
BEGIN
  -- Get match details
  SELECT status, player1_id, player2_id 
  INTO v_match_status, v_player1_id, v_player2_id
  FROM public.one_v_one_matches
  WHERE id = match_id_param;

  IF v_match_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Match not found'::TEXT, ''::TEXT;
    RETURN;
  END IF;

  IF v_match_status != 'waiting' AND v_match_status != 'ready' THEN
    RETURN QUERY SELECT FALSE, 'Match is not available'::TEXT, v_match_status;
    RETURN;
  END IF;

  -- Check if user is already in match
  IF v_player1_id = user_id_param OR v_player2_id = user_id_param THEN
    RETURN QUERY SELECT FALSE, 'Already in this match'::TEXT, v_match_status;
    RETURN;
  END IF;

  -- Spend tokens using dual wallet system
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, v_match_status;
    RETURN;
  END IF;

  -- Add player to match
  IF v_player1_id IS NULL THEN
    UPDATE public.one_v_one_matches
    SET player1_id = user_id_param,
        updated_at = NOW()
    WHERE id = match_id_param;
    
    RETURN QUERY SELECT TRUE, 'Joined as Player 1'::TEXT, 'waiting'::TEXT;
  ELSIF v_player2_id IS NULL THEN
    UPDATE public.one_v_one_matches
    SET player2_id = user_id_param,
        status = 'ready',
        updated_at = NOW()
    WHERE id = match_id_param;
    
    RETURN QUERY SELECT TRUE, 'Joined as Player 2 - Match ready!'::TEXT, 'ready'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Match is full'::TEXT, 'full'::TEXT;
  END IF;
END;
$$;

-- ============================================================================
-- 4. Update payout functions to add to WON tokens
-- ============================================================================

-- Hot Sell payout
CREATE OR REPLACE FUNCTION process_hot_sell_payout(
  session_id_param TEXT,
  winner_id_param UUID,
  payout_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add to won_tokens (cashable)
  PERFORM add_won_tokens(winner_id_param, payout_amount);
  
  -- Mark session as completed
  UPDATE public.hot_sell_sessions
  SET status = 'completed',
      winner_id = winner_id_param,
      completed_at = NOW()
  WHERE id = session_id_param;
  
  -- Update participant with win
  UPDATE public.hot_sell_participants
  SET prize_won = payout_amount,
      updated_at = NOW()
  WHERE session_id = session_id_param AND user_id = winner_id_param;
  
  RETURN TRUE;
END;
$$;

-- Winner Takes All payout
CREATE OR REPLACE FUNCTION process_winner_takes_all_payout(
  session_id_param TEXT,
  winner_id_param UUID,
  payout_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add to won_tokens (cashable)
  PERFORM add_won_tokens(winner_id_param, payout_amount);
  
  -- Mark session as completed
  UPDATE public.winner_takes_all_sessions
  SET status = 'completed',
      winner_id = winner_id_param,
      completed_at = NOW()
  WHERE id = session_id_param;
  
  -- Update participant with win
  UPDATE public.winner_takes_all_participants
  SET prize_won = payout_amount,
      updated_at = NOW()
  WHERE session_id = session_id_param AND user_id = winner_id_param;
  
  RETURN TRUE;
END;
$$;

-- 1v1 payout
CREATE OR REPLACE FUNCTION process_1v1_payout(
  match_id_param TEXT,
  winner_id_param UUID,
  payout_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add to won_tokens (cashable)
  PERFORM add_won_tokens(winner_id_param, payout_amount);
  
  -- Mark match as completed
  UPDATE public.one_v_one_matches
  SET winner_id = winner_id_param,
      status = 'completed',
      completed_at = NOW()
  WHERE id = match_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 5. Update token purchase function to add to PURCHASED tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION process_token_purchase(
  user_id_param UUID,
  tokens_amount DECIMAL(10,2),
  payment_intent_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  new_purchased_balance DECIMAL(10,2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance DECIMAL(10,2);
BEGIN
  -- Add to purchased_tokens (non-cashable)
  PERFORM add_purchased_tokens(user_id_param, tokens_amount);
  
  -- Get new balance
  SELECT COALESCE(purchased_tokens, 0) INTO v_new_balance
  FROM public.users
  WHERE id = user_id_param;
  
  -- Log transaction
  INSERT INTO public.token_transactions (
    user_id, type, amount, purchased_amount, purchased_balance_after,
    reference_id, description
  ) VALUES (
    user_id_param, 'purchase', tokens_amount, tokens_amount, v_new_balance,
    payment_intent_id, 'Token purchase via Stripe'
  );
  
  RETURN QUERY SELECT TRUE, v_new_balance, 'Tokens added successfully'::TEXT;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ All entry and payout functions updated for dual wallet system!';
  RAISE NOTICE 'ℹ️  Entry fees now spend purchased tokens first, then won tokens';
  RAISE NOTICE 'ℹ️  Winnings are added to won_tokens (cashable)';
  RAISE NOTICE 'ℹ️  Purchases are added to purchased_tokens (non-cashable)';
END $$;

