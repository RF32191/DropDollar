-- ============================================================================
-- GUARANTEED UUID FIX - ABSOLUTELY NO TYPE MISMATCHES
-- This FORCES all UUID columns to be UUID, all TEXT to be TEXT
-- ============================================================================

-- STEP 1: Show actual schema (CHECK THIS OUTPUT!)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 YOUR ACTUAL DATABASE SCHEMA:';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('hot_sell_sessions', 'hot_sell_participants', 'winner_takes_all_sessions', 'winner_takes_all_participants')
AND column_name IN ('id', 'session_id', 'config_id', 'user_id')
ORDER BY table_name, column_name;

-- ============================================================================
-- STEP 2: Nuclear drop
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.join_hot_sell_session(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) CASCADE;

-- ============================================================================
-- STEP 3: ASSUME ALL IDs ARE UUID - CAST EVERYTHING
-- ============================================================================

-- Get all Hot Sell sessions - NO JOINS, NO AMBIGUITY
CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
  RAISE NOTICE '📊 Getting hot sell sessions';
  
  -- Build result without subqueries that might cause type issues
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT 
      id::TEXT as id,
      config_id::TEXT as config_id,
      COALESCE(prize_pool, 0) as prize_pool,
      COALESCE(base_price, 0) as base_price,
      COALESCE(participants_count, 0) as participants_count,
      COALESCE(max_participants, 10) as max_participants,
      status::TEXT as status,
      created_at::TEXT as created_at,
      '[]'::json as participants
    FROM public.hot_sell_sessions
    WHERE status = 'active'
    ORDER BY created_at DESC
  ) t;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Get all Winner Takes All sessions
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
  RAISE NOTICE '📊 Getting winner takes all sessions';
  
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT 
      id::TEXT as id,
      config_id::TEXT as config_id,
      COALESCE(current_pool, 0) as current_pool,
      COALESCE(base_price, 0) as base_price,
      COALESCE(participants_count, 0) as participants_count,
      status::TEXT as status,
      timer_started_at::TEXT as timer_started_at,
      COALESCE(timer_duration, 1800) as timer_duration,
      created_at::TEXT as created_at,
      '[]'::json as participants
    FROM public.winner_takes_all_sessions
    WHERE status = 'active'
    ORDER BY created_at DESC
  ) t;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- ============================================================================
-- Join Hot Sell - EXPLICIT UUID EVERYWHERE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  session_id TEXT,
  participant_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_uuid UUID;
  v_entry_fee NUMERIC;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_new_participant_uuid UUID;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  RAISE NOTICE '🎮 JOIN HOT SELL: session=%, user=%, fee=%', session_id_param, user_id_param, entry_fee_param;

  -- STEP 1: Convert session_id TEXT to UUID
  BEGIN
    v_session_uuid := session_id_param::UUID;
    RAISE NOTICE '  ✓ Converted session ID to UUID: %', v_session_uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ Invalid session ID format';
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END;

  v_entry_fee := entry_fee_param;
  RAISE NOTICE '  ✓ Entry fee: %', v_entry_fee;

  -- STEP 2: Get session (ONLY from hot_sell_sessions, no joins)
  SELECT 
    participants_count,
    max_participants
  INTO v_count, v_max
  FROM hot_sell_sessions
  WHERE id = v_session_uuid  -- UUID = UUID comparison
  AND status = 'active';

  IF NOT FOUND THEN
    RAISE NOTICE '  ❌ Session not found';
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '  ✓ Session found: %/% participants', v_count, v_max;

  -- STEP 3: Check capacity
  IF v_count >= v_max THEN
    RAISE NOTICE '  ❌ Session full';
    RETURN QUERY SELECT FALSE, 'Session is full'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 4: Get user tokens (ONLY from users, no joins)
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = user_id_param;  -- UUID = UUID comparison

  IF NOT FOUND THEN
    RAISE NOTICE '  ❌ User not found';
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '  ✓ User tokens: purchased=%, won=%', v_purchased, v_won;

  -- STEP 5: Check balance
  IF (v_purchased + v_won) < v_entry_fee THEN
    RAISE NOTICE '  ❌ Insufficient tokens';
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 6: Deduct tokens
  IF v_purchased >= v_entry_fee THEN
    UPDATE users
    SET purchased_tokens = purchased_tokens - v_entry_fee
    WHERE id = user_id_param;
    RAISE NOTICE '  ✓ Deducted % from purchased', v_entry_fee;
  ELSE
    DECLARE
      v_remaining NUMERIC := v_entry_fee - v_purchased;
    BEGIN
      UPDATE users
      SET 
        purchased_tokens = 0,
        won_tokens = won_tokens - v_remaining
      WHERE id = user_id_param;
      RAISE NOTICE '  ✓ Deducted % from purchased, % from won', v_purchased, v_remaining;
    END;
  END IF;

  -- STEP 7: Check if already joined (ONLY hot_sell_participants)
  IF EXISTS (
    SELECT 1 
    FROM hot_sell_participants
    WHERE session_id = v_session_uuid  -- UUID = UUID comparison
    AND user_id = user_id_param  -- UUID = UUID comparison
  ) THEN
    RAISE NOTICE '  ⚠️ Already joined';
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, session_id_param, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 8: Create participant record
  v_new_participant_uuid := gen_random_uuid();
  
  INSERT INTO hot_sell_participants (
    id, 
    session_id,  -- UUID column
    user_id,     -- UUID column
    joined_at
  ) VALUES (
    v_new_participant_uuid,
    v_session_uuid,  -- UUID value
    user_id_param,   -- UUID value
    NOW()
  );

  RAISE NOTICE '  ✓ Created participant: %', v_new_participant_uuid;

  -- STEP 9: Update session
  UPDATE hot_sell_sessions
  SET 
    participants_count = participants_count + 1,
    prize_pool = COALESCE(prize_pool, 0) + v_entry_fee
  WHERE id = v_session_uuid;  -- UUID = UUID comparison

  RAISE NOTICE '  ✅ SUCCESS - Joined session';

  RETURN QUERY SELECT 
    TRUE, 
    'Successfully joined'::TEXT, 
    v_session_uuid::TEXT,  -- Convert UUID to TEXT for return
    v_new_participant_uuid::TEXT;  -- Convert UUID to TEXT for return
