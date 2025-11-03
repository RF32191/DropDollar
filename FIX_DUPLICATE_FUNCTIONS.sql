-- ============================================================================
-- FIX DUPLICATE JOIN FUNCTIONS (drop all versions and recreate)
-- ============================================================================
-- There are multiple versions of these functions with different signatures
-- We need to drop ALL versions and recreate with TEXT session_id
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL VERSIONS OF JOIN FUNCTIONS
-- ============================================================================

-- Drop all join_hot_sell_session versions
DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_hot_sell_session(session_id_param TEXT, user_id_param UUID, entry_fee_param DECIMAL);
DROP FUNCTION IF EXISTS join_hot_sell_session(session_id_param UUID, user_id_param UUID, entry_fee_param DECIMAL);

-- Drop all join_winner_takes_all_session versions
DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(session_id_param TEXT, user_id_param UUID, entry_fee_param DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(session_id_param UUID, user_id_param UUID, entry_fee_param DECIMAL);

-- ============================================================================
-- 2. RECREATE JOIN_HOT_SELL_SESSION (TEXT session_id)
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
  v_session_exists BOOLEAN;
BEGIN
  -- Check if session exists
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_sessions WHERE id = session_id_param
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session details
  SELECT status, COALESCE(current_pool, 0) 
  INTO v_session_status, v_current_pot
  FROM public.hot_sell_sessions 
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- Spend tokens (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Add to prize pool
  v_current_pot := v_current_pot + entry_fee_param;
  
  UPDATE public.hot_sell_sessions
  SET current_pool = v_current_pot, updated_at = NOW()
  WHERE id = session_id_param;

  -- Add participant
  v_new_participant_id := gen_random_uuid()::TEXT;
  
  INSERT INTO public.hot_sell_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, session_id_param, user_id_param, NOW()
  );

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pot, v_new_participant_id;
END;
$$;

-- ============================================================================
-- 3. RECREATE JOIN_WINNER_TAKES_ALL_SESSION (TEXT session_id)
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
  v_session_exists BOOLEAN;
BEGIN
  -- Check if session exists
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_sessions WHERE id = session_id_param
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session details
  SELECT status, COALESCE(current_pool, 0) 
  INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions 
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- Spend tokens (purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Add to prize pool
  v_current_pool := v_current_pool + entry_fee_param;
  
  UPDATE public.winner_takes_all_sessions
  SET current_pool = v_current_pool, updated_at = NOW()
  WHERE id = session_id_param;

  -- Add participant
  v_new_participant_id := gen_random_uuid()::TEXT;
  
  INSERT INTO public.winner_takes_all_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, session_id_param, user_id_param, NOW()
  );

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pool, v_new_participant_id;
END;
$$;

-- ============================================================================
-- 4. VERIFY FUNCTIONS EXIST (should show exactly 1 of each)
-- ============================================================================

SELECT 
  'join_hot_sell_session functions:' as info,
  COUNT(*) as count
FROM pg_proc 
WHERE proname = 'join_hot_sell_session';

SELECT 
  'join_winner_takes_all_session functions:' as info,
  COUNT(*) as count
FROM pg_proc 
WHERE proname = 'join_winner_takes_all_session';

-- Show function signatures
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('join_hot_sell_session', 'join_winner_takes_all_session');

-- ============================================================================
-- RESULT: Only ONE version of each function with TEXT session_id
-- ============================================================================

