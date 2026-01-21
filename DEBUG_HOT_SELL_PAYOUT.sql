-- ============================================================================
-- DEBUG HOT SELL PAYOUT - WITH EXTENSIVE LOGGING
-- This will show EXACTLY what's happening
-- ============================================================================

-- STEP 1: Reset
DO $$ BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔄 STEP 1: RESETTING HOT SELL';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  DELETE FROM public.hot_sell_participants;
  DELETE FROM public.hot_sell_sessions;
  RAISE NOTICE '✅ Reset complete';
  RAISE NOTICE '';
END $$;

-- STEP 2: Create sessions
DO $$ 
DECLARE
  config_rec RECORD;
  new_session_id UUID;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 STEP 2: CREATING FRESH SESSIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  FOR config_rec IN SELECT * FROM public.hot_sell_configs ORDER BY base_price LOOP
    INSERT INTO public.hot_sell_sessions (
      config_id, prize_pool, base_price, max_participants, participants_count, status
    )
    VALUES (
      config_rec.id, 0, config_rec.base_price, config_rec.max_participants, 0, 'waiting'
    )
    RETURNING id INTO new_session_id;
    
    RAISE NOTICE '  ✅ %: %', config_rec.title, new_session_id;
  END LOOP;
  RAISE NOTICE '';
END $$;

