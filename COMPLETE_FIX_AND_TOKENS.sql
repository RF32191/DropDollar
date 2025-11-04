-- ============================================================================
-- COMPLETE FIX: SESSIONS + TOKEN GRANT
-- ============================================================================
-- Part 1: Create missing sessions (maintains anti-cheat)
-- Part 2: Fix join functions (UUID handling + anti-cheat)
-- Part 3: Grant 300 tokens to admin accounts
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE MISSING SESSIONS
-- ============================================================================

-- Winner Takes All Sessions (NO max_participants column)
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
  COALESCE(c.base_price, c.entry_fee, 1.00),
  0,
  'active',
  NOW(),
  NOW()
FROM public.winner_takes_all_configs c
LEFT JOIN public.winner_takes_all_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL;

-- Hot Sell Sessions (HAS max_participants column)
INSERT INTO public.hot_sell_sessions (
  id,
  config_id,
  current_pool,
  base_price,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  0,
  COALESCE(c.base_price, c.entry_fee, 3.00),
  0,
  COALESCE(c.max_participants, 100),
  'active',
  NOW(),
  NOW()
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL;

-- ============================================================================
-- PART 2: FIX JOIN FUNCTIONS (WITH UUID HANDLING + ANTI-CHEAT)
-- ============================================================================

-- Drop all duplicate versions
DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL);

-- ============================================================================
-- HOT SELL JOIN FUNCTION
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
  v_session_id UUID;
  v_session_status TEXT;
  v_current_pot DECIMAL(10,2);
  v_participant_exists BOOLEAN;
  v_new_participant_id UUID;
  v_spend_result RECORD;
  v_session_exists BOOLEAN;
BEGIN
  -- Convert TEXT to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END;

  -- Check session exists
  SELECT EXISTS (SELECT 1 FROM public.hot_sell_sessions WHERE id = v_session_id) INTO v_session_exists;
  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session status and pool
  SELECT status, COALESCE(current_pool, 0) INTO v_session_status, v_current_pot
  FROM public.hot_sell_sessions WHERE id = v_session_id;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check already joined (UUID comparison - FIXED!)
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- 🔒 ANTI-CHEAT: Dual wallet spending (purchased tokens first)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Update pool
  v_current_pot := v_current_pot + entry_fee_param;
  UPDATE public.hot_sell_sessions SET current_pool = v_current_pot, updated_at = NOW() WHERE id = v_session_id;

  -- 🔒 ANTI-CHEAT: Record participant (required for validation)
  v_new_participant_id := gen_random_uuid();
  INSERT INTO public.hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (v_new_participant_id, v_session_id, user_id_param, NOW());

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pot, v_new_participant_id::TEXT;
END;
$$;

-- ============================================================================
-- WINNER TAKES ALL JOIN FUNCTION
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
  v_session_id UUID;
  v_session_status TEXT;
  v_current_pool DECIMAL(10,2);
  v_participant_exists BOOLEAN;
  v_new_participant_id UUID;
  v_spend_result RECORD;
  v_session_exists BOOLEAN;
BEGIN
  -- Convert TEXT to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END;

  -- Check session exists
  SELECT EXISTS (SELECT 1 FROM public.winner_takes_all_sessions WHERE id = v_session_id) INTO v_session_exists;
  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session status and pool
  SELECT status, COALESCE(current_pool, 0) INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions WHERE id = v_session_id;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check already joined (UUID comparison - FIXED!)
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- 🔒 ANTI-CHEAT: Dual wallet spending (purchased tokens first)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Update pool
  v_current_pool := v_current_pool + entry_fee_param;
  UPDATE public.winner_takes_all_sessions SET current_pool = v_current_pool, updated_at = NOW() WHERE id = v_session_id;

  -- 🔒 ANTI-CHEAT: Record participant (required for validation)
  v_new_participant_id := gen_random_uuid();
  INSERT INTO public.winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (v_new_participant_id, v_session_id, user_id_param, NOW());

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pool, v_new_participant_id::TEXT;
END;
$$;

-- ============================================================================
-- PART 3: GRANT 300 TOKENS TO ADMIN ACCOUNTS
-- ============================================================================

UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300,
  updated_at = NOW()
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
)
RETURNING 
  email,
  purchased_tokens,
  won_tokens,
  (purchased_tokens + won_tokens) as total_tokens;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '╔════════════════════════════════════════════════════════════════╗' as divider;
SELECT '║                    SESSIONS CREATED                            ║' as header;
SELECT '╚════════════════════════════════════════════════════════════════╝' as divider;

SELECT 'Winner Takes All:' as game, COUNT(*) as active_sessions 
FROM public.winner_takes_all_sessions WHERE status = 'active';

SELECT 'Hot Sell:' as game, COUNT(*) as active_sessions 
FROM public.hot_sell_sessions WHERE status = 'active';

SELECT '╔════════════════════════════════════════════════════════════════╗' as divider;
SELECT '║                    ADMIN TOKEN BALANCES                        ║' as header;
SELECT '╚════════════════════════════════════════════════════════════════╝' as divider;

SELECT 
  email,
  purchased_tokens as purchased,
  won_tokens as won,
  (purchased_tokens + won_tokens) as total
FROM public.users
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
)
ORDER BY email;

SELECT '╔════════════════════════════════════════════════════════════════╗' as divider;
SELECT '║                    ANTI-CHEAT SECURITY                         ║' as header;
SELECT '╚════════════════════════════════════════════════════════════════╝' as divider;

SELECT 'spend_tokens function:' as component, 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'spend_tokens') 
  THEN '✅ ACTIVE' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'game_sessions table:', 
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'game_sessions') 
  THEN '✅ ACTIVE' ELSE '❌ MISSING' END
UNION ALL
SELECT 'anti_cheat_logs table:', 
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'anti_cheat_logs') 
  THEN '✅ ACTIVE' ELSE '❌ MISSING' END
UNION ALL
SELECT 'join functions:', 
  (SELECT COUNT(*)::TEXT FROM pg_proc WHERE proname IN ('join_hot_sell_session', 'join_winner_takes_all_session')) || ' functions';

-- ============================================================================
-- ✅ COMPLETE: Sessions fixed, tokens granted, security maintained!
-- ============================================================================

