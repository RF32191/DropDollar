-- ============================================================================
-- FIX "SESSION NOT FOUND" ERRORS
-- ============================================================================
-- Fixes type casting issues in join functions
-- ============================================================================

-- ============================================================================
-- 1. FIX WINNER TAKES ALL - Session Lookup
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
  -- DEBUG: Check if session exists at all
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_sessions WHERE id = session_id_param
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found (ID: ' || session_id_param || ')'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session details
  SELECT status, prize_pool INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions 
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found - status null'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session status: ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined (with proper type casting)
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = session_id_param 
    AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- SPEND FROM PURCHASED TOKENS FIRST!
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
-- 2. FIX HOT SELL - Session Lookup
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
  -- DEBUG: Check if session exists at all
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_sessions WHERE id = session_id_param
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found (ID: ' || session_id_param || ')'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session details
  SELECT status, prize_pool INTO v_session_status, v_current_pot
  FROM public.hot_sell_sessions 
  WHERE id = session_id_param;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found - status null'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session status: ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined (with proper type casting)
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = session_id_param 
    AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- SPEND FROM PURCHASED TOKENS FIRST!
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
-- 3. CHECK ACTIVE SESSIONS
-- ============================================================================

-- List all Winner Takes All sessions
SELECT 
  id,
  config_id,
  status,
  prize_pool,
  participants_count,
  max_participants,
  created_at
FROM public.winner_takes_all_sessions
ORDER BY created_at DESC
LIMIT 10;

-- List all Hot Sell sessions
SELECT 
  id,
  config_id,
  status,
  prize_pool,
  participants_count,
  max_participants,
  created_at
FROM public.hot_sell_sessions
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. CREATE MISSING SESSIONS IF NEEDED
-- ============================================================================

-- Check if we have any active sessions
DO $$
DECLARE
  v_wta_active_count INTEGER;
  v_hs_active_count INTEGER;
BEGIN
  -- Count active Winner Takes All sessions
  SELECT COUNT(*) INTO v_wta_active_count
  FROM public.winner_takes_all_sessions
  WHERE status = 'active';
  
  RAISE NOTICE 'Active Winner Takes All sessions: %', v_wta_active_count;
  
  -- Count active Hot Sell sessions
  SELECT COUNT(*) INTO v_hs_active_count
  FROM public.hot_sell_sessions
  WHERE status = 'active';
  
  RAISE NOTICE 'Active Hot Sell sessions: %', v_hs_active_count;
  
  IF v_wta_active_count = 0 THEN
    RAISE NOTICE '⚠️ WARNING: No active Winner Takes All sessions found!';
  END IF;
  
  IF v_hs_active_count = 0 THEN
    RAISE NOTICE '⚠️ WARNING: No active Hot Sell sessions found!';
  END IF;
END $$;

-- ============================================================================
-- RESULT:
-- ✅ Fixed type casting in session lookups
-- ✅ Added better error messages
-- ✅ Removed unnecessary ::TEXT casts on user_id comparisons
-- ✅ Shows active sessions for debugging
-- 
-- If you see "No active sessions" warnings, sessions need to be created
-- ============================================================================

