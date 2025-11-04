-- ============================================================================
-- ALTERNATIVE UUID FIX - EXPLICIT CASTING EVERYWHERE
-- ============================================================================
-- This approach explicitly casts ALL IDs to ensure type compatibility
-- ============================================================================

-- ============================================================================
-- STEP 1: Check actual column types in your database
-- ============================================================================

SELECT 'hot_sell_sessions.config_id type:' as info;
SELECT data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'hot_sell_sessions' AND column_name = 'config_id';

SELECT 'hot_sell_configs.id type:' as info;
SELECT data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'hot_sell_configs' AND column_name = 'id';

-- ============================================================================
-- STEP 2: Drop all existing functions
-- ============================================================================

DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL) CASCADE;

-- ============================================================================
-- STEP 3: Create join_hot_sell_session with ALL EXPLICIT CASTS
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
  participant_id TEXT,
  rng_seed INTEGER
)
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  v_session_id UUID;
  v_config_id_text TEXT;
  v_rate_check JSON;
  v_spend_result RECORD;
  v_rng_seed INTEGER := 0;
  v_pot DECIMAL(10,2) := 0;
  v_session_status TEXT;
BEGIN
  RAISE NOTICE '🔥 [Hot Sell Join] Session: %, User: %', session_id_param, user_id_param;
  
  -- Check rate limits
  SELECT * INTO v_rate_check FROM check_rate_limit(user_id_param);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN 
    RETURN QUERY SELECT FALSE, v_rate_check->>'reason', 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END IF;
  
  -- Convert session_id to UUID
  BEGIN 
    v_session_id := session_id_param::UUID; 
  EXCEPTION WHEN OTHERS THEN 
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END;
  
  -- Get session info and convert config_id to TEXT
  SELECT 
    s.config_id::TEXT,  -- Cast to TEXT explicitly
    COALESCE(s.current_pool, 0),
    s.status
  INTO v_config_id_text, v_pot, v_session_status
  FROM public.hot_sell_sessions s 
  WHERE s.id = v_session_id;
  
  IF v_config_id_text IS NULL THEN 
    RAISE NOTICE '❌ Session not found';
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END IF;
  
  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER;
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Session found, config_id (TEXT): %', v_config_id_text;
  
  -- Get RNG seed using TEXT comparison
  BEGIN
    SELECT COALESCE(c.rng_seed, 0)
    INTO v_rng_seed
    FROM public.hot_sell_configs c
    WHERE c.id::TEXT = v_config_id_text;  -- Compare TEXT to TEXT
    
    IF v_rng_seed IS NULL OR v_rng_seed = 0 THEN
      v_rng_seed := 12345;  -- Default RNG seed
      RAISE NOTICE '⚠️  Using default RNG seed';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_rng_seed := 12345;
    RAISE NOTICE '⚠️  Error getting RNG seed, using default: %', SQLERRM;
  END;
  
  RAISE NOTICE '✅ RNG seed: %', v_rng_seed;
  
  -- Check if already joined
  IF EXISTS (
    SELECT 1 
    FROM public.hot_sell_participants 
    WHERE session_id = v_session_id
      AND user_id = user_id_param
  ) THEN
    RAISE NOTICE '❌ Already joined';
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_pot, ''::TEXT, v_rng_seed; 
    RETURN;
  END IF;
  
  -- Spend tokens
  RAISE NOTICE '💰 Spending tokens: %', entry_fee_param;
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN 
    RAISE NOTICE '❌ Token spend failed: %', v_spend_result.message;
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END IF;
  
  -- Update pot
  v_pot := v_pot + entry_fee_param;
  UPDATE public.hot_sell_sessions 
  SET current_pool = v_pot, updated_at = NOW() 
  WHERE id = v_session_id;
  
  -- Add participant
  INSERT INTO public.hot_sell_participants (id, session_id, user_id, joined_at) 
  VALUES (gen_random_uuid(), v_session_id, user_id_param, NOW());
  
  -- Update rate limits
  PERFORM update_rate_limits(user_id_param);
  
  RAISE NOTICE '✅ SUCCESS! Pot: %, RNG: %', v_pot, v_rng_seed;
  
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_pot, gen_random_uuid()::TEXT, v_rng_seed;
END;
$$;

