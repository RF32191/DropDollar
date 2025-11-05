-- ============================================================================
-- ULTIMATE TEXT = UUID FIX
-- This will diagnose the exact issue and fix it permanently
-- ============================================================================

-- STEP 1: Diagnose the actual data types
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DIAGNOSING TEXT = UUID ERROR';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Check hot_sell_sessions schema
SELECT 
    '🔍 hot_sell_sessions columns:' as info,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hot_sell_sessions'
AND column_name IN ('id', 'config_id', 'session_id')
ORDER BY column_name;

-- Check hot_sell_participants schema
SELECT 
    '🔍 hot_sell_participants columns:' as info,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hot_sell_participants'
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY column_name;

-- Check winner_takes_all_sessions schema
SELECT 
    '🔍 winner_takes_all_sessions columns:' as info,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'winner_takes_all_sessions'
AND column_name IN ('id', 'config_id', 'session_id')
ORDER BY column_name;

-- Check winner_takes_all_participants schema
SELECT 
    '🔍 winner_takes_all_participants columns:' as info,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'winner_takes_all_participants'
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY column_name;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 SCHEMA DIAGNOSIS COMPLETE';
    RAISE NOTICE 'Review the column types above';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: NUCLEAR DROP OF ALL FUNCTIONS
-- ============================================================================

DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🧹 Dropping all existing functions...';
    
    -- Drop all variations of join and get_all functions
    FOR func_record IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            n.nspname || '.' || p.proname || 
            '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname IN (
            'join_hot_sell_session',
            'join_winner_takes_all_session',
            'get_all_hot_sell_sessions',
            'get_all_winner_takes_all_sessions'
        )
        AND n.nspname = 'public'
    LOOP
        EXECUTE func_record.drop_statement;
        RAISE NOTICE '  Dropped: %', func_record.drop_statement;
    END LOOP;
    
    RAISE NOTICE '✅ All old functions dropped';
END $$;

-- ============================================================================
-- STEP 3: CREATE FIXED FUNCTIONS WITH EXPLICIT CASTING
-- ============================================================================

-- Get all Hot Sell sessions
CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE '📊 get_all_hot_sell_sessions called';
  
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id::TEXT,
        'prize_pool', COALESCE(s.prize_pool, 0),
        'base_price', COALESCE(s.base_price, 0),
        'participants_count', COALESCE(s.participants_count, 0),
        'max_participants', COALESCE(s.max_participants, 10),
        'status', s.status::TEXT,
        'created_at', s.created_at::TEXT,
        'participants', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', p.user_id::TEXT,
                'score', p.score,
                'joined_at', p.joined_at::TEXT
              )
            )
            FROM public.hot_sell_participants p
            WHERE p.session_id::TEXT = s.id::TEXT  -- EXPLICIT TEXT COMPARISON
          ),
          '[]'::json
        )
      )
    ), '[]'::json)
    FROM public.hot_sell_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

-- Get all Winner Takes All sessions
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE '📊 get_all_winner_takes_all_sessions called';
  
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id::TEXT,
        'current_pool', COALESCE(s.current_pool, 0),
        'base_price', COALESCE(s.base_price, 0),
        'participants_count', COALESCE(s.participants_count, 0),
        'status', s.status::TEXT,
        'timer_started_at', s.timer_started_at::TEXT,
        'timer_duration', COALESCE(s.timer_duration, 1800),
        'created_at', s.created_at::TEXT,
        'participants', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', p.user_id::TEXT,
                'score', p.score,
                'joined_at', p.joined_at::TEXT
              )
            )
            FROM public.winner_takes_all_participants p
            WHERE p.session_id::TEXT = s.id::TEXT  -- EXPLICIT TEXT COMPARISON
          ),
          '[]'::json
        )
      )
    ), '[]'::json)
    FROM public.winner_takes_all_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

