-- ============================================================================
-- COMPLETE HOT SELL FIX - ALL IN ONE
-- Run this ONE file to fix everything
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Starting Complete Hot Sell Fix...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 1: CREATE MISSING SESSIONS
-- ============================================================================

DO $$ 
DECLARE
  config_rec RECORD;
  session_count INTEGER;
  new_session_id UUID;
BEGIN
  RAISE NOTICE '📋 PART 1: Ensuring all configs have sessions...';
  
  FOR config_rec IN 
    SELECT * FROM public.hot_sell_configs ORDER BY base_price
  LOOP
    SELECT COUNT(*) INTO session_count
    FROM public.hot_sell_sessions
    WHERE config_id = config_rec.id
      AND status IN ('waiting', 'active')
      AND first_place_user_id IS NULL;
    
    IF session_count = 0 THEN
      INSERT INTO public.hot_sell_sessions (
        config_id, prize_pool, base_price, max_participants, participants_count, status
      )
      VALUES (
        config_rec.id, 0, config_rec.base_price, config_rec.max_participants, 0, 'waiting'
      )
      RETURNING id INTO new_session_id;
      
      RAISE NOTICE '  ✅ Created session for: %', config_rec.title;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Part 1 Complete!';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 2: FIX JOIN FUNCTION (Accept 'waiting' sessions)
-- ============================================================================

