-- =========================================================
-- HOT SELL PRIZE POOL PAYOUT FIX
-- =========================================================
-- This SQL updates the Hot Sell payout system to correctly calculate
-- prize pool distributions based on percentages:
-- - 1st Place: 50% of pool
-- - 2nd Place: 20% of pool
-- - 3rd Place: 15% of pool
-- - Platform Fee: 15% of pool
-- Total: 100% (no money left over)
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '🎯 Fixing Hot Sell Prize Pool Payout Calculations...';
END $$;

-- =========================================================
-- DROP OLD PAYOUT FUNCTIONS
-- =========================================================

DROP FUNCTION IF EXISTS process_hot_sell_payout(TEXT) CASCADE;
DROP FUNCTION IF EXISTS process_hot_sell_payout_complete(TEXT) CASCADE;

-- =========================================================
-- CREATE UPDATED PAYOUT FUNCTION
-- =========================================================

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
  
  v_winner_balance_before NUMERIC;
  v_winner_balance_after NUMERIC;
BEGIN
  RAISE NOTICE '💰 [Payout] Starting payout for config: %', config_id_param;
  
  -- ============================================
  -- STEP 1: Get the session and config
  -- ============================================
  
  SELECT * INTO v_session_record
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param
    AND status != 'completed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE '⚠️ [Payout] No active session found for config: %', config_id_param;
    RETURN json_build_object(
      'success', false,
      'message', 'No active session found'
    );
  END IF;
  
  SELECT * INTO v_config_record
  FROM public.hot_sell_configs
  WHERE id = config_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', config_id_param;
  END IF;
  
  RAISE NOTICE '📊 [Payout] Session ID: %, Current Pool: $%', 
    v_session_record.id, v_session_record.current_pot;
  
  -- ============================================
  -- STEP 2: Get top 3 winners by score
  -- ============================================
  
  -- 1st Place (highest score)
  SELECT p.*, u.username, u.email, u.tokens as balance
  INTO v_first_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  -- 2nd Place
  SELECT p.*, u.username, u.email, u.tokens as balance
  INTO v_second_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
    AND p.user_id != v_first_place_record.user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  -- 3rd Place
  SELECT p.*, u.username, u.email, u.tokens as balance
  INTO v_third_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
    AND p.user_id != v_first_place_record.user_id
    AND (v_second_place_record.user_id IS NULL OR p.user_id != v_second_place_record.user_id)
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE '⚠️ [Payout] No winners with scores found';
    RETURN json_build_object(
      'success', false,
      'message', 'No participants with scores found'
    );
  END IF;
  
  -- ============================================
  -- STEP 3: Calculate prize pool distribution
  -- ============================================
  
  v_total_pool := v_session_record.current_pot;
  
  -- Calculate prizes based on percentages from config
  -- Default: 1st=50%, 2nd=20%, 3rd=15%, Platform=15%
  v_first_prize := v_total_pool * COALESCE(v_config_record.first_place_percent, 50) / 100.0;
  v_second_prize := v_total_pool * COALESCE(v_config_record.second_place_percent, 20) / 100.0;
  v_third_prize := v_total_pool * COALESCE(v_config_record.third_place_percent, 15) / 100.0;
  v_platform_fee_amount := v_total_pool * COALESCE(v_config_record.platform_fee_percent, 15) / 100.0;
  
  RAISE NOTICE '💵 [Payout] Prize Distribution:';
  RAISE NOTICE '  - 1st Place: $% (50%%)', v_first_prize;
  RAISE NOTICE '  - 2nd Place: $% (20%%)', v_second_prize;
  RAISE NOTICE '  - 3rd Place: $% (15%%)', v_third_prize;
  RAISE NOTICE '  - Platform: $% (15%%)', v_platform_fee_amount;
  RAISE NOTICE '  - Total: $%', (v_first_prize + v_second_prize + v_third_prize + v_platform_fee_amount);
  
  -- ============================================
  -- STEP 4: Pay winners and update records
  -- ============================================
  
  -- Pay 1st place
  IF v_first_place_record.user_id IS NOT NULL THEN
    v_winner_balance_before := COALESCE(v_first_place_record.balance, 0);
    
    UPDATE public.users
    SET tokens = tokens + v_first_prize,
        total_earned = COALESCE(total_earned, 0) + v_first_prize,
        games_won = COALESCE(games_won, 0) + 1,
        updated_at = NOW()
    WHERE id = v_first_place_record.user_id;
    
    v_winner_balance_after := v_winner_balance_before + v_first_prize;
    
    RAISE NOTICE '✅ [Payout] Paid 1st place: % ($%)', 
      COALESCE(v_first_place_record.username, v_first_place_record.email), v_first_prize;
    
    -- Record transaction
    INSERT INTO public.token_transactions (user_id, amount, type, transaction_type, balance_before, balance_after, description)
    VALUES (
      v_first_place_record.user_id,
      v_first_prize,
      'game_win',
      'tournament_prize',
      v_winner_balance_before,
      v_winner_balance_after,
      format('Hot Sell 1st Place - %s', v_config_record.title)
    );
    
    -- Record game history
    INSERT INTO public.game_history (user_id, game_type, tournament_type, score, accuracy, tokens_won, rank, played_at)
    VALUES (
      v_first_place_record.user_id,
      v_config_record.game_type,
      'hot_sell',
      v_first_place_record.score,
      v_first_place_record.accuracy,
      v_first_prize,
      1,
      NOW()
    );
  END IF;
  
  -- Pay 2nd place
  IF v_second_place_record.user_id IS NOT NULL THEN
    UPDATE public.users
    SET tokens = tokens + v_second_prize,
        total_earned = COALESCE(total_earned, 0) + v_second_prize,
        updated_at = NOW()
    WHERE id = v_second_place_record.user_id;
    
    RAISE NOTICE '✅ [Payout] Paid 2nd place: % ($%)', 
      COALESCE(v_second_place_record.username, v_second_place_record.email), v_second_prize;
    
    INSERT INTO public.token_transactions (user_id, amount, type, transaction_type, balance_before, balance_after, description)
    VALUES (
      v_second_place_record.user_id,
      v_second_prize,
      'game_win',
      'tournament_prize',
      (SELECT tokens FROM public.users WHERE id = v_second_place_record.user_id) - v_second_prize,
      (SELECT tokens FROM public.users WHERE id = v_second_place_record.user_id),
      format('Hot Sell 2nd Place - %s', v_config_record.title)
    );
    
    INSERT INTO public.game_history (user_id, game_type, tournament_type, score, accuracy, tokens_won, rank, played_at)
    VALUES (
      v_second_place_record.user_id,
      v_config_record.game_type,
      'hot_sell',
      v_second_place_record.score,
      v_second_place_record.accuracy,
      v_second_prize,
      2,
      NOW()
    );
  END IF;
  
  -- Pay 3rd place
  IF v_third_place_record.user_id IS NOT NULL THEN
    UPDATE public.users
    SET tokens = tokens + v_third_prize,
        total_earned = COALESCE(total_earned, 0) + v_third_prize,
        updated_at = NOW()
    WHERE id = v_third_place_record.user_id;
    
    RAISE NOTICE '✅ [Payout] Paid 3rd place: % ($%)', 
      COALESCE(v_third_place_record.username, v_third_place_record.email), v_third_prize;
    
    INSERT INTO public.token_transactions (user_id, amount, type, transaction_type, balance_before, balance_after, description)
    VALUES (
      v_third_place_record.user_id,
      v_third_prize,
      'game_win',
      'tournament_prize',
      (SELECT tokens FROM public.users WHERE id = v_third_place_record.user_id) - v_third_prize,
      (SELECT tokens FROM public.users WHERE id = v_third_place_record.user_id),
      format('Hot Sell 3rd Place - %s', v_config_record.title)
    );
    
    INSERT INTO public.game_history (user_id, game_type, tournament_type, score, accuracy, tokens_won, rank, played_at)
    VALUES (
      v_third_place_record.user_id,
      v_config_record.game_type,
      'hot_sell',
      v_third_place_record.score,
      v_third_place_record.accuracy,
      v_third_prize,
      3,
      NOW()
    );
  END IF;
  
  -- ============================================
  -- STEP 5: Mark session as completed
  -- ============================================
  
  UPDATE public.hot_sell_sessions
  SET status = 'completed',
      first_place_user_id = v_first_place_record.user_id,
      second_place_user_id = v_second_place_record.user_id,
      third_place_user_id = v_third_place_record.user_id,
      first_place_prize = v_first_prize,
      second_place_prize = v_second_prize,
      third_place_prize = v_third_prize,
      platform_fee = v_platform_fee_amount,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_session_record.id;
  
  -- ============================================
  -- STEP 6: Create new waiting session
  -- ============================================
  
  INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
  VALUES (
    config_id_param,
    0,
    v_config_record.base_price,
    v_config_record.max_participants,
    'waiting'
  );
  
  RAISE NOTICE '🔄 [Payout] Created new waiting session';
  
  -- ============================================
  -- STEP 7: Return success response
  -- ============================================
  
  RETURN json_build_object(
    'success', true,
    'message', 'Payout successful',
    'pool', v_total_pool,
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

-- =========================================================
-- GRANT PERMISSIONS
-- =========================================================

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

-- =========================================================
-- COMPLETION MESSAGE
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Hot Sell Prize Pool Payout Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Prize Distribution:';
  RAISE NOTICE '  🥇 1st Place: 50%% of pool';
  RAISE NOTICE '  🥈 2nd Place: 20%% of pool';
  RAISE NOTICE '  🥉 3rd Place: 15%% of pool';
  RAISE NOTICE '  💼 Platform: 15%% of pool';
  RAISE NOTICE '  ─────────────────────';
  RAISE NOTICE '  ✅ Total:    100%%';
  RAISE NOTICE '';
  RAISE NOTICE '✨ All payouts now use percentage-based calculations';
  RAISE NOTICE '📊 Winners are determined by highest score';
  RAISE NOTICE '🔄 New session automatically created after payout';
  RAISE NOTICE '';
END $$;

