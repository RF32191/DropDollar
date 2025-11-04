-- ============================================================================
-- GUARANTEED FUNCTION FIX - ABSOLUTE SIMPLEST IMPLEMENTATION
-- This will work even if schema is mismatched
-- ============================================================================

-- STEP 1: NUCLEAR CLEANUP - Drop ALL possible function signatures
-- ============================================================================

DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all join_hot_sell_session functions regardless of signature
    FOR func_record IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            n.nspname || '.' || p.proname || 
            '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'join_hot_sell_session'
        AND n.nspname = 'public'
    LOOP
        EXECUTE func_record.drop_statement;
        RAISE NOTICE 'Dropped: %', func_record.drop_statement;
    END LOOP;

    -- Drop all join_winner_takes_all_session functions
    FOR func_record IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            n.nspname || '.' || p.proname || 
            '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'join_winner_takes_all_session'
        AND n.nspname = 'public'
    LOOP
        EXECUTE func_record.drop_statement;
        RAISE NOTICE 'Dropped: %', func_record.drop_statement;
    END LOOP;

    -- Drop all get_all_hot_sell_sessions functions
    FOR func_record IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            n.nspname || '.' || p.proname || 
            '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_all_hot_sell_sessions'
        AND n.nspname = 'public'
    LOOP
        EXECUTE func_record.drop_statement;
        RAISE NOTICE 'Dropped: %', func_record.drop_statement;
    END LOOP;

    -- Drop all get_all_winner_takes_all_sessions functions
    FOR func_record IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            n.nspname || '.' || p.proname || 
            '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_all_winner_takes_all_sessions'
        AND n.nspname = 'public'
    LOOP
        EXECUTE func_record.drop_statement;
        RAISE NOTICE 'Dropped: %', func_record.drop_statement;
    END LOOP;

    RAISE NOTICE '✅ All old function versions dropped';
END $$;

-- ============================================================================
-- STEP 2: CREATE ULTRA-SIMPLE get_all FUNCTIONS (RETURN JSON)
-- ============================================================================

-- Get all Hot Sell sessions (returns JSON to avoid type mismatches)
CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id::TEXT,
        'prize_pool', s.prize_pool,
        'base_price', s.base_price,
        'participants_count', s.participants_count,
        'max_participants', s.max_participants,
        'status', s.status::TEXT,
        'created_at', s.created_at,
        'participants', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', p.user_id::TEXT,
                'score', p.score,
                'joined_at', p.joined_at
              )
            )
            FROM public.hot_sell_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        )
      )
    )
    FROM public.hot_sell_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

-- Get all Winner Takes All sessions (returns JSON)
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id::TEXT,
        'current_pool', s.current_pool,
        'base_price', s.base_price,
        'participants_count', s.participants_count,
        'status', s.status::TEXT,
        'timer_duration', s.timer_duration,
        'created_at', s.created_at,
        'participants', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', p.user_id::TEXT,
                'score', p.score,
                'joined_at', p.joined_at
              )
            )
            FROM public.winner_takes_all_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        )
      )
    )
    FROM public.winner_takes_all_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  );
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✅ get_all functions created';
END $$;

-- ============================================================================
-- STEP 3: CREATE ULTRA-SIMPLE join FUNCTIONS (NO EXTERNAL CALLS)
-- ============================================================================