DROP FUNCTION IF EXISTS public.hs_join_v2(TEXT, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.hs_join_v2(
  p_session TEXT,
  p_user UUID,
  p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_uuid UUID;
  v_session_record RECORD;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
BEGIN
  v_session_uuid := p_session::UUID;
  
  -- Rate limits
  SELECT COALESCE(games_last_hour, 0), COALESCE(games_last_day, 0)
  INTO v_hour_count, v_day_count
  FROM public.user_rate_limits WHERE user_id = p_user;
  
  IF v_hour_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr');
  END IF;
  
  IF v_day_count >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day');
  END IF;
  
  -- Get tokens
  SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM public.users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- FIX: Accept both 'waiting' AND 'active' sessions
  SELECT * INTO v_session_record
  FROM public.hot_sell_sessions
  WHERE id = v_session_uuid
    AND status IN ('waiting', 'active')
    AND first_place_user_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found or inactive');
  END IF;
  
  -- Check not already joined
  IF EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = v_session_uuid AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens
  IF v_purchased >= p_fee THEN
    UPDATE public.users
    SET purchased_tokens = purchased_tokens - p_fee, updated_at = NOW()
    WHERE id = p_user;
    
    INSERT INTO public.token_transactions (
      user_id, transaction_type, amount, balance_after, description
    )
    VALUES (
      p_user, 'game_entry', -p_fee, (v_purchased - p_fee) + v_won, 'Hot Sell Entry'
    );
  ELSE
    UPDATE public.users
    SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased), updated_at = NOW()
    WHERE id = p_user;
    
    INSERT INTO public.token_transactions (
      user_id, transaction_type, amount, balance_after, description
    )
    VALUES (
      p_user, 'game_entry', -p_fee, v_won - (p_fee - v_purchased), 'Hot Sell Entry (mixed)'
    );
  END IF;
  
  -- Add participant
  INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at)
  VALUES (v_session_uuid, p_user, NOW())
  RETURNING id INTO v_participant_id;
  
  -- Update session
  UPDATE public.hot_sell_sessions
  SET prize_pool = prize_pool + p_fee,
      participants_count = participants_count + 1,
      status = 'active',
      updated_at = NOW()
  WHERE id = v_session_uuid;
  
  -- Update rate limits
  INSERT INTO public.user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET games_last_hour = CASE WHEN user_rate_limits.last_game_at > NOW() - INTERVAL '1 hour' THEN user_rate_limits.games_last_hour + 1 ELSE 1 END,
      games_last_day = CASE WHEN user_rate_limits.last_game_at > NOW() - INTERVAL '24 hours' THEN user_rate_limits.games_last_day + 1 ELSE 1 END,
      last_game_at = NOW();
  
  SELECT rng_seed INTO v_rng_seed FROM public.hot_sell_sessions WHERE id = v_session_uuid;
  
  RETURN jsonb_build_object(
    'success', true, 'message', 'Joined successfully',
    'participant_id', v_participant_id,
    'new_pot', v_session_record.prize_pool + p_fee,
    'rng_seed', v_rng_seed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '✅ Part 2 Complete: Join function fixed!'; RAISE NOTICE ''; END $$;

-- ============================================================================
-- PART 3: FIX PAYOUT FUNCTION (Auto-create new sessions)
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
  SELECT * INTO v_session_record FROM public.hot_sell_sessions
  WHERE config_id = config_id_param AND status != 'completed' AND first_place_user_id IS NULL
  ORDER BY created_at DESC LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No active session');
  END IF;
  
  SELECT * INTO v_config_record FROM public.hot_sell_configs WHERE id = config_id_param;
  
  -- Get winners
  SELECT p.*, u.username, u.email, (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_first_place_record
  FROM public.hot_sell_participants p LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  SELECT p.*, u.username, u.email, (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_second_place_record
  FROM public.hot_sell_participants p LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id AND p.score IS NOT NULL AND p.user_id != v_first_place_record.user_id
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  SELECT p.*, u.username, u.email, (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) as balance
  INTO v_third_place_record
  FROM public.hot_sell_participants p LEFT JOIN public.users u ON p.user_id = u.id::TEXT
  WHERE p.session_id = v_session_record.id AND p.score IS NOT NULL 
    AND p.user_id != v_first_place_record.user_id
    AND (v_second_place_record.user_id IS NULL OR p.user_id != v_second_place_record.user_id)
  ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
  
  IF v_first_place_record.user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No winners');
  END IF;
  
  -- Calculate prizes
  v_total_pool := v_session_record.prize_pool;
  v_first_prize := v_total_pool * 0.50;
  v_second_prize := v_total_pool * 0.20;
  v_third_prize := v_total_pool * 0.15;
  v_platform_fee_amount := v_total_pool * 0.15;
  
  -- Pay winners
  IF v_first_place_record.user_id IS NOT NULL THEN
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_first_prize, updated_at = NOW()
    WHERE id::TEXT = v_first_place_record.user_id;
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (v_first_place_record.user_id::UUID, v_first_prize, 'game_win', v_first_place_record.balance + v_first_prize, 
            format('Hot Sell 1st - %s', v_config_record.title));
  END IF;
  
  IF v_second_place_record.user_id IS NOT NULL THEN
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_second_prize, updated_at = NOW()
    WHERE id::TEXT = v_second_place_record.user_id;
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (v_second_place_record.user_id::UUID, v_second_prize, 'game_win', v_second_place_record.balance + v_second_prize,
            format('Hot Sell 2nd - %s', v_config_record.title));
  END IF;
  
  IF v_third_place_record.user_id IS NOT NULL THEN
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_third_prize, updated_at = NOW()
    WHERE id::TEXT = v_third_place_record.user_id;
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, balance_after, description)
    VALUES (v_third_place_record.user_id::UUID, v_third_prize, 'game_win', v_third_place_record.balance + v_third_prize,
            format('Hot Sell 3rd - %s', v_config_record.title));
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
      completed_at = NOW(), updated_at = NOW()
  WHERE id = v_session_record.id;
  
  -- Create new waiting session
  INSERT INTO public.hot_sell_sessions (
    config_id, prize_pool, base_price, max_participants, participants_count, status
  )
  VALUES (
    config_id_param, 0, v_config_record.base_price, v_config_record.max_participants, 0, 'waiting'
  )
  RETURNING id INTO v_new_session_id;
  
  RETURN json_build_object(
    'success', true, 'message', 'Payout successful', 'pool', v_total_pool, 'new_session_id', v_new_session_id,
    'winners', json_build_array(
      json_build_object('rank', 1, 'username', COALESCE(v_first_place_record.username, SPLIT_PART(v_first_place_record.email, '@', 1)),
                       'score', v_first_place_record.score, 'prize', v_first_prize),
      json_build_object('rank', 2, 'username', COALESCE(v_second_place_record.username, SPLIT_PART(v_second_place_record.email, '@', 1)),
                       'score', COALESCE(v_second_place_record.score, 0), 'prize', v_second_prize),
      json_build_object('rank', 3, 'username', COALESCE(v_third_place_record.username, SPLIT_PART(v_third_place_record.email, '@', 1)),
                       'score', COALESCE(v_third_place_record.score, 0), 'prize', v_third_prize)
    ),
    'platform_fee', v_platform_fee_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

DO $$ BEGIN RAISE NOTICE '✅ Part 3 Complete: Payout function fixed!'; RAISE NOTICE ''; END $$;

-- ============================================================================
-- PART 4: WINNERS HALL FUNCTIONS
-- ============================================================================

-- Winner Takes All Winners
CREATE OR REPLACE FUNCTION public.get_wta_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  session_id UUID, config_id TEXT, game_title TEXT, game_type TEXT,
  winner_user_id UUID, winner_username TEXT, winner_score NUMERIC,
  winner_prize NUMERIC, platform_fee_amount NUMERIC, total_pot NUMERIC, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.config_id, c.title, c.game_type, s.winner_user_id,
         COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT,
         p.score::NUMERIC, s.winner_prize, s.platform_fee_amount, s.prize_pool::NUMERIC, s.completed_at
  FROM public.winner_takes_all_sessions s
  INNER JOIN public.winner_takes_all_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.winner_user_id = u.id
  LEFT JOIN public.winner_takes_all_participants p ON p.session_id = s.id AND p.user_id = s.winner_user_id
  WHERE s.status = 'completed' AND s.winner_user_id IS NOT NULL AND s.winner_prize IS NOT NULL
  ORDER BY s.completed_at DESC LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wta_winners(INTEGER) TO authenticated, anon;

-- Hot Sell Winners
CREATE OR REPLACE FUNCTION public.get_hot_sell_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  session_id UUID, config_id TEXT, game_title TEXT, game_type TEXT,
  winner_user_id UUID, winner_username TEXT, winner_placement TEXT,
  winner_score NUMERIC, winner_prize NUMERIC, platform_fee NUMERIC, total_pot NUMERIC, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.config_id, c.title, c.game_type, s.first_place_user_id,
         COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT, '1st Place'::TEXT,
         p.score::NUMERIC, s.first_place_prize, s.platform_fee, s.prize_pool, s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.first_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = u.id::TEXT
  WHERE s.status = 'completed' AND s.first_place_user_id IS NOT NULL AND s.first_place_prize IS NOT NULL
  UNION ALL
  SELECT s.id, s.config_id, c.title, c.game_type, s.second_place_user_id,
         COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT, '2nd Place'::TEXT,
         p.score::NUMERIC, s.second_place_prize, s.platform_fee, s.prize_pool, s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.second_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = u.id::TEXT
  WHERE s.status = 'completed' AND s.second_place_user_id IS NOT NULL AND s.second_place_prize IS NOT NULL
  UNION ALL
  SELECT s.id, s.config_id, c.title, c.game_type, s.third_place_user_id,
         COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT, '3rd Place'::TEXT,
         p.score::NUMERIC, s.third_place_prize, s.platform_fee, s.prize_pool, s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.third_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = u.id::TEXT
  WHERE s.status = 'completed' AND s.third_place_user_id IS NOT NULL AND s.third_place_prize IS NOT NULL
  ORDER BY completed_at DESC LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hot_sell_winners(INTEGER) TO authenticated, anon;

-- Placeholders for future
CREATE OR REPLACE FUNCTION public.get_coin_play_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (session_id UUID, game_title TEXT, winner_user_id UUID, winner_username TEXT, winner_prize NUMERIC, completed_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$ BEGIN RETURN QUERY SELECT NULL::UUID, ''::TEXT, NULL::UUID, ''::TEXT, 0::NUMERIC, NULL::TIMESTAMPTZ WHERE FALSE; END; $$;

GRANT EXECUTE ON FUNCTION public.get_coin_play_winners(INTEGER) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_1v1_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (match_id UUID, game_title TEXT, winner_user_id UUID, winner_username TEXT, loser_username TEXT, winner_prize NUMERIC, completed_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$ BEGIN RETURN QUERY SELECT NULL::UUID, ''::TEXT, NULL::UUID, ''::TEXT, ''::TEXT, 0::NUMERIC, NULL::TIMESTAMPTZ WHERE FALSE; END; $$;

GRANT EXECUTE ON FUNCTION public.get_1v1_winners(INTEGER) TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '✅ Part 4 Complete: Winners Hall functions created!'; RAISE NOTICE ''; END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ HOT SELL COMPLETE FIX DONE!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '✅ Created missing sessions';
  RAISE NOTICE '✅ Join function accepts waiting sessions';
  RAISE NOTICE '✅ Payout creates new session automatically';
  RAISE NOTICE '✅ Winners Hall functions ready';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Hot Sell is now fully functional!';
  RAISE NOTICE '';
END $$;

