-- ============================================================================
-- COMPLETE DUAL WALLET SETUP FOR ALL GAMES
-- ============================================================================
-- Run this SINGLE SQL to:
-- 1. Grant 300 tokens to admin accounts
-- 2. Enable dual wallet functions
-- 3. Update all game join functions
-- 4. Verify everything works
-- ============================================================================

-- ============================================================================
-- PART 1: GRANT 300 TOKENS TO ADMIN ACCOUNTS
-- ============================================================================

-- Account 1: ryanrfermoselle@yahoo.com
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00, updated_at = NOW()
WHERE email ILIKE 'ryanrfermoselle@yahoo.com'
RETURNING email, COALESCE(purchased_tokens, 0) as purchased, COALESCE(won_tokens, 0) as won, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total;

-- Account 2: ryanfermoselle@yahoo.com
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00, updated_at = NOW()
WHERE email ILIKE 'ryanfermoselle@yahoo.com'
RETURNING email, COALESCE(purchased_tokens, 0) as purchased, COALESCE(won_tokens, 0) as won, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total;

-- Account 3: rf32191@gmail.com
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00, updated_at = NOW()
WHERE email ILIKE 'rf32191@gmail.com'
RETURNING email, COALESCE(purchased_tokens, 0) as purchased, COALESCE(won_tokens, 0) as won, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total;

-- ============================================================================
-- PART 2: CREATE DUAL WALLET FUNCTIONS
-- ============================================================================

-- Function to get total tokens (purchased + won)
CREATE OR REPLACE FUNCTION get_total_tokens(user_id_param UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)
  INTO total
  FROM public.users
  WHERE id = user_id_param;
  
  RETURN COALESCE(total, 0);
END;
$$;

-- Function to spend tokens (PURCHASED FIRST, then won)
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
  -- Get current balances
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO current_purchased, current_won
  FROM public.users
  WHERE id = user_id_param;
  
  total_available := current_purchased + current_won;
  
  -- Check if user has enough tokens
  IF total_available < amount THEN
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

-- Function to add purchased tokens
CREATE OR REPLACE FUNCTION add_purchased_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET 
    purchased_tokens = COALESCE(purchased_tokens, 0) + amount,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  RETURN TRUE;
END;
$$;

-- Function to add won tokens (from prizes)
CREATE OR REPLACE FUNCTION add_won_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET 
    won_tokens = COALESCE(won_tokens, 0) + amount,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- PART 3: UPDATE ALL GAME JOIN FUNCTIONS TO USE spend_tokens()
-- ============================================================================

-- This ensures ALL games deduct from purchased_tokens FIRST!

-- Hot Sell
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
  SELECT status, prize_pool INTO v_session_status, v_current_pot
  FROM public.hot_sell_sessions WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session is not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = session_id_param AND user_id::TEXT = user_id_param::TEXT
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- SPEND FROM PURCHASED TOKENS FIRST!
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  v_current_pot := v_current_pot + entry_fee_param;
  UPDATE public.hot_sell_sessions SET prize_pool = v_current_pot, updated_at = NOW() WHERE id = session_id_param;

  v_new_participant_id := gen_random_uuid()::TEXT;
  INSERT INTO public.hot_sell_participants (id, session_id, user_id, entry_fee, joined_at)
  VALUES (v_new_participant_id, session_id_param, user_id_param, entry_fee_param, NOW());

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pot, v_new_participant_id;
END;
$$;

-- Winner Takes All
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
  SELECT status, prize_pool INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = session_id_param AND user_id::TEXT = user_id_param::TEXT
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- SPEND FROM PURCHASED TOKENS FIRST!
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  v_current_pool := v_current_pool + entry_fee_param;
  UPDATE public.winner_takes_all_sessions SET prize_pool = v_current_pool, updated_at = NOW() WHERE id = session_id_param;

  v_new_participant_id := gen_random_uuid()::TEXT;
  INSERT INTO public.winner_takes_all_participants (id, session_id, user_id, entry_fee, joined_at)
  VALUES (v_new_participant_id, session_id_param, user_id_param, entry_fee_param, NOW());

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pool, v_new_participant_id;
END;
$$;

-- 1v1 Tournaments
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
  SELECT status, participants_count 
  INTO v_session_status, v_participant_count
  FROM public.one_v_one_sessions WHERE id = session_id_param;

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

  -- SPEND FROM PURCHASED TOKENS FIRST!
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, NULL::UUID;
    RETURN;
  END IF;

  v_new_participant_id := gen_random_uuid();
  INSERT INTO public.one_v_one_participants (id, session_id, user_id, joined_at)
  VALUES (v_new_participant_id, session_id_param, user_id_param, NOW());

  UPDATE public.one_v_one_sessions
  SET participants_count = participants_count + 1, current_pool = current_pool + entry_fee_param, updated_at = NOW()
  WHERE id = session_id_param;

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_new_participant_id;
END;
$$;

-- ============================================================================
-- PART 4: VERIFY EVERYTHING WORKS
-- ============================================================================

-- Check your token balances
SELECT 
  email,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  get_total_tokens(id) as total_available
FROM public.users
WHERE email ILIKE '%fermoselle%' OR email ILIKE '%rf32191%'
ORDER BY email;

-- ============================================================================
-- COMPLETE! ALL DONE IN ONE SQL
-- ============================================================================
-- ✅ Granted 300 tokens to admin accounts
-- ✅ Created dual wallet functions (get_total_tokens, spend_tokens, etc.)
-- ✅ Updated Hot Sell to spend purchased tokens FIRST
-- ✅ Updated Winner Takes All to spend purchased tokens FIRST
-- ✅ Updated 1v1 to spend purchased tokens FIRST
-- ✅ Verified balances
-- 
-- 🎮 GAMES NOW WORK WITH DUAL WALLET:
-- - Entry fees deduct from purchased_tokens FIRST
-- - Then from won_tokens if purchased runs out
-- - Prize winnings go to won_tokens (cashable)
-- ============================================================================

