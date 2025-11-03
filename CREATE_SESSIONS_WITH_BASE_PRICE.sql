-- ============================================================================
-- CREATE MISSING SESSIONS (with base_price from config)
-- ============================================================================
-- Includes base_price column which is required (NOT NULL)
-- ============================================================================

-- ============================================================================
-- 1. CREATE MISSING WINNER TAKES ALL SESSIONS
-- ============================================================================

INSERT INTO public.winner_takes_all_sessions (
  id,
  config_id,
  current_pool,
  base_price,
  participants_count,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  0,
  COALESCE(c.base_price, c.entry_fee, 1.00), -- Use base_price or entry_fee from config
  0,
  'active',
  NOW(),
  NOW()
FROM public.winner_takes_all_configs c
LEFT JOIN public.winner_takes_all_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL;

-- ============================================================================
-- 2. CREATE MISSING HOT SELL SESSIONS
-- ============================================================================

INSERT INTO public.hot_sell_sessions (
  id,
  config_id,
  current_pool,
  base_price,
  participants_count,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  0,
  COALESCE(c.base_price, c.entry_fee, 1.00), -- Use base_price or entry_fee from config
  0,
  'active',
  NOW(),
  NOW()
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL;

-- ============================================================================
-- 3. FIX JOIN FUNCTIONS (using current_pool)
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
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_sessions WHERE id = session_id_param
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

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

  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  v_current_pool := v_current_pool + entry_fee_param;
  
  UPDATE public.winner_takes_all_sessions
  SET current_pool = v_current_pool, updated_at = NOW()
  WHERE id = session_id_param;

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
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_sessions WHERE id = session_id_param
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

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

  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  v_current_pot := v_current_pot + entry_fee_param;
  
  UPDATE public.hot_sell_sessions
  SET current_pool = v_current_pot, updated_at = NOW()
  WHERE id = session_id_param;

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
-- 4. VERIFY RESULTS
-- ============================================================================

SELECT 'Winner Takes All Sessions:' as info, COUNT(*) as total FROM public.winner_takes_all_sessions WHERE status = 'active';
SELECT 'Hot Sell Sessions:' as info, COUNT(*) as total FROM public.hot_sell_sessions WHERE status = 'active';

-- Show samples with base_price
SELECT id, config_id, status, current_pool, base_price, participants_count 
FROM public.winner_takes_all_sessions 
WHERE status = 'active'
ORDER BY created_at DESC 
LIMIT 5;

SELECT id, config_id, status, current_pool, base_price, participants_count 
FROM public.hot_sell_sessions 
WHERE status = 'active'
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- RESULT: Creates sessions with base_price from config + fixes join functions
-- ============================================================================

