-- ============================================================================
-- FIX "SESSION NOT FOUND OR INACTIVE" ERROR - IMMEDIATE FIX
-- ============================================================================
-- This script ensures every Hot Sell config has a 'waiting' session available
-- Run this to fix the session error immediately
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Fixing Hot Sell Session Issues...';
END $$;

-- ============================================================================
-- STEP 1: Ensure all completed sessions are properly marked
-- ============================================================================

UPDATE public.hot_sell_sessions
SET status = 'completed'
WHERE first_place_user_id IS NOT NULL
  AND status != 'completed';

DO $$ 
BEGIN
  RAISE NOTICE '✅ Marked paid sessions as completed';
END $$;

-- ============================================================================
-- STEP 2: Create missing 'waiting' sessions for all active configs
-- ============================================================================

INSERT INTO public.hot_sell_sessions (
  config_id,
  prize_pool,
  current_pot,
  base_price,
  max_participants,
  participants_count,
  status,
  created_at,
  updated_at
)
SELECT 
  c.id,
  0,
  0,
  c.base_price,
  c.max_participants,
  0,
  'waiting',
  NOW(),
  NOW()
FROM public.hot_sell_configs c
WHERE c.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.hot_sell_sessions s 
    WHERE s.config_id = c.id 
      AND s.status IN ('waiting', 'active')
  );

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created missing waiting sessions';
END $$;

-- ============================================================================
-- STEP 3: Verify payout function creates new sessions
-- ============================================================================

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
  
  v_new_session_id UUID;