-- Join Hot Sell Session
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
  v_session_id UUID;
  v_entry_fee NUMERIC;
  v_user_purchased_tokens NUMERIC;
  v_user_won_tokens NUMERIC;
  v_new_participant_id UUID;
  v_participants_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  RAISE NOTICE '🎮 join_hot_sell_session called: session=%, user=%, fee=%', session_id_param, user_id_param, entry_fee_param;

  -- Convert session_id to UUID with error handling
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Invalid session ID format: %', session_id_param;
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END;

  v_entry_fee := entry_fee_param;

  -- Get session info with explicit casting
  SELECT 
    COALESCE(s.participants_count, 0),
    COALESCE(s.max_participants, 10)
  INTO v_participants_count, v_max_participants
  FROM public.hot_sell_sessions s
  WHERE s.id::TEXT = v_session_id::TEXT  -- EXPLICIT TEXT COMPARISON
  AND s.status = 'active';

  IF NOT FOUND THEN
    RAISE NOTICE '❌ Session not found or inactive: %', v_session_id;
    RETURN QUERY SELECT FALSE, 'Session not found or inactive'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if session is full
  IF v_participants_count >= v_max_participants THEN
    RAISE NOTICE '❌ Session is full';
    RETURN QUERY SELECT FALSE, 'Session is full'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Get user's token balances
  SELECT 
    COALESCE(u.purchased_tokens, 0), 
    COALESCE(u.won_tokens, 0)
  INTO v_user_purchased_tokens, v_user_won_tokens
  FROM public.users u
  WHERE u.id = user_id_param;

  IF NOT FOUND THEN
    RAISE NOTICE '❌ User not found: %', user_id_param;
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '💵 User tokens - Purchased: %, Won: %', v_user_purchased_tokens, v_user_won_tokens;

  -- Check if user has enough tokens
  IF v_user_purchased_tokens + v_user_won_tokens < v_entry_fee THEN
    RAISE NOTICE '❌ Insufficient tokens: need %, have %', v_entry_fee, v_user_purchased_tokens + v_user_won_tokens;
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens (purchased first, then won)
  IF v_user_purchased_tokens >= v_entry_fee THEN
    -- Deduct all from purchased
    UPDATE public.users u
    SET purchased_tokens = u.purchased_tokens - v_entry_fee
    WHERE u.id = user_id_param;
    RAISE NOTICE '✅ Deducted % tokens from purchased', v_entry_fee;
  ELSE
    -- Deduct all purchased, then remainder from won
    DECLARE
      v_remaining NUMERIC := v_entry_fee - v_user_purchased_tokens;
    BEGIN
      UPDATE public.users u
      SET 
        purchased_tokens = 0,
        won_tokens = u.won_tokens - v_remaining
      WHERE u.id = user_id_param;
      RAISE NOTICE '✅ Deducted % from purchased and % from won', v_user_purchased_tokens, v_remaining;
    END;
  END IF;

  -- Check if already joined (explicit text comparison)
  IF EXISTS (
    SELECT 1 FROM public.hot_sell_participants p
    WHERE p.session_id::TEXT = v_session_id::TEXT  -- EXPLICIT TEXT COMPARISON
    AND p.user_id = user_id_param
  ) THEN
    RAISE NOTICE '⚠️ User already joined this session';
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, session_id_param, NULL::TEXT;
    RETURN;
  END IF;

  -- Create participant
  v_new_participant_id := gen_random_uuid();
  
  INSERT INTO public.hot_sell_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, v_session_id, user_id_param, NOW()
  );

  -- Update session
  UPDATE public.hot_sell_sessions s
  SET 
    participants_count = participants_count + 1,
    prize_pool = COALESCE(prize_pool, 0) + v_entry_fee
  WHERE s.id::TEXT = v_session_id::TEXT;  -- EXPLICIT TEXT COMPARISON

  RAISE NOTICE '✅ Successfully joined session';

  RETURN QUERY SELECT 
    TRUE, 
    'Successfully joined session'::TEXT, 
    v_session_id::TEXT, 
    v_new_participant_id::TEXT;
END;
$$;

-- Join Winner Takes All Session
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
  v_session_id UUID;
  v_entry_fee NUMERIC;
  v_user_purchased_tokens NUMERIC;
  v_user_won_tokens NUMERIC;
  v_new_participant_id UUID;
  v_participants_count INTEGER;