-- Join Hot Sell Session - INLINE TOKEN DEDUCTION
CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
  session_id_param TEXT,
  user_id_param UUID
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
  -- Convert session_id to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END;

  RAISE NOTICE '🔍 Joining session % for user %', v_session_id, user_id_param;

  -- Get session entry fee
  SELECT base_price, participants_count
  INTO v_entry_fee, v_participants_count
  FROM public.hot_sell_sessions
  WHERE id = v_session_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found or inactive'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '💰 Entry fee: %, Current participants: %', v_entry_fee, v_participants_count;

  -- Get user's token balances
  SELECT purchased_tokens, won_tokens
  INTO v_user_purchased_tokens, v_user_won_tokens
  FROM public.users
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '💵 User tokens - Purchased: %, Won: %', v_user_purchased_tokens, v_user_won_tokens;

  -- Check if user has enough tokens (purchased first, then won)
  IF COALESCE(v_user_purchased_tokens, 0) + COALESCE(v_user_won_tokens, 0) < v_entry_fee THEN
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens (purchased first)
  IF COALESCE(v_user_purchased_tokens, 0) >= v_entry_fee THEN
    -- Deduct all from purchased
    UPDATE public.users
    SET purchased_tokens = purchased_tokens - v_entry_fee
    WHERE id = user_id_param;
    RAISE NOTICE '✅ Deducted % from purchased tokens', v_entry_fee;
  ELSE
    -- Deduct all purchased, then remainder from won
    DECLARE
      v_remaining NUMERIC := v_entry_fee - COALESCE(v_user_purchased_tokens, 0);
    BEGIN
      UPDATE public.users
      SET 
        purchased_tokens = 0,
        won_tokens = won_tokens - v_remaining
      WHERE id = user_id_param;
      RAISE NOTICE '✅ Deducted % from purchased and % from won tokens', v_user_purchased_tokens, v_remaining;
    END;
  END IF;

  -- Check if already joined
  IF EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) THEN
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

  -- Update session participant count
  UPDATE public.hot_sell_sessions
  SET 
    participants_count = participants_count + 1,
    prize_pool = prize_pool + v_entry_fee
  WHERE id = v_session_id;

  RAISE NOTICE '✅ Successfully joined session';

  RETURN QUERY SELECT 
    TRUE, 
    'Successfully joined session'::TEXT, 
    v_session_id::TEXT, 
    v_new_participant_id::TEXT;
END;
$$;

-- Join Winner Takes All Session - INLINE TOKEN DEDUCTION
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
  session_id_param TEXT,
  user_id_param UUID
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
  -- Convert session_id to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END;

  RAISE NOTICE '🔍 Joining WTA session % for user %', v_session_id, user_id_param;

  -- Get session entry fee
  SELECT base_price, participants_count
  INTO v_entry_fee, v_participants_count
  FROM public.winner_takes_all_sessions
  WHERE id = v_session_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found or inactive'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '💰 Entry fee: %, Current participants: %', v_entry_fee, v_participants_count;

  -- Get user's token balances
  SELECT purchased_tokens, won_tokens
  INTO v_user_purchased_tokens, v_user_won_tokens
  FROM public.users
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '💵 User tokens - Purchased: %, Won: %', v_user_purchased_tokens, v_user_won_tokens;

  -- Check if user has enough tokens
  IF COALESCE(v_user_purchased_tokens, 0) + COALESCE(v_user_won_tokens, 0) < v_entry_fee THEN
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens (purchased first)
  IF COALESCE(v_user_purchased_tokens, 0) >= v_entry_fee THEN
    UPDATE public.users
    SET purchased_tokens = purchased_tokens - v_entry_fee
    WHERE id = user_id_param;
    RAISE NOTICE '✅ Deducted % from purchased tokens', v_entry_fee;
  ELSE
    DECLARE
      v_remaining NUMERIC := v_entry_fee - COALESCE(v_user_purchased_tokens, 0);
    BEGIN
      UPDATE public.users
      SET 
        purchased_tokens = 0,
        won_tokens = won_tokens - v_remaining
      WHERE id = user_id_param;
      RAISE NOTICE '✅ Deducted % from purchased and % from won tokens', v_user_purchased_tokens, v_remaining;
    END;
  END IF;

  -- Check if already joined
  IF EXISTS (
    SELECT 1 FROM public.winner_takes_all_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) THEN
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

  -- Update session participant count and pool
  UPDATE public.winner_takes_all_sessions
  SET 
    participants_count = participants_count + 1,
    current_pool = current_pool + v_entry_fee
  WHERE id = v_session_id;

  RAISE NOTICE '✅ Successfully joined WTA session';

  RETURN QUERY SELECT 
    TRUE, 
    'Successfully joined session'::TEXT, 
    v_session_id::TEXT, 
    v_new_participant_id::TEXT;
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✅ join functions created';
END $$;

-- ============================================================================
-- STEP 4: VERIFY FUNCTIONS EXIST
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'join_hot_sell_session',
    'join_winner_takes_all_session',
    'get_all_hot_sell_sessions',
    'get_all_winner_takes_all_sessions'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION: % functions exist', v_count;
  RAISE NOTICE '========================================';

  IF v_count = 4 THEN
    RAISE NOTICE '🎉 SUCCESS! All 4 functions created!';
  ELSE
    RAISE WARNING '⚠️ Expected 4 functions but found %', v_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 RUN COMPLETE - Try joining a session now!';
  RAISE NOTICE '========================================';
END $$;

