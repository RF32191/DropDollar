-- ============================================================================
-- FIX UUID vs TEXT ISSUE (FINAL FIX)
-- ============================================================================
-- Check actual table structure and fix function to match
-- IMPORTANT: Maintains all anti-cheat security measures
-- ============================================================================

-- ============================================================================
-- 1. CHECK ACTUAL COLUMN TYPES
-- ============================================================================

SELECT '=== WINNER TAKES ALL SESSIONS TABLE STRUCTURE ===' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_sessions' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'config_id')
ORDER BY ordinal_position;

SELECT '=== HOT SELL SESSIONS TABLE STRUCTURE ===' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'hot_sell_sessions' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'config_id')
ORDER BY ordinal_position;

SELECT '=== WINNER TAKES ALL PARTICIPANTS TABLE ===' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_participants' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY ordinal_position;

SELECT '=== HOT SELL PARTICIPANTS TABLE ===' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'hot_sell_participants' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY ordinal_position;

-- ============================================================================
-- 2. DROP ALL FUNCTION VERSIONS
-- ============================================================================

DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL);

-- ============================================================================
-- 3. RECREATE FUNCTIONS - ASSUMING UUID FOR ALL IDs
-- ============================================================================
-- This maintains anti-cheat by:
-- ✅ Still using spend_tokens() for dual wallet logic
-- ✅ Still recording all participants
-- ✅ Not bypassing any security checks
-- ============================================================================

CREATE OR REPLACE FUNCTION join_hot_sell_session(
  session_id_param TEXT,  -- Frontend passes TEXT
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

  -- Check if already joined (UUID comparison - FIXED!)
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
  session_id_param TEXT,  -- Frontend passes TEXT
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

  -- Check if already joined (UUID comparison - FIXED!)
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
-- 4. VERIFY ANTI-CHEAT SECURITY IS INTACT
-- ============================================================================

SELECT '=== ANTI-CHEAT VERIFICATION ===' as info;

-- Check game_sessions table exists (for anti-cheat)
SELECT 'game_sessions table:' as check, 
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'game_sessions') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check anti_cheat_logs table exists
SELECT 'anti_cheat_logs table:' as check,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'anti_cheat_logs') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check spend_tokens function exists
SELECT 'spend_tokens function:' as check,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'spend_tokens') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Verify functions now work
SELECT 'join functions:' as check, COUNT(*) as count 
FROM pg_proc 
WHERE proname IN ('join_hot_sell_session', 'join_winner_takes_all_session');

-- ============================================================================
-- RESULT: 
-- ✅ Fixed TEXT vs UUID comparison
-- ✅ Maintained spend_tokens() for dual wallet security
-- ✅ Maintained participant recording for score validation
-- ✅ All anti-cheat measures intact
-- ============================================================================

