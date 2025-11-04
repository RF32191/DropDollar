-- ============================================================================
-- COMPLETE HOT SELL & WINNER TAKES ALL FIX
-- ============================================================================
-- ✅ Creates missing sessions for all configs
-- ✅ Fixes get_all functions to load banners
-- ✅ Fixes join functions with proper UUID handling
-- ✅ MAINTAINS ALL ANTI-CHEAT SECURITY
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE MISSING SESSIONS FOR ALL CONFIGS
-- ============================================================================

-- Winner Takes All Sessions
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

-- Hot Sell Sessions
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
-- PART 2: FIX GET_ALL FUNCTIONS (FOR LOADING BANNERS)
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_winner_takes_all_sessions();

CREATE OR REPLACE FUNCTION get_all_winner_takes_all_sessions()
RETURNS TABLE (
  id TEXT,
  config_id TEXT,
  current_pool DECIMAL(10,2),
  base_price DECIMAL(10,2),
  participants_count INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  timer_duration INTEGER,
  winner_user_id UUID,
  prize_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::TEXT,
    s.config_id::TEXT,
    s.current_pool,
    s.base_price,
    s.participants_count,
    s.status::TEXT,
    s.timer_started_at,
    s.timer_duration,
    s.winner_user_id,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.winner_takes_all_participants p
        WHERE p.session_id = s.id::TEXT
      ),
      '[]'::json
    ) as participants
  FROM public.winner_takes_all_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

-- ============================================================================

DROP FUNCTION IF EXISTS get_all_hot_sell_sessions();

CREATE OR REPLACE FUNCTION get_all_hot_sell_sessions()
RETURNS TABLE (
  id TEXT,
  config_id TEXT,
  current_pool DECIMAL(10,2),
  base_price DECIMAL(10,2),
  participants_count INTEGER,
  max_participants INTEGER,
  status TEXT,
  timer_started_at TIMESTAMPTZ,
  timer_duration INTEGER,
  winner_user_id UUID,
  prize_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::TEXT,
    s.config_id::TEXT,
    s.current_pool,
    s.base_price,
    s.participants_count,
    s.max_participants,
    s.status::TEXT,
    s.timer_started_at,
    s.timer_duration,
    s.winner_user_id,
    s.prize_amount,
    s.platform_fee,
    s.created_at,
    s.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'score', p.score,
            'accuracy', p.accuracy,
            'joined_at', p.joined_at,
            'completed_at', p.completed_at
          )
        )
        FROM public.hot_sell_participants p
        WHERE p.session_id = s.id::TEXT
      ),
      '[]'::json
    ) as participants
  FROM public.hot_sell_sessions s
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;

-- ============================================================================
-- PART 3: FIX JOIN FUNCTIONS (WITH ANTI-CHEAT SECURITY)
-- ============================================================================

-- Drop all duplicate versions
DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL);

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
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END;

  -- Check if session exists
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_sessions WHERE id = v_session_id
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session details
  SELECT status, COALESCE(current_pool, 0) 
  INTO v_session_status, v_current_pot
  FROM public.hot_sell_sessions 
  WHERE id = v_session_id;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined (UUID comparison)
  SELECT EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pot, ''::TEXT;
    RETURN;
  END IF;

  -- 🔒 ANTI-CHEAT: Spend tokens via dual wallet (purchased first)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Update prize pool
  v_current_pot := v_current_pot + entry_fee_param;
  
  UPDATE public.hot_sell_sessions
  SET current_pool = v_current_pot, updated_at = NOW()
  WHERE id = v_session_id;

  -- 🔒 ANTI-CHEAT: Record participant (required for score validation)
  v_new_participant_id := gen_random_uuid();
  
  INSERT INTO public.hot_sell_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, v_session_id, user_id_param, NOW()
  );

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pot, v_new_participant_id::TEXT;
END;
$$;

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
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END;

  -- Check if session exists
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_sessions WHERE id = v_session_id
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Get session details
  SELECT status, COALESCE(current_pool, 0) 
  INTO v_session_status, v_current_pool
  FROM public.winner_takes_all_sessions 
  WHERE id = v_session_id;

  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, ('Session ' || v_session_status)::TEXT, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Check if already joined (UUID comparison)
  SELECT EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_pool, ''::TEXT;
    RETURN;
  END IF;

  -- 🔒 ANTI-CHEAT: Spend tokens via dual wallet (purchased first)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);

  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT;
    RETURN;
  END IF;

  -- Update prize pool
  v_current_pool := v_current_pool + entry_fee_param;
  
  UPDATE public.winner_takes_all_sessions
  SET current_pool = v_current_pool, updated_at = NOW()
  WHERE id = v_session_id;

  -- 🔒 ANTI-CHEAT: Record participant (required for score validation)
  v_new_participant_id := gen_random_uuid();
  
  INSERT INTO public.winner_takes_all_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, v_session_id, user_id_param, NOW()
  );

  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_current_pool, v_new_participant_id::TEXT;
END;
$$;

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

SELECT '=== SESSIONS CREATED ===' as info;
SELECT 'Winner Takes All:' as type, COUNT(*) as count FROM public.winner_takes_all_sessions WHERE status = 'active';
SELECT 'Hot Sell:' as type, COUNT(*) as count FROM public.hot_sell_sessions WHERE status = 'active';

SELECT '=== GET FUNCTIONS WORK ===' as info;
SELECT 'Winner Takes All Sessions:' as type, COUNT(*) as count FROM get_all_winner_takes_all_sessions();
SELECT 'Hot Sell Sessions:' as type, COUNT(*) as count FROM get_all_hot_sell_sessions();

SELECT '=== ANTI-CHEAT SECURITY ===' as info;
SELECT 'game_sessions table:' as check, CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'game_sessions') THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
SELECT 'anti_cheat_logs table:' as check, CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'anti_cheat_logs') THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
SELECT 'spend_tokens function:' as check, CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'spend_tokens') THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
SELECT 'join functions:' as check, COUNT(*) as count FROM pg_proc WHERE proname IN ('join_hot_sell_session', 'join_winner_takes_all_session');

-- ============================================================================
-- RESULT:
-- ✅ All sessions created for configs
-- ✅ Get functions return banners
-- ✅ Join functions work with proper UUID handling
-- ✅ ALL ANTI-CHEAT SECURITY MAINTAINED
-- ============================================================================

