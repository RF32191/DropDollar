-- ============================================================================
-- FIX BLADE BOUNCE CLIENT-SIDE ERROR IN HOT SELL
-- ============================================================================
-- This fixes common issues that cause client-side errors for Blade Bounce
-- ============================================================================

-- Step 1: Ensure Blade Bounce configs exist with correct data types
-- ============================================================================

INSERT INTO public.hot_sell_configs (
  id, 
  game_type, 
  title, 
  description, 
  entry_fee, 
  base_price, 
  max_participants, 
  game_duration, 
  rng_seed,
  first_place_percent,
  second_place_percent,
  third_place_percent,
  platform_fee_percent,
  created_at,
  updated_at
) VALUES
('hs-3-blade-bounce', 'blade_bounce', '$3 Blade Bounce', 'Mouse Control • 3 Players', 1, 3, 3, 30, 200, 50, 20, 15, 15, NOW(), NOW()),
('hs-5-blade-bounce', 'blade_bounce', '$5 Blade Bounce', 'Mouse Control • 5 Players', 1, 5, 5, 30, 201, 50, 20, 15, 15, NOW(), NOW()),
('hs-25-blade-bounce', 'blade_bounce', '$25 Blade Bounce', 'Mouse Control • 25 Players', 1, 25, 25, 30, 202, 50, 20, 15, 15, NOW(), NOW()),
('hs-100-blade-bounce', 'blade_bounce', '$100 Blade Bounce', 'Mouse Control • 100 Players', 1, 100, 100, 30, 203, 50, 20, 15, 15, NOW(), NOW()),
('hs-500-blade-bounce', 'blade_bounce', '$500 Blade Bounce', 'Mouse Control • 500 Players', 1, 500, 500, 30, 204, 50, 20, 15, 15, NOW(), NOW()),
('hs-10000-blade-bounce', 'blade_bounce', '$10000 Blade Bounce', 'Mouse Control • 10K Players', 1, 10000, 10000, 30, 205, 50, 20, 15, 15, NOW(), NOW()),
('hs-25000-blade-bounce', 'blade_bounce', '$25000 Blade Bounce', 'Mouse Control • 25K Players', 1, 25000, 25000, 30, 206, 50, 20, 15, 15, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  game_type = EXCLUDED.game_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  entry_fee = EXCLUDED.entry_fee,
  base_price = EXCLUDED.base_price,
  max_participants = EXCLUDED.max_participants,
  game_duration = EXCLUDED.game_duration,
  rng_seed = EXCLUDED.rng_seed,
  first_place_percent = EXCLUDED.first_place_percent,
  second_place_percent = EXCLUDED.second_place_percent,
  third_place_percent = EXCLUDED.third_place_percent,
  platform_fee_percent = EXCLUDED.platform_fee_percent,
  updated_at = NOW();

-- Step 2: Ensure all Blade Bounce configs have waiting sessions
-- ============================================================================

INSERT INTO public.hot_sell_sessions (
  config_id,
  current_pool,
  base_price,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  c.id,
  0,
  c.base_price,
  c.max_participants,
  'waiting',
  NOW(),
  NOW()
FROM public.hot_sell_configs c
WHERE c.game_type = 'blade_bounce'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.hot_sell_sessions s 
    WHERE s.config_id = c.id 
      AND s.status = 'waiting'
  );

-- Step 3: Fix any NULL scores in Blade Bounce participants
-- ============================================================================

UPDATE public.hot_sell_participants p
SET score = 0,
    accuracy = 0
WHERE session_id IN (
    SELECT id FROM public.hot_sell_sessions WHERE config_id LIKE '%blade-bounce%'
  )
  AND (score IS NULL OR accuracy IS NULL);

-- Step 4: Re-create or update the payout function with better error handling
-- ============================================================================

DROP FUNCTION IF EXISTS process_hot_sell_payout_complete(TEXT) CASCADE;

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
  RAISE NOTICE '💰 [Payout] Starting payout for config: % (BLADE BOUNCE FIX)', config_id_param;
  
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
      'message', 'No active session found',
      'error', format('No active session found for config: %s', config_id_param)
    );
  END IF;
  
  SELECT * INTO v_config_record
  FROM public.hot_sell_configs
  WHERE id = config_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', config_id_param;
  END IF;
  
  RAISE NOTICE '📊 [Payout] Session ID: %, Current Pool: $%, Game: %', 
    v_session_record.id, v_session_record.current_pool, v_config_record.game_type;
  
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
    AND p.score >= 0  -- Allow 0 scores
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE '⚠️ [Payout] No first place winner found';
    RETURN json_build_object(
      'success', false,
      'message', 'No participants with scores found',
      'error', 'No first place winner found'
    );
  END IF;
  
  -- 2nd Place
  SELECT p.*, u.username, u.email, u.tokens as balance
  INTO v_second_place_record
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_record.id
    AND p.score IS NOT NULL
    AND p.score >= 0
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
    AND p.score >= 0
    AND p.user_id != v_first_place_record.user_id
    AND (v_second_place_record.user_id IS NULL OR p.user_id != v_second_place_record.user_id)
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;
  
  -- ============================================
  -- STEP 3: Calculate prize pool distribution
  -- ============================================
  
  v_total_pool := COALESCE(v_session_record.current_pool, v_config_record.base_price);
  
  -- Calculate prizes based on percentages from config
  v_first_prize := v_total_pool * COALESCE(v_config_record.first_place_percent, 50) / 100.0;
  v_second_prize := v_total_pool * COALESCE(v_config_record.second_place_percent, 20) / 100.0;
  v_third_prize := v_total_pool * COALESCE(v_config_record.third_place_percent, 15) / 100.0;
  v_platform_fee_amount := v_total_pool * COALESCE(v_config_record.platform_fee_percent, 15) / 100.0;
  
  -- Handle 2-player games (no 3rd place)
  IF v_config_record.max_participants = 2 OR v_third_place_record.user_id IS NULL THEN
    v_third_prize := 0;
  END IF;
  
  RAISE NOTICE '💵 [Payout] Prize Distribution:';
  RAISE NOTICE '  - 1st Place: $% (50%%)', v_first_prize;
  RAISE NOTICE '  - 2nd Place: $% (20%%)', v_second_prize;
  RAISE NOTICE '  - 3rd Place: $% (15%%)', v_third_prize;
  RAISE NOTICE '  - Platform: $% (15%%)', v_platform_fee_amount;
  
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
    
    -- Record transaction (with error handling)
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
    END;
    
    -- Record game history (with error handling)
    BEGIN
      INSERT INTO public.game_history (user_id, game_type, tournament_type, score, accuracy, tokens_won, rank, played_at)
      VALUES (
        v_first_place_record.user_id,
        v_config_record.game_type,
        'hot_sell',
        COALESCE(v_first_place_record.score, 0),
        COALESCE(v_first_place_record.accuracy, 0),
        v_first_prize,
        1,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not save to game_history: %', SQLERRM;
    END;
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
    
    BEGIN
      INSERT INTO public.token_transactions (user_id, amount, type, transaction_type, balance_before, balance_after, description)
      VALUES (
        v_second_place_record.user_id,
        v_second_prize,
        'game_win',
        'tournament_prize',
        (SELECT tokens - v_second_prize FROM public.users WHERE id = v_second_place_record.user_id),
        (SELECT tokens FROM public.users WHERE id = v_second_place_record.user_id),
        format('Hot Sell 2nd Place - %s', v_config_record.title)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
    END;
    
    BEGIN
      INSERT INTO public.game_history (user_id, game_type, tournament_type, score, accuracy, tokens_won, rank, played_at)
      VALUES (
        v_second_place_record.user_id,
        v_config_record.game_type,
        'hot_sell',
        COALESCE(v_second_place_record.score, 0),
        COALESCE(v_second_place_record.accuracy, 0),
        v_second_prize,
        2,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not save to game_history: %', SQLERRM;
    END;
  END IF;
  
  -- Pay 3rd place (if exists)
  IF v_third_place_record.user_id IS NOT NULL AND v_third_prize > 0 THEN
    UPDATE public.users
    SET tokens = tokens + v_third_prize,
        total_earned = COALESCE(total_earned, 0) + v_third_prize,
        updated_at = NOW()
    WHERE id = v_third_place_record.user_id;
    
    RAISE NOTICE '✅ [Payout] Paid 3rd place: % ($%)', 
      COALESCE(v_third_place_record.username, v_third_place_record.email), v_third_prize;
    
    BEGIN
      INSERT INTO public.token_transactions (user_id, amount, type, transaction_type, balance_before, balance_after, description)
      VALUES (
        v_third_place_record.user_id,
        v_third_prize,
        'game_win',
        'tournament_prize',
        (SELECT tokens - v_third_prize FROM public.users WHERE id = v_third_place_record.user_id),
        (SELECT tokens FROM public.users WHERE id = v_third_place_record.user_id),
        format('Hot Sell 3rd Place - %s', v_config_record.title)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
    END;
    
    BEGIN
      INSERT INTO public.game_history (user_id, game_type, tournament_type, score, accuracy, tokens_won, rank, played_at)
      VALUES (
        v_third_place_record.user_id,
        v_config_record.game_type,
        'hot_sell',
        COALESCE(v_third_place_record.score, 0),
        COALESCE(v_third_place_record.accuracy, 0),
        v_third_prize,
        3,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not save to game_history: %', SQLERRM;
    END;
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
  
  INSERT INTO public.hot_sell_sessions (config_id, current_pool, base_price, max_participants, status)
  VALUES (
    config_id_param,
    0,
    v_config_record.base_price,
    v_config_record.max_participants,
    'waiting'
  );
  
  RAISE NOTICE '🔄 [Payout] Created new waiting session for Blade Bounce';
  
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
        'username', COALESCE(v_first_place_record.username, SPLIT_PART(v_first_place_record.email, '@', 1), 'Player 1'),
        'score', COALESCE(v_first_place_record.score, 0),
        'prize', v_first_prize
      ),
      json_build_object(
        'rank', 2,
        'username', COALESCE(v_second_place_record.username, SPLIT_PART(COALESCE(v_second_place_record.email, ''), '@', 1), 'Player 2'),
        'score', COALESCE(v_second_place_record.score, 0),
        'prize', v_second_prize
      ),
      json_build_object(
        'rank', 3,
        'username', COALESCE(v_third_place_record.username, SPLIT_PART(COALESCE(v_third_place_record.email, ''), '@', 1), 'Player 3'),
        'score', COALESCE(v_third_place_record.score, 0),
        'prize', COALESCE(v_third_prize, 0)
      )
    ),
    'platform_fee', v_platform_fee_amount
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ [Payout] CRITICAL ERROR: %', SQLERRM;
  RETURN json_build_object(
    'success', false,
    'message', 'Payout failed',
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ BLADE BOUNCE CLIENT ERROR FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was fixed:';
  RAISE NOTICE '  1. ✅ Blade Bounce configs created/updated';
  RAISE NOTICE '  2. ✅ Waiting sessions ensured for all configs';
  RAISE NOTICE '  3. ✅ NULL scores fixed to 0';
  RAISE NOTICE '  4. ✅ Payout function updated with better error handling';
  RAISE NOTICE '  5. ✅ Allows 0 scores (not just NULL check)';
  RAISE NOTICE '  6. ✅ Better error messages for debugging';
  RAISE NOTICE '  7. ✅ Handles 2-player games (no 3rd place)';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Test by playing a Blade Bounce game in Hot Sell';
  RAISE NOTICE '';
END $$;