GRANT EXECUTE ON FUNCTION join_hot_sell_session(TEXT, UUID, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- STEP 4: Create join_winner_takes_all_session with ALL EXPLICIT CASTS
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
  participant_id TEXT,
  rng_seed INTEGER
)
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  v_session_id UUID;
  v_config_id_text TEXT;
  v_rate_check JSON;
  v_spend_result RECORD;
  v_rng_seed INTEGER := 0;
  v_pool DECIMAL(10,2) := 0;
  v_session_status TEXT;
BEGIN
  RAISE NOTICE '🏆 [Winner Takes All Join] Session: %, User: %', session_id_param, user_id_param;
  
  -- Check rate limits
  SELECT * INTO v_rate_check FROM check_rate_limit(user_id_param);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN 
    RETURN QUERY SELECT FALSE, v_rate_check->>'reason', 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END IF;
  
  -- Convert session_id to UUID
  BEGIN 
    v_session_id := session_id_param::UUID; 
  EXCEPTION WHEN OTHERS THEN 
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END;
  
  -- Get session info and convert config_id to TEXT
  SELECT 
    s.config_id::TEXT,  -- Cast to TEXT explicitly
    COALESCE(s.current_pool, 0),
    s.status
  INTO v_config_id_text, v_pool, v_session_status
  FROM public.winner_takes_all_sessions s 
  WHERE s.id = v_session_id;
  
  IF v_config_id_text IS NULL THEN 
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END IF;
  
  IF v_session_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'Session not active'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER;
    RETURN;
  END IF;
  
  -- Get RNG seed using TEXT comparison
  BEGIN
    SELECT COALESCE(c.rng_seed, 0)
    INTO v_rng_seed
    FROM public.winner_takes_all_configs c
    WHERE c.id::TEXT = v_config_id_text;  -- Compare TEXT to TEXT
    
    IF v_rng_seed IS NULL OR v_rng_seed = 0 THEN
      v_rng_seed := 12345;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_rng_seed := 12345;
  END;
  
  -- Check if already joined
  IF EXISTS (
    SELECT 1 
    FROM public.winner_takes_all_participants 
    WHERE session_id = v_session_id
      AND user_id = user_id_param
  ) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_pool, ''::TEXT, v_rng_seed; 
    RETURN;
  END IF;
  
  -- Spend tokens
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN 
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; 
    RETURN; 
  END IF;
  
  -- Update pool
  v_pool := v_pool + entry_fee_param;
  UPDATE public.winner_takes_all_sessions 
  SET current_pool = v_pool, updated_at = NOW() 
  WHERE id = v_session_id;
  
  -- Add participant
  INSERT INTO public.winner_takes_all_participants (id, session_id, user_id, joined_at) 
  VALUES (gen_random_uuid(), v_session_id, user_id_param, NOW());
  
  -- Update rate limits
  PERFORM update_rate_limits(user_id_param);
  
  RAISE NOTICE '✅ SUCCESS! Pool: %, RNG: %', v_pool, v_rng_seed;
  
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_pool, gen_random_uuid()::TEXT, v_rng_seed;
END;
$$;

GRANT EXECUTE ON FUNCTION join_winner_takes_all_session(TEXT, UUID, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Functions created:' as status;
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname LIKE '%hot_sell%' OR proname LIKE '%winner_takes_all%'
ORDER BY proname;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ All comparisons use TEXT::TEXT or UUID::UUID
-- ✅ Explicit casting everywhere
-- ✅ Error handling for config lookup
-- ✅ Default RNG seed fallback
-- ✅ Detailed logging
-- ============================================================================

SELECT '✅ Alternative UUID fix applied! Try joining now!' as status;