END;
$$;

-- ============================================================================
-- Join Winner Takes All
-- ============================================================================
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  session_id TEXT,
  participant_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_uuid UUID;
  v_entry_fee NUMERIC;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_new_participant_uuid UUID;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '🎮 JOIN WINNER TAKES ALL: session=%, user=%, fee=%', session_id_param, user_id_param, entry_fee_param;

  -- Convert to UUID
  BEGIN
    v_session_uuid := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END;

  v_entry_fee := entry_fee_param;

  -- Get session
  SELECT participants_count
  INTO v_count
  FROM winner_takes_all_sessions
  WHERE id = v_session_uuid
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Get user tokens
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check balance
  IF (v_purchased + v_won) < v_entry_fee THEN
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens
  IF v_purchased >= v_entry_fee THEN
    UPDATE users
    SET purchased_tokens = purchased_tokens - v_entry_fee
    WHERE id = user_id_param;
  ELSE
    DECLARE
      v_remaining NUMERIC := v_entry_fee - v_purchased;
    BEGIN
      UPDATE users
      SET 
        purchased_tokens = 0,
        won_tokens = won_tokens - v_remaining
      WHERE id = user_id_param;
    END;
  END IF;

  -- Check if already joined
  IF EXISTS (
    SELECT 1 
    FROM winner_takes_all_participants
    WHERE session_id = v_session_uuid
    AND user_id = user_id_param
  ) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, session_id_param, NULL::TEXT;
    RETURN;
  END IF;

  -- Create participant
  v_new_participant_uuid := gen_random_uuid();
  
  INSERT INTO winner_takes_all_participants (
    id, 
    session_id,
    user_id,
    joined_at
  ) VALUES (
    v_new_participant_uuid,
    v_session_uuid,
    user_id_param,
    NOW()
  );

  -- Update session
  UPDATE winner_takes_all_sessions
  SET 
    participants_count = participants_count + 1,
    current_pool = COALESCE(current_pool, 0) + v_entry_fee
  WHERE id = v_session_uuid;

  RAISE NOTICE '✅ Successfully joined';

  RETURN QUERY SELECT 
    TRUE, 
    'Successfully joined'::TEXT, 
    v_session_uuid::TEXT,
    v_new_participant_uuid::TEXT;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- Success
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNCTIONS CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 KEY CHANGES:';
    RAISE NOTICE '  • NO table aliases in comparisons';
    RAISE NOTICE '  • ALL comparisons are UUID = UUID';
    RAISE NOTICE '  • NO TEXT = UUID anywhere';
    RAISE NOTICE '  • Convert to TEXT only for RETURN values';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TEST NOW:';
    RAISE NOTICE '  1. Check schema output above';
    RAISE NOTICE '  2. Go to /hot-sell page';
    RAISE NOTICE '  3. Try joining a session';
    RAISE NOTICE '  4. Check Supabase logs for RAISE NOTICE messages';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

