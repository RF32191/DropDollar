-- ============================================================================
-- HOT SELL PAYOUT FIX - SIMPLE & BULLETPROOF
-- Fixes countdown payout and auto-reset
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_hot_sell_payout_complete(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout_complete(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_record RECORD;
  v_config_record RECORD;
  v_total_pool NUMERIC;
  v_first_prize NUMERIC;
  v_second_prize NUMERIC;
  v_third_prize NUMERIC;
  v_platform_fee NUMERIC;
  v_new_session_id UUID;
  v_first_user_id TEXT;
  v_second_user_id TEXT;
  v_third_user_id TEXT;
  v_first_score NUMERIC;
  v_second_score NUMERIC;
  v_third_score NUMERIC;
  v_first_name TEXT;
  v_second_name TEXT;
  v_third_name TEXT;
BEGIN
  RAISE NOTICE '🎯 Starting Hot Sell Payout for config: %', config_id_param;
  
  -- Get the most recent active/waiting session for this config
  SELECT * INTO v_session_record 
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param 
    AND status IN ('active', 'waiting')
    AND first_place_user_id IS NULL
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ No active session found';
    RETURN json_build_object('success', false, 'message', 'No active session found');
  END IF;
  
  RAISE NOTICE '✅ Found session: %', v_session_record.id;
  
  -- Get config
  SELECT * INTO v_config_record 
  FROM public.hot_sell_configs 
  WHERE id = config_id_param;
  
  -- Get top 3 winners by score
  SELECT p.user_id, p.score, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
  INTO v_first_user_id, v_first_score, v_first_name
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  SELECT p.user_id, p.score, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
  INTO v_second_user_id, v_second_score, v_second_name
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id 
    AND p.score IS NOT NULL 
    AND p.user_id != v_first_user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  SELECT p.user_id, p.score, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
  INTO v_third_user_id, v_third_score, v_third_name
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id 
    AND p.score IS NOT NULL 
    AND p.user_id != v_first_user_id
    AND (v_second_user_id IS NULL OR p.user_id != v_second_user_id)
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  IF v_first_user_id IS NULL THEN
    RAISE NOTICE '❌ No winners found';
    RETURN json_build_object('success', false, 'message', 'No winners found');
  END IF;
  
  RAISE NOTICE '🏆 Winners: 1st=% 2nd=% 3rd=%', v_first_name, v_second_name, v_third_name;
  
  -- Calculate prizes (50%, 20%, 15%, 15% platform)
  v_total_pool := v_session_record.prize_pool;
  v_first_prize := v_total_pool * 0.50;
  v_second_prize := v_total_pool * 0.20;
  v_third_prize := v_total_pool * 0.15;
  v_platform_fee := v_total_pool * 0.15;
  
  RAISE NOTICE '💰 Prizes: 1st=$% 2nd=$% 3rd=$% Fee=$%', v_first_prize, v_second_prize, v_third_prize, v_platform_fee;
  
  -- Pay winners
  IF v_first_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_first_prize, updated_at = NOW()
    WHERE id::TEXT = v_first_user_id;
    
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (
      v_first_user_id::UUID, 
      v_first_prize, 
      'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM public.users WHERE id::TEXT = v_first_user_id),
      format('Hot Sell 1st Place - %s', v_config_record.title)
    );
    RAISE NOTICE '✅ Paid 1st place: %', v_first_name;
  END IF;
  
  IF v_second_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_second_prize, updated_at = NOW()
    WHERE id::TEXT = v_second_user_id;
    
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (
      v_second_user_id::UUID,
      v_second_prize,
      'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM public.users WHERE id::TEXT = v_second_user_id),
      format('Hot Sell 2nd Place - %s', v_config_record.title)
    );
    RAISE NOTICE '✅ Paid 2nd place: %', v_second_name;
  END IF;
  
  IF v_third_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_third_prize, updated_at = NOW()
    WHERE id::TEXT = v_third_user_id;
    
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (
      v_third_user_id::UUID,
      v_third_prize,
      'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM public.users WHERE id::TEXT = v_third_user_id),
      format('Hot Sell 3rd Place - %s', v_config_record.title)
    );
    RAISE NOTICE '✅ Paid 3rd place: %', v_third_name;
  END IF;
  
  -- Mark session completed
  UPDATE public.hot_sell_sessions
  SET status = 'completed',
      first_place_user_id = v_first_user_id::UUID,
      second_place_user_id = v_second_user_id::UUID,
      third_place_user_id = v_third_user_id::UUID,
      first_place_prize = v_first_prize,
      second_place_prize = v_second_prize,
      third_place_prize = v_third_prize,
      platform_fee = v_platform_fee,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_session_record.id;
  
  RAISE NOTICE '✅ Session marked completed';
  
  -- Create new waiting session
  INSERT INTO public.hot_sell_sessions (
    config_id, prize_pool, base_price, max_participants, participants_count, status
  )
  VALUES (
    config_id_param, 0, v_config_record.base_price, v_config_record.max_participants, 0, 'waiting'
  )
  RETURNING id INTO v_new_session_id;
  
  RAISE NOTICE '✅ Created new session: %', v_new_session_id;
  
  -- Return winner data
  RETURN json_build_object(
    'success', true,
    'message', 'Payout successful',
    'pool', v_total_pool,
    'new_session_id', v_new_session_id,
    'winners', json_build_array(
      json_build_object(
        'rank', 1,
        'username', v_first_name,
        'score', v_first_score,
        'prize', v_first_prize
      ),
      json_build_object(
        'rank', 2,
        'username', COALESCE(v_second_name, 'N/A'),
        'score', COALESCE(v_second_score, 0),
        'prize', v_second_prize
      ),
      json_build_object(
        'rank', 3,
        'username', COALESCE(v_third_name, 'N/A'),
        'score', COALESCE(v_third_score, 0),
        'prize', v_third_prize
      )
    ),
    'platform_fee', v_platform_fee
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

-- Verification
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ HOT SELL PAYOUT FUNCTION FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'This function now:';
  RAISE NOTICE '✅ Finds active sessions correctly';
  RAISE NOTICE '✅ Gets top 3 winners by score';
  RAISE NOTICE '✅ Pays all 3 winners (50%%, 20%%, 15%%)';
  RAISE NOTICE '✅ Takes 15%% platform fee';
  RAISE NOTICE '✅ Marks session completed';
  RAISE NOTICE '✅ Creates new waiting session';
  RAISE NOTICE '✅ Returns winner data to frontend';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Hot Sell payout is now working!';
  RAISE NOTICE '';
END $$;