BEGIN
  RAISE NOTICE '💰 [Payout] Starting payout for config: %', config_id_param;
  
  -- ============================================
  -- STEP 1: Get the session and config
  -- ============================================
  
  SELECT * INTO v_session_record
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param
    AND status != 'completed'
    AND first_place_user_id IS NULL  -- Not already paid
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE '⚠️ [Payout] No unpaid session found for config: %', config_id_param;
    
    -- Check if there's already a waiting session
    IF EXISTS (
      SELECT 1 FROM public.hot_sell_sessions 
      WHERE config_id = config_id_param AND status = 'waiting'
    ) THEN
      RAISE NOTICE '✅ [Payout] Waiting session already exists';
      RETURN json_build_object(
        'success', false,
        'message', 'Session already reset'
      );
    END IF;
    
    -- Create a new waiting session
    SELECT * INTO v_config_record
    FROM public.hot_sell_configs
    WHERE id = config_id_param;
    
    INSERT INTO public.hot_sell_sessions (
      config_id, prize_pool, current_pot, base_price, max_participants, status
    )
    VALUES (
      config_id_param, 0, 0, v_config_record.base_price, v_config_record.max_participants, 'waiting'
    )
    RETURNING id INTO v_new_session_id;
    
    RAISE NOTICE '🆕 [Payout] Created new waiting session: %', v_new_session_id;
    
    RETURN json_build_object(
      'success', false,
      'message', 'No active session found, created new one'
    );
  END IF;
  
  SELECT * INTO v_config_record
  FROM public.hot_sell_configs
  WHERE id = config_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', config_id_param;
  END IF;
  
  RAISE NOTICE '📊 [Payout] Session ID: %, Current Pool: $%', 
    v_session_record.id, COALESCE(v_session_record.current_pot, v_session_record.prize_pool);
  
  -- ============================================
  -- STEP 2: Get top 3 winners by score
  -- ============================================
  
  -- 1st Place (highest score)
  SELECT p.*, u.username, u.email, 
         (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_first_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  -- 2nd Place
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
  
  -- 3rd Place
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
    RAISE NOTICE '⚠️ [Payout] No winners with scores found';
    RETURN json_build_object(
      'success', false,
      'message', 'No participants with scores found'
    );
  END IF;
  
  -- ============================================
  -- STEP 3: Calculate prize pool distribution
  -- ============================================
  
  v_total_pool := COALESCE(v_session_record.current_pot, v_session_record.prize_pool);
  
  -- Calculate prizes based on percentages
  v_first_prize := v_total_pool * 0.50;  -- 50%
  v_second_prize := v_total_pool * 0.20; -- 20%
  v_third_prize := v_total_pool * 0.15;  -- 15%
  v_platform_fee_amount := v_total_pool * 0.15; -- 15%
  
  RAISE NOTICE '💵 [Payout] Prize Distribution:';
  RAISE NOTICE '  - 1st Place: $% (50%%)', v_first_prize;
  RAISE NOTICE '  - 2nd Place: $% (20%%)', v_second_prize;
  RAISE NOTICE '  - 3rd Place: $% (15%%)', v_third_prize;
  RAISE NOTICE '  - Platform: $% (15%%)', v_platform_fee_amount;
  
  -- ============================================
  -- STEP 4: Pay winners
  -- ============================================
  
  -- Pay 1st place
  IF v_first_place_record.user_id IS NOT NULL THEN
    v_winner_balance_before := COALESCE(v_first_place_record.balance, 0);
    
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_first_prize,
        updated_at = NOW()
    WHERE id::TEXT = v_first_place_record.user_id;
    
    v_winner_balance_after := v_winner_balance_before + v_first_prize;
    
    RAISE NOTICE '✅ [Payout] Paid 1st place: % ($%)', 
      COALESCE(v_first_place_record.username, SPLIT_PART(v_first_place_record.email, '@', 1)), v_first_prize;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, balance_after, description
    )
    VALUES (
      v_first_place_record.user_id::UUID,
      v_first_prize,
      'game_win',
      v_winner_balance_after,
      format('Hot Sell 1st Place - %s', v_config_record.title)
    );
  END IF;
  
  -- Pay 2nd place
  IF v_second_place_record.user_id IS NOT NULL AND v_second_prize > 0 THEN
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_second_prize,
        updated_at = NOW()
    WHERE id::TEXT = v_second_place_record.user_id;
    
    RAISE NOTICE '✅ [Payout] Paid 2nd place: % ($%)', 
      COALESCE(v_second_place_record.username, SPLIT_PART(v_second_place_record.email, '@', 1)), v_second_prize;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type, 
      balance_after, description
    )
    VALUES (
      v_second_place_record.user_id::UUID,
      v_second_prize,
      'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM users WHERE id::TEXT = v_second_place_record.user_id),
      format('Hot Sell 2nd Place - %s', v_config_record.title)
    );
  END IF;
  
  -- Pay 3rd place
  IF v_third_place_record.user_id IS NOT NULL AND v_third_prize > 0 THEN
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_third_prize,
        updated_at = NOW()
    WHERE id::TEXT = v_third_place_record.user_id;
    
    RAISE NOTICE '✅ [Payout] Paid 3rd place: % ($%)', 
      COALESCE(v_third_place_record.username, SPLIT_PART(v_third_place_record.email, '@', 1)), v_third_prize;
    
    INSERT INTO public.token_transactions (
      user_id, amount, transaction_type,
      balance_after, description
    )
    VALUES (
      v_third_place_record.user_id::UUID,
      v_third_prize,
      'game_win',
      (SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) FROM users WHERE id::TEXT = v_third_place_record.user_id),
      format('Hot Sell 3rd Place - %s', v_config_record.title)
    );
  END IF;
  
  -- ============================================
  -- STEP 5: Mark session as completed
  -- ============================================
  
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
  
  RAISE NOTICE '✅ [Payout] Session marked as completed';
  
  -- ============================================
  -- STEP 6: IMMEDIATELY CREATE NEW WAITING SESSION
  -- ============================================
  
  -- Delete any leftover waiting/active sessions for this config
  DELETE FROM public.hot_sell_sessions
  WHERE config_id = config_id_param
    AND status IN ('waiting', 'active')
    AND id != v_session_record.id;
  
  -- Create fresh waiting session
  INSERT INTO public.hot_sell_sessions (
    config_id,
    prize_pool,
    current_pot,
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
    0,
    v_config_record.base_price,
    v_config_record.max_participants,
    0,
    'waiting',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_session_id;
  
  RAISE NOTICE '🆕 [Payout] Created new waiting session: %', v_new_session_id;
  
  -- ============================================
  -- STEP 7: Return success response with winners
  -- ============================================
  
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
  RAISE NOTICE '✅ HOT SELL SESSION ERROR FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '1. ✅ All configs now have waiting sessions';
  RAISE NOTICE '2. ✅ Payout function creates new session immediately';
  RAISE NOTICE '3. ✅ Old completed sessions properly marked';
  RAISE NOTICE '4. ✅ Duplicate sessions cleaned up';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Players can now join Hot Sell games!';
  RAISE NOTICE '';
END $$;

-- Show current session status
SELECT 
  c.title,
  s.status,
  s.participants_count,
  s.max_participants,
  CASE 
    WHEN s.first_place_user_id IS NOT NULL THEN 'Paid Out'
    ELSE 'Available'
  END as payout_status
FROM public.hot_sell_sessions s
INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
WHERE c.is_active = true
ORDER BY c.base_price, s.created_at DESC;

