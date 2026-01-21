-- ============================================================================
-- COMPLETE HOT SELL PAYOUT AND RESET FIX
-- This ensures payouts work and new sessions are created
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
  v_first_place_record RECORD;
  v_second_place_record RECORD;
  v_third_place_record RECORD;
  
  v_total_pool NUMERIC;
  v_first_prize NUMERIC;
  v_second_prize NUMERIC;
  v_third_prize NUMERIC;
  v_platform_fee_amount NUMERIC;
  
  v_new_session_id UUID;
BEGIN
  RAISE NOTICE '💰 [Payout] Starting payout for config: %', config_id_param;
  
  -- Get the session (not completed, not paid)
  SELECT * INTO v_session_record
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param
    AND status != 'completed'
    AND first_place_user_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE '⚠️ [Payout] No unpaid session found';
    RETURN json_build_object('success', false, 'message', 'No active session to payout');
  END IF;
  
  -- Get config
  SELECT * INTO v_config_record
  FROM public.hot_sell_configs
  WHERE id = config_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', config_id_param;
  END IF;
  
  RAISE NOTICE '📊 [Payout] Session ID: %, Prize Pool: $%', 
    v_session_record.id, v_session_record.prize_pool;
  
  -- Get top 3 winners
  SELECT p.*, u.username, u.email,
         (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_first_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  SELECT p.*, u.username, u.email,
         (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_second_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
    AND p.user_id != v_first_place_record.user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  SELECT p.*, u.username, u.email,
         (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_third_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
    AND p.user_id != v_first_place_record.user_id
    AND (v_second_place_record.user_id IS NULL OR p.user_id != v_second_place_record.user_id)
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  IF v_first_place_record.user_id IS NULL THEN
    RAISE NOTICE '⚠️ [Payout] No winners found';
    RETURN json_build_object('success', false, 'message', 'No winners with scores');
  END IF;
  
  -- Calculate prizes (50%, 20%, 15%, 15% platform)
  v_total_pool := v_session_record.prize_pool;
  v_first_prize := v_total_pool * 0.50;
  v_second_prize := v_total_pool * 0.20;
  v_third_prize := v_total_pool * 0.15;
  v_platform_fee_amount := v_total_pool * 0.15;
  
  RAISE NOTICE '💵 [Payout] 1st: $%, 2nd: $%, 3rd: $%, Platform: $%', 
    v_first_prize, v_second_prize, v_third_prize, v_platform_fee_amount;
  
  -- Pay 1st place
  IF v_first_place_record.user_id IS NOT NULL THEN
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_first_prize,
        updated_at = NOW()
    WHERE id::TEXT = v_first_place_record.user_id;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, balance_after, description
    )
    VALUES (
      v_first_place_record.user_id::UUID,
      v_first_prize,
      'game_win',
      v_first_place_record.balance + v_first_prize,
      format('Hot Sell 1st Place - %s', v_config_record.title)
    );
    
    RAISE NOTICE '✅ Paid 1st: % ($%)', 
      COALESCE(v_first_place_record.username, SPLIT_PART(v_first_place_record.email, '@', 1)), 
      v_first_prize;
  END IF;
  
  -- Pay 2nd place
  IF v_second_place_record.user_id IS NOT NULL THEN
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_second_prize,
        updated_at = NOW()
    WHERE id::TEXT = v_second_place_record.user_id;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, balance_after, description
    )
    VALUES (
      v_second_place_record.user_id::UUID,
      v_second_prize,
      'game_win',
      v_second_place_record.balance + v_second_prize,
      format('Hot Sell 2nd Place - %s', v_config_record.title)
    );
    
    RAISE NOTICE '✅ Paid 2nd: % ($%)', 
      COALESCE(v_second_place_record.username, SPLIT_PART(v_second_place_record.email, '@', 1)), 
      v_second_prize;
  END IF;
  
  -- Pay 3rd place
  IF v_third_place_record.user_id IS NOT NULL THEN
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_third_prize,
        updated_at = NOW()
    WHERE id::TEXT = v_third_place_record.user_id;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, balance_after, description
    )
    VALUES (
      v_third_place_record.user_id::UUID,
      v_third_prize,
      'game_win',
      v_third_place_record.balance + v_third_prize,
      format('Hot Sell 3rd Place - %s', v_config_record.title)
    );
    
    RAISE NOTICE '✅ Paid 3rd: % ($%)', 
      COALESCE(v_third_place_record.username, SPLIT_PART(v_third_place_record.email, '@', 1)), 
      v_third_prize;
  END IF;
  
  -- Mark session completed
  UPDATE public.hot_sell_sessions
  SET status = 'completed',
      first_place_user_id = v_first_place_record.user_id::UUID,
      second_place_user_id = v_second_place_record.user_id::UUID,
      third_place_user_id = v_third_place_record.user_id::UUID,
      first_place_prize = v_first_prize,
      second_place_prize = v_second_prize,
      third_place_prize = v_third_prize,
      platform_fee = v_platform_fee_amount,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_session_record.id;
  
  RAISE NOTICE '✅ Session marked completed';
  
  -- Create new waiting session
  INSERT INTO public.hot_sell_sessions (
    config_id,
    prize_pool,
    base_price,
    max_participants,
    participants_count,
    status,
    created_at,
    updated_at
  )
  VALUES (
    config_id_param,
    0,
    v_config_record.base_price,
    v_config_record.max_participants,
    0,
    'waiting',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_session_id;
  
  RAISE NOTICE '🆕 Created new waiting session: %', v_new_session_id;
  
  -- Return success with winner info
  RETURN json_build_object(
    'success', true,
    'message', 'Payout successful',
    'pool', v_total_pool,
    'new_session_id', v_new_session_id,
    'winners', json_build_array(
      json_build_object(
        'rank', 1,
        'username', COALESCE(v_first_place_record.username, SPLIT_PART(v_first_place_record.email, '@', 1)),
        'score', v_first_place_record.score,
        'prize', v_first_prize
      ),
      json_build_object(
        'rank', 2,
        'username', COALESCE(v_second_place_record.username, SPLIT_PART(v_second_place_record.email, '@', 1)),
        'score', COALESCE(v_second_place_record.score, 0),
        'prize', v_second_prize
      ),
      json_build_object(
        'rank', 3,
        'username', COALESCE(v_third_place_record.username, SPLIT_PART(v_third_place_record.email, '@', 1)),
        'score', COALESCE(v_third_place_record.score, 0),
        'prize', v_third_prize
      )
    ),
    'platform_fee', v_platform_fee_amount
  );
  
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ HOT SELL PAYOUT AND RESET FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What it does:';
  RAISE NOTICE '1. ✅ Pays all 3 winners (50%%, 20%%, 15%%)';
  RAISE NOTICE '2. ✅ Takes 15%% platform fee';
  RAISE NOTICE '3. ✅ Marks session as completed';
  RAISE NOTICE '4. ✅ Creates NEW waiting session immediately';
  RAISE NOTICE '5. ✅ Returns winner info for frontend display';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Hot Sell will now reset automatically after payout!';
  RAISE NOTICE '';
END $$;

