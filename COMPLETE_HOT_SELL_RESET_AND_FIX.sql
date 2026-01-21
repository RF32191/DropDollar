-- ============================================================================
-- COMPLETE HOT SELL FIX - RESET + PAYOUT
-- Run this ONE file to fix everything
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Starting Complete Hot Sell Fix...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 1: RESET ALL HOT SELL LISTINGS
-- ============================================================================

DO $$ 
DECLARE
  deleted_participants INTEGER;
  deleted_sessions INTEGER;
BEGIN
  RAISE NOTICE '📋 STEP 1: Resetting all Hot Sell listings...';
  RAISE NOTICE '';
  
  -- Delete all participants
  DELETE FROM public.hot_sell_participants;
  GET DIAGNOSTICS deleted_participants = ROW_COUNT;
  RAISE NOTICE '  ✅ Deleted % participants', deleted_participants;
  
  -- Delete all sessions
  DELETE FROM public.hot_sell_sessions;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  RAISE NOTICE '  ✅ Deleted % sessions', deleted_sessions;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: CREATE FRESH SESSIONS
-- ============================================================================

DO $$ 
DECLARE
  config_rec RECORD;
  new_session_id UUID;
  session_count INTEGER := 0;
BEGIN
  RAISE NOTICE '📋 STEP 2: Creating fresh sessions...';
  RAISE NOTICE '';
  
  FOR config_rec IN 
    SELECT * FROM public.hot_sell_configs ORDER BY base_price
  LOOP
    INSERT INTO public.hot_sell_sessions (
      config_id, prize_pool, base_price, max_participants, participants_count, status
    )
    VALUES (
      config_rec.id, 0, config_rec.base_price, config_rec.max_participants, 0, 'waiting'
    )
    RETURNING id INTO new_session_id;
    
    session_count := session_count + 1;
    RAISE NOTICE '  ✅ Created: % (ID: %)', config_rec.title, new_session_id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created % fresh sessions', session_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: FIX PAYOUT FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_hot_sell_payout_complete(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout_complete(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_config RECORD;
  v_first RECORD;
  v_second RECORD;
  v_third RECORD;
  v_pool NUMERIC;
  v_prize_1 NUMERIC;
  v_prize_2 NUMERIC;
  v_prize_3 NUMERIC;
  v_platform_fee NUMERIC;
  v_new_session UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🎯 HOT SELL PAYOUT TRIGGERED';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'Config ID: %', config_id_param;
  RAISE NOTICE '';
  
  -- Find the active session
  SELECT id, prize_pool INTO v_session_id, v_pool
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param 
    AND status IN ('active', 'waiting')
    AND first_place_user_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No active session found!';
    RETURN json_build_object('success', false, 'message', 'No active session');
  END IF;
  
  RAISE NOTICE '✅ Found session: %', v_session_id;
  RAISE NOTICE '💰 Prize pool: $%', v_pool;
  RAISE NOTICE '';
  
  -- Get config
  SELECT * INTO v_config FROM public.hot_sell_configs WHERE id = config_id_param;
  
  -- Get 1st place
  SELECT 
    p.user_id,
    p.score,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
    (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_first
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  -- Get 2nd place
  SELECT 
    p.user_id,
    p.score,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
    (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_second
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_id 
    AND p.score IS NOT NULL
    AND p.user_id != v_first.user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  -- Get 3rd place
  SELECT 
    p.user_id,
    p.score,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
    (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_third
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_id
    AND p.score IS NOT NULL
    AND p.user_id != v_first.user_id
    AND (v_second.user_id IS NULL OR p.user_id != v_second.user_id)
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  IF v_first.user_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No winners found!';
    RETURN json_build_object('success', false, 'message', 'No winners');
  END IF;
  
  -- Calculate prizes
  v_prize_1 := ROUND(v_pool * 0.50, 2);
  v_prize_2 := ROUND(v_pool * 0.20, 2);
  v_prize_3 := ROUND(v_pool * 0.15, 2);
  v_platform_fee := ROUND(v_pool * 0.15, 2);
  
  RAISE NOTICE '🏆 WINNERS:';
  RAISE NOTICE '  🥇 1st: % (Score: %) → $%', v_first.username, v_first.score, v_prize_1;
  RAISE NOTICE '  🥈 2nd: % (Score: %) → $%', COALESCE(v_second.username, 'N/A'), COALESCE(v_second.score, 0), v_prize_2;
  RAISE NOTICE '  🥉 3rd: % (Score: %) → $%', COALESCE(v_third.username, 'N/A'), COALESCE(v_third.score, 0), v_prize_3;
  RAISE NOTICE '  💼 Platform Fee: $%', v_platform_fee;
  RAISE NOTICE '';
  
  -- Pay 1st place
  UPDATE public.users 
  SET won_tokens = COALESCE(won_tokens, 0) + v_prize_1, updated_at = NOW()
  WHERE id::TEXT = v_first.user_id;
  
  INSERT INTO public.token_transactions (
    user_id, amount, transaction_type, balance_after, description
  )
  VALUES (
    v_first.user_id::UUID,
    v_prize_1,
    'game_win',
    v_first.balance + v_prize_1,
    v_config.title || ' - 1st Place'
  );
  
  RAISE NOTICE '✅ Paid 1st place: %', v_first.username;
  
  -- Pay 2nd place
  IF v_second.user_id IS NOT NULL THEN
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_prize_2, updated_at = NOW()
    WHERE id::TEXT = v_second.user_id;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, balance_after, description
    )
    VALUES (
      v_second.user_id::UUID,
      v_prize_2,
      'game_win',
      v_second.balance + v_prize_2,
      v_config.title || ' - 2nd Place'
    );
    
    RAISE NOTICE '✅ Paid 2nd place: %', v_second.username;
  END IF;
  
  -- Pay 3rd place
  IF v_third.user_id IS NOT NULL THEN
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_prize_3, updated_at = NOW()
    WHERE id::TEXT = v_third.user_id;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, balance_after, description
    )
    VALUES (
      v_third.user_id::UUID,
      v_prize_3,
      'game_win',
      v_third.balance + v_prize_3,
      v_config.title || ' - 3rd Place'
    );
    
    RAISE NOTICE '✅ Paid 3rd place: %', v_third.username;
  END IF;
  
  -- Mark session completed
  UPDATE public.hot_sell_sessions
  SET 
    status = 'completed',
    first_place_user_id = v_first.user_id::UUID,
    second_place_user_id = v_second.user_id::UUID,
    third_place_user_id = v_third.user_id::UUID,
    first_place_prize = v_prize_1,
    second_place_prize = v_prize_2,
    third_place_prize = v_prize_3,
    platform_fee = v_platform_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Session marked completed';
  
  -- Create new session
  INSERT INTO public.hot_sell_sessions (
    config_id, prize_pool, base_price, max_participants, participants_count, status
  )
  VALUES (
    config_id_param, 0, v_config.base_price, v_config.max_participants, 0, 'waiting'
  )
  RETURNING id INTO v_new_session;
  
  RAISE NOTICE '✅ New session created: %', v_new_session;
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🎉 PAYOUT COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Return data
  RETURN json_build_object(
    'success', true,
    'message', 'Payout complete',
    'pool', v_pool,
    'new_session_id', v_new_session,
    'winners', json_build_array(
      json_build_object('rank', 1, 'username', v_first.username, 'score', v_first.score, 'prize', v_prize_1),
      json_build_object('rank', 2, 'username', COALESCE(v_second.username, 'N/A'), 'score', COALESCE(v_second.score, 0), 'prize', v_prize_2),
      json_build_object('rank', 3, 'username', COALESCE(v_third.username, 'N/A'), 'score', COALESCE(v_third.score, 0), 'prize', v_prize_3)
    ),
    'platform_fee', v_platform_fee
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

DO $$ BEGIN RAISE NOTICE '✅ Payout function updated!'; RAISE NOTICE ''; END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$ 
DECLARE
  config_count INTEGER;
  session_count INTEGER;
  participant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.hot_sell_configs;
  SELECT COUNT(*) INTO session_count FROM public.hot_sell_sessions WHERE status = 'waiting';
  SELECT COUNT(*) INTO participant_count FROM public.hot_sell_participants;
  
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '📊 VERIFICATION REPORT';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Configs: %', config_count;
  RAISE NOTICE '🎮 Waiting Sessions: %', session_count;
  RAISE NOTICE '👥 Participants: %', participant_count;
  RAISE NOTICE '';
  
  IF config_count = session_count AND participant_count = 0 THEN
    RAISE NOTICE '✅ ALL GOOD! Hot Sell is ready for testing!';
  ELSE
    RAISE NOTICE '⚠️  Warning: Configs (%) != Sessions (%)', config_count, session_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🎉 COMPLETE HOT SELL FIX DONE!';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '✅ Reset all listings to 0';
  RAISE NOTICE '✅ Created fresh waiting sessions';
  RAISE NOTICE '✅ Fixed payout function';
  RAISE NOTICE '✅ Pays all 3 winners correctly';
  RAISE NOTICE '✅ Creates new session after payout';
  RAISE NOTICE '✅ Returns winner data to frontend';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Test the countdown now!';
  RAISE NOTICE '';
END $$;