-- STEP 3: Payout function with EXTENSIVE logging
DROP FUNCTION IF EXISTS public.process_hot_sell_payout_complete(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout_complete(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_session_pool NUMERIC;
  v_config_title TEXT;
  v_config_base NUMERIC;
  v_config_max INT;
  v_w1_id TEXT;
  v_w1_name TEXT;
  v_w1_score NUMERIC;
  v_w2_id TEXT;
  v_w2_name TEXT;
  v_w2_score NUMERIC;
  v_w3_id TEXT;
  v_w3_name TEXT;
  v_w3_score NUMERIC;
  v_prize1 NUMERIC;
  v_prize2 NUMERIC;
  v_prize3 NUMERIC;
  v_fee NUMERIC;
  v_new_session UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '💰 HOT SELL PAYOUT FUNCTION CALLED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Config ID: %', config_id_param;
  RAISE NOTICE 'Timestamp: %', NOW();
  RAISE NOTICE '';

  -- Find session
  RAISE NOTICE '🔍 Step 1: Finding session...';
  SELECT id, prize_pool INTO v_session_id, v_session_pool
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param 
    AND status IN ('active', 'waiting')
    AND first_place_user_id IS NULL
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_session_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No session found!';
    RAISE NOTICE '   Config: %', config_id_param;
    RAISE NOTICE '';
    RETURN json_build_object(
      'success', false, 
      'message', 'No active session found',
      'config_id', config_id_param
    );
  END IF;
  
  RAISE NOTICE '✅ Found session: %', v_session_id;
  RAISE NOTICE '   Prize pool: $%', v_session_pool;
  RAISE NOTICE '';

  -- Get config
  RAISE NOTICE '🔍 Step 2: Getting config...';
  SELECT title, base_price, max_participants 
  INTO v_config_title, v_config_base, v_config_max
  FROM public.hot_sell_configs WHERE id = config_id_param;
  
  RAISE NOTICE '✅ Config: %', v_config_title;
  RAISE NOTICE '   Base: $% | Max: % players', v_config_base, v_config_max;
  RAISE NOTICE '';

  -- Get 1st place
  RAISE NOTICE '🔍 Step 3: Getting winners...';
  SELECT 
    p.user_id,
    COALESCE(u.username, SPLIT_PART(u.email, ''@'', 1), ''Player''),
    p.score
  INTO v_w1_id, v_w1_name, v_w1_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  IF v_w1_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No winners found!';
    RAISE NOTICE '   Session: %', v_session_id;
    RAISE NOTICE '';
    RETURN json_build_object(
      'success', false, 
      'message', 'No winners found',
      'session_id', v_session_id
    );
  END IF;
  
  RAISE NOTICE '✅ 1st Place: % (Score: %)', v_w1_name, v_w1_score;
  
  -- Get 2nd place
  SELECT 
    p.user_id,
    COALESCE(u.username, SPLIT_PART(u.email, ''@'', 1), ''Player''),
    p.score
  INTO v_w2_id, v_w2_name, v_w2_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL AND p.user_id != v_w1_id
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  RAISE NOTICE '✅ 2nd Place: % (Score: %)', COALESCE(v_w2_name, 'N/A'), COALESCE(v_w2_score, 0);
  
  -- Get 3rd place
  SELECT 
    p.user_id,
    COALESCE(u.username, SPLIT_PART(u.email, ''@'', 1), ''Player''),
    p.score
  INTO v_w3_id, v_w3_name, v_w3_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL 
    AND p.user_id != v_w1_id
    AND (v_w2_id IS NULL OR p.user_id != v_w2_id)
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  RAISE NOTICE '✅ 3rd Place: % (Score: %)', COALESCE(v_w3_name, 'N/A'), COALESCE(v_w3_score, 0);
  RAISE NOTICE '';

  -- Calculate prizes
  v_prize1 := ROUND(v_session_pool * 0.50, 2);
  v_prize2 := ROUND(v_session_pool * 0.20, 2);
  v_prize3 := ROUND(v_session_pool * 0.15, 2);
  v_fee := ROUND(v_session_pool * 0.15, 2);
  
  RAISE NOTICE '🔍 Step 4: Calculating prizes...';
  RAISE NOTICE '   1st: $% (50%%)', v_prize1;
  RAISE NOTICE '   2nd: $% (20%%)', v_prize2;
  RAISE NOTICE '   3rd: $% (15%%)', v_prize3;
  RAISE NOTICE '   Fee: $% (15%%)', v_fee;
  RAISE NOTICE '';

  -- Pay winners
  RAISE NOTICE '🔍 Step 5: Paying winners...';
  
  UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_prize1 
  WHERE id::TEXT = v_w1_id;
  
  INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
  VALUES (
    v_w1_id::UUID, v_prize1, 'game_win',
    (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM users WHERE id::TEXT = v_w1_id),
    v_config_title || ' - 1st Place'
  );
  RAISE NOTICE '✅ Paid 1st: % → $%', v_w1_name, v_prize1;
  
  IF v_w2_id IS NOT NULL THEN
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_prize2 
    WHERE id::TEXT = v_w2_id;
    
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (
      v_w2_id::UUID, v_prize2, 'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM users WHERE id::TEXT = v_w2_id),
      v_config_title || ' - 2nd Place'
    );
    RAISE NOTICE '✅ Paid 2nd: % → $%', v_w2_name, v_prize2;
  END IF;
  
  IF v_w3_id IS NOT NULL THEN
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_prize3 
    WHERE id::TEXT = v_w3_id;
    
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (
      v_w3_id::UUID, v_prize3, 'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM users WHERE id::TEXT = v_w3_id),
      v_config_title || ' - 3rd Place'
    );
    RAISE NOTICE '✅ Paid 3rd: % → $%', v_w3_name, v_prize3;
  END IF;
  RAISE NOTICE '';

  -- Mark session completed
  RAISE NOTICE '🔍 Step 6: Marking session completed...';
  UPDATE public.hot_sell_sessions SET
    status = 'completed',
    first_place_user_id = v_w1_id::UUID,
    second_place_user_id = v_w2_id::UUID,
    third_place_user_id = v_w3_id::UUID,
    first_place_prize = v_prize1,
    second_place_prize = v_prize2,
    third_place_prize = v_prize3,
    platform_fee = v_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session_id;
  RAISE NOTICE '✅ Session marked completed: %', v_session_id;
  RAISE NOTICE '';

  -- Create new session
  RAISE NOTICE '🔍 Step 7: Creating new session...';
  INSERT INTO public.hot_sell_sessions (
    config_id, prize_pool, base_price, max_participants, participants_count, status
  )
  VALUES (
    config_id_param, 0, v_config_base, v_config_max, 0, 'waiting'
  )
  RETURNING id INTO v_new_session;
  RAISE NOTICE '✅ New session created: %', v_new_session;
  RAISE NOTICE '';

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 PAYOUT COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Return data
  RETURN json_build_object(
    'success', true,
    'message', 'Payout completed successfully',
    'pool', v_session_pool,
    'new_session_id', v_new_session,
    'old_session_id', v_session_id,
    'winners', json_build_array(
      json_build_object('rank', 1, 'username', v_w1_name, 'score', v_w1_score, 'prize', v_prize1),
      json_build_object('rank', 2, 'username', COALESCE(v_w2_name, 'N/A'), 'score', COALESCE(v_w2_score, 0), 'prize', v_prize2),
      json_build_object('rank', 3, 'username', COALESCE(v_w3_name, 'N/A'), 'score', COALESCE(v_w3_score, 0), 'prize', v_prize3)
    ),
    'platform_fee', v_fee
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '❌ FATAL ERROR IN PAYOUT FUNCTION!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Error: %', SQLERRM;
  RAISE NOTICE 'Detail: %', SQLSTATE;
  RAISE NOTICE '';
  
  RETURN json_build_object(
    'success', false,
    'message', 'Fatal error: ' || SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

-- Verification
DO $$ 
DECLARE
  config_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM hot_sell_configs;
  SELECT COUNT(*) INTO session_count FROM hot_sell_sessions WHERE status = 'waiting';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SETUP COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Configs: % | Waiting Sessions: %', config_count, session_count;
  RAISE NOTICE '';
  RAISE NOTICE 'HOW TO TEST:';
  RAISE NOTICE '1. Play a game until full';
  RAISE NOTICE '2. Watch console for countdown: "💰 [Hot Sell] COMPLETE PAYOUT triggered"';
  RAISE NOTICE '3. Check Supabase logs (Dashboard → Database → Logs)';
  RAISE NOTICE '4. Look for "HOT SELL PAYOUT FUNCTION CALLED" messages';
  RAISE NOTICE '';
  RAISE NOTICE 'If nothing happens, the frontend isn''t calling the function!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