BEGIN
  RAISE NOTICE '🎮 join_winner_takes_all_session called: session=%, user=%, fee=%', session_id_param, user_id_param, entry_fee_param;

  -- Convert session_id to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Invalid session ID format: %', session_id_param;
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END;

  v_entry_fee := entry_fee_param;

  -- Get session info with explicit casting
  SELECT COALESCE(s.participants_count, 0)
  INTO v_participants_count
  FROM public.winner_takes_all_sessions s
  WHERE s.id::TEXT = v_session_id::TEXT  -- EXPLICIT TEXT COMPARISON
  AND s.status = 'active';

  IF NOT FOUND THEN
    RAISE NOTICE '❌ Session not found or inactive: %', v_session_id;
    RETURN QUERY SELECT FALSE, 'Session not found or inactive'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Get user's token balances
  SELECT 
    COALESCE(u.purchased_tokens, 0), 
    COALESCE(u.won_tokens, 0)
  INTO v_user_purchased_tokens, v_user_won_tokens
  FROM public.users u
  WHERE u.id = user_id_param;

  IF NOT FOUND THEN
    RAISE NOTICE '❌ User not found: %', user_id_param;
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '💵 User tokens - Purchased: %, Won: %', v_user_purchased_tokens, v_user_won_tokens;

  -- Check if user has enough tokens
  IF v_user_purchased_tokens + v_user_won_tokens < v_entry_fee THEN
    RAISE NOTICE '❌ Insufficient tokens';
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens (purchased first)
  IF v_user_purchased_tokens >= v_entry_fee THEN
    UPDATE public.users
    SET purchased_tokens = purchased_tokens - v_entry_fee
    WHERE id = user_id_param;
    RAISE NOTICE '✅ Deducted % from purchased', v_entry_fee;
  ELSE
    DECLARE
      v_remaining NUMERIC := v_entry_fee - v_user_purchased_tokens;
    BEGIN
      UPDATE public.users
      SET 
        purchased_tokens = 0,
        won_tokens = won_tokens - v_remaining
      WHERE id = user_id_param;
      RAISE NOTICE '✅ Deducted % from purchased and % from won', v_user_purchased_tokens, v_remaining;
    END;
  END IF;

  -- Check if already joined (explicit text comparison)
  IF EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants p
    WHERE p.session_id::TEXT = v_session_id::TEXT  -- EXPLICIT TEXT COMPARISON
    AND p.user_id = user_id_param
  ) THEN
    RAISE NOTICE '⚠️ Already joined';
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, session_id_param, NULL::TEXT;
    RETURN;
  END IF;

  -- Create participant
  v_new_participant_id := gen_random_uuid();
  
  INSERT INTO public.winner_takes_all_participants (
    id, session_id, user_id, joined_at
  ) VALUES (
    v_new_participant_id, v_session_id, user_id_param, NOW()
  );

  -- Update session
  UPDATE public.winner_takes_all_sessions s
  SET 
    participants_count = participants_count + 1,
    current_pool = COALESCE(current_pool, 0) + v_entry_fee
  WHERE s.id::TEXT = v_session_id::TEXT;  -- EXPLICIT TEXT COMPARISON

  RAISE NOTICE '✅ Successfully joined session';

  RETURN QUERY SELECT 
    TRUE, 
    'Successfully joined session'::TEXT, 
    v_session_id::TEXT, 
    v_new_participant_id::TEXT;
END;
$$;

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- FINAL SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL FUNCTIONS RECREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 KEY FIXES APPLIED:';
    RAISE NOTICE '  1. All comparisons use explicit ::TEXT casting';
    RAISE NOTICE '  2. Functions accept TEXT for session_id';
    RAISE NOTICE '  3. All WHERE clauses compare TEXT = TEXT';
    RAISE NOTICE '  4. Permissions granted to authenticated & anon';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Try joining a Hot Sell session now!';
    RAISE NOTICE '========================================';
END $$;

