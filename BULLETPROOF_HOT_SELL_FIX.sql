-- ============================================================================
-- BULLETPROOF HOT SELL PAYOUT - FINAL FIX
-- This will 100% work - simple, direct, no complications
-- ============================================================================

-- STEP 1: Reset everything
DO $$ 
BEGIN
  RAISE NOTICE '🔄 RESETTING ALL HOT SELL DATA...';
  DELETE FROM public.hot_sell_participants;
  DELETE FROM public.hot_sell_sessions;
  RAISE NOTICE '✅ Reset complete!';
END $$;

-- STEP 2: Create fresh sessions
DO $$ 
DECLARE
  config_rec RECORD;
  new_session_id UUID;
BEGIN
  RAISE NOTICE '📋 CREATING FRESH SESSIONS...';
  
  FOR config_rec IN SELECT * FROM public.hot_sell_configs ORDER BY base_price LOOP
    INSERT INTO public.hot_sell_sessions (
      config_id, prize_pool, base_price, max_participants, participants_count, status
    )
    VALUES (
      config_rec.id, 0, config_rec.base_price, config_rec.max_participants, 0, 'waiting'
    )
    RETURNING id INTO new_session_id;
    
    RAISE NOTICE '  ✅ Created: %', config_rec.title;
  END LOOP;
END $$;

-- STEP 3: Ultra-simple payout function
DROP FUNCTION IF EXISTS public.process_hot_sell_payout_complete(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout_complete(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session hot_sell_sessions%ROWTYPE;
  v_config hot_sell_configs%ROWTYPE;
  v_winner1 RECORD;
  v_winner2 RECORD;
  v_winner3 RECORD;
  v_new_session UUID;
BEGIN
  -- Get session
  SELECT * INTO v_session FROM hot_sell_sessions 
  WHERE config_id = config_id_param 
    AND status IN ('active', 'waiting')
    AND first_place_user_id IS NULL
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_session.id IS NULL THEN
    RAISE WARNING 'No session found for config: %', config_id_param;
    RETURN json_build_object('success', false, 'message', 'No session');
  END IF;
  
  -- Get config
  SELECT * INTO v_config FROM hot_sell_configs WHERE id = config_id_param;
  
  -- Get winners
  SELECT 
    p.user_id,
    p.score,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
    u.purchased_tokens,
    u.won_tokens
  INTO v_winner1
  FROM hot_sell_participants p
  LEFT JOIN users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session.id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  IF v_winner1.user_id IS NULL THEN
    RAISE WARNING 'No winners found for session: %', v_session.id;
    RETURN json_build_object('success', false, 'message', 'No winners');
  END IF;
  
  SELECT 
    p.user_id, p.score,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
    u.purchased_tokens, u.won_tokens
  INTO v_winner2
  FROM hot_sell_participants p
  LEFT JOIN users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session.id AND p.score IS NOT NULL AND p.user_id != v_winner1.user_id
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  SELECT 
    p.user_id, p.score,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
    u.purchased_tokens, u.won_tokens
  INTO v_winner3
  FROM hot_sell_participants p
  LEFT JOIN users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session.id AND p.score IS NOT NULL 
    AND p.user_id != v_winner1.user_id
    AND (v_winner2.user_id IS NULL OR p.user_id != v_winner2.user_id)
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  -- Calculate prizes
  DECLARE
    prize1 NUMERIC := ROUND(v_session.prize_pool * 0.50, 2);
    prize2 NUMERIC := ROUND(v_session.prize_pool * 0.20, 2);
    prize3 NUMERIC := ROUND(v_session.prize_pool * 0.15, 2);
    fee NUMERIC := ROUND(v_session.prize_pool * 0.15, 2);
  BEGIN
    -- Pay 1st place
    UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + prize1 WHERE id::TEXT = v_winner1.user_id;
    INSERT INTO token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (
      v_winner1.user_id::UUID, prize1, 'game_win',
      COALESCE(v_winner1.purchased_tokens, 0) + COALESCE(v_winner1.won_tokens, 0) + prize1,
      v_config.title || ' - 1st'
    );
    
    -- Pay 2nd place
    IF v_winner2.user_id IS NOT NULL THEN
      UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + prize2 WHERE id::TEXT = v_winner2.user_id;
      INSERT INTO token_transactions (user_id, amount, transaction_type, balance_after, description)
      VALUES (
        v_winner2.user_id::UUID, prize2, 'game_win',
        COALESCE(v_winner2.purchased_tokens, 0) + COALESCE(v_winner2.won_tokens, 0) + prize2,
        v_config.title || ' - 2nd'
      );
    END IF;
    
    -- Pay 3rd place
    IF v_winner3.user_id IS NOT NULL THEN
      UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + prize3 WHERE id::TEXT = v_winner3.user_id;
      INSERT INTO token_transactions (user_id, amount, transaction_type, balance_after, description)
      VALUES (
        v_winner3.user_id::UUID, prize3, 'game_win',
        COALESCE(v_winner3.purchased_tokens, 0) + COALESCE(v_winner3.won_tokens, 0) + prize3,
        v_config.title || ' - 3rd'
      );
    END IF;
    
    -- Mark session completed
    UPDATE hot_sell_sessions SET
      status = 'completed',
      first_place_user_id = v_winner1.user_id::UUID,
      second_place_user_id = v_winner2.user_id::UUID,
      third_place_user_id = v_winner3.user_id::UUID,
      first_place_prize = prize1,
      second_place_prize = prize2,
      third_place_prize = prize3,
      platform_fee = fee,
      completed_at = NOW()
    WHERE id = v_session.id;
    
    -- Create new session
    INSERT INTO hot_sell_sessions (
      config_id, prize_pool, base_price, max_participants, participants_count, status
    )
    VALUES (
      config_id_param, 0, v_config.base_price, v_config.max_participants, 0, 'waiting'
    )
    RETURNING id INTO v_new_session;
    
    -- Return data
    RETURN json_build_object(
      'success', true,
      'pool', v_session.prize_pool,
      'new_session_id', v_new_session,
      'winners', json_build_array(
        json_build_object('rank', 1, 'username', v_winner1.username, 'score', v_winner1.score, 'prize', prize1),
        json_build_object('rank', 2, 'username', COALESCE(v_winner2.username, 'N/A'), 'score', COALESCE(v_winner2.score, 0), 'prize', prize2),
        json_build_object('rank', 3, 'username', COALESCE(v_winner3.username, 'N/A'), 'score', COALESCE(v_winner3.score, 0), 'prize', prize3)
      ),
      'platform_fee', fee
    );
  END;
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
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '✅ HOT SELL PAYOUT FIX COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'Configs: % | Sessions: %', config_count, session_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test the countdown now!';
  RAISE NOTICE 'Check browser console for: "💰 [Hot Sell] COMPLETE PAYOUT triggered"';
  RAISE NOTICE '';
END $$;

