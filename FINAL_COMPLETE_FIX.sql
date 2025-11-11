-- ============================================================================
-- FINAL COMPLETE FIX - Based on working commit 4051cb7
-- Drops ALL old functions, creates clean ones matching frontend exactly
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING JOIN FUNCTIONS (every version)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '🔥 Dropping ALL existing join functions...';
  
  -- Drop all possible join function variations
  DROP FUNCTION IF EXISTS public.join_hot_sell_session CASCADE;
  DROP FUNCTION IF EXISTS public.join_hot_sell_session(TEXT, UUID, NUMERIC) CASCADE;
  DROP FUNCTION IF EXISTS public.join_hot_sell_session(UUID, UUID, NUMERIC) CASCADE;
  DROP FUNCTION IF EXISTS public.join_winner_takes_all_session CASCADE;
  DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) CASCADE;
  DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, NUMERIC) CASCADE;
  DROP FUNCTION IF EXISTS public.hs_join_v2 CASCADE;
  DROP FUNCTION IF EXISTS public.hs_join_v2(TEXT, UUID, NUMERIC) CASCADE;
  DROP FUNCTION IF EXISTS public.wta_join_v2 CASCADE;
  DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;
  
  RAISE NOTICE '✅ All old join functions dropped';
END $$;

-- ============================================================================
-- STEP 2: Ensure session_id columns can handle TEXT input
-- ============================================================================
DO $$
DECLARE
  v_hs_type TEXT;
  v_wta_type TEXT;
BEGIN
  RAISE NOTICE '🔍 Checking column types...';
  
  -- Check hot_sell_participants.session_id type
  SELECT data_type INTO v_hs_type
  FROM information_schema.columns
  WHERE table_name = 'hot_sell_participants' AND column_name = 'session_id';
  
  RAISE NOTICE '  hot_sell_participants.session_id: %', v_hs_type;
  
  -- Check winner_takes_all_participants.session_id type
  SELECT data_type INTO v_wta_type
  FROM information_schema.columns
  WHERE table_name = 'winner_takes_all_participants' AND column_name = 'session_id';
  
  RAISE NOTICE '  winner_takes_all_participants.session_id: %', v_wta_type;
  
  RAISE NOTICE '✅ Column type check complete';
END $$;

-- ============================================================================
-- STEP 3: CREATE FUNCTIONS MATCHING YOUR FRONTEND EXACTLY
-- ============================================================================

-- Function: hs_join_v2 (TEXT session, UUID user, NUMERIC fee)
-- This matches: supabase.rpc('hs_join_v2', { p_session, p_user, p_fee })
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
  v_session_id TEXT;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id TEXT;
  v_hour INT;
  v_day INT;
  v_rng INT;
  v_session_status TEXT;
  v_participants_count INT;
  v_max_participants INT;
BEGIN
  -- Ensure session_id is TEXT
  v_session_id := p_session::TEXT;
  
  RAISE NOTICE '🎮 hs_join_v2: session=%, user=%, fee=%', v_session_id, p_user, p_fee;
  
  -- Check if user is banned
  IF EXISTS(
    SELECT 1 FROM user_bans
    WHERE user_id = p_user
    AND (is_permanent = true OR (banned_until IS NOT NULL AND banned_until > NOW()))
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'User is banned');
  END IF;
  
  -- Rate limit check
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0)
  INTO v_hour, v_day
  FROM user_rate_limits
  WHERE user_id = p_user;
  
  IF v_hour >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
  END IF;
  
  IF v_day >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
  END IF;
  
  -- Get user tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check session exists and is active (using TEXT comparison)
  SELECT status, participants_count, max_participants
  INTO v_session_status, v_participants_count, v_max_participants
  FROM hot_sell_sessions
  WHERE id::TEXT = v_session_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  IF v_session_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is not active');
  END IF;
  
  IF v_participants_count >= v_max_participants THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is full');
  END IF;
  
  -- Check not already joined (using TEXT comparison)
  IF EXISTS(
    SELECT 1 FROM hot_sell_participants
    WHERE session_id::TEXT = v_session_id AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell entry');
  ELSE
    UPDATE users 
    SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell entry (mixed)');
  END IF;
  
  -- Get RNG seed (using TEXT comparison)
  SELECT rng_seed INTO v_rng FROM hot_sell_sessions WHERE id::TEXT = v_session_id;
  
  -- Create participant
  v_participant_id := gen_random_uuid()::TEXT;
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (
    v_participant_id::UUID,
    v_session_id::UUID,
    p_user,
    NOW()
  );
  
  -- Update session (using TEXT comparison)
  UPDATE hot_sell_sessions
  SET participants_count = participants_count + 1,
      prize_pool = prize_pool + p_fee
  WHERE id::TEXT = v_session_id;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET games_last_hour = user_rate_limits.games_last_hour + 1,
      games_last_day = user_rate_limits.games_last_day + 1,
      last_game_at = NOW();
  
  RAISE NOTICE '✅ Join successful: session=%, participant=%', v_session_id, v_participant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'participant_id', v_participant_id,
    'rng_seed', v_rng
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Function: wta_join_v2 (TEXT session, UUID user, NUMERIC fee)
CREATE OR REPLACE FUNCTION public.wta_join_v2(
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
  v_session_id TEXT;
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id TEXT;
  v_hour INT;
  v_day INT;
  v_rng INT;
  v_session_status TEXT;
  v_participants_count INT;
  v_max_participants INT;
BEGIN
  v_session_id := p_session::TEXT;
  
  RAISE NOTICE '🎮 wta_join_v2: session=%, user=%, fee=%', v_session_id, p_user, p_fee;
  
  -- Check if user is banned
  IF EXISTS(
    SELECT 1 FROM user_bans
    WHERE user_id = p_user
    AND (is_permanent = true OR (banned_until IS NOT NULL AND banned_until > NOW()))
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'User is banned');
  END IF;
  
  -- Rate limit check
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0)
  INTO v_hour, v_day
  FROM user_rate_limits
  WHERE user_id = p_user;
  
  IF v_hour >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
  END IF;
  
  IF v_day >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
  END IF;
  
  -- Get user tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check session exists and is active (using TEXT comparison)
  SELECT status, participants_count, max_participants
  INTO v_session_status, v_participants_count, v_max_participants
  FROM winner_takes_all_sessions
  WHERE id::TEXT = v_session_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  IF v_session_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is not active');
  END IF;
  
  IF v_participants_count >= v_max_participants THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is full');
  END IF;
  
  -- Check not already joined (using TEXT comparison)
  IF EXISTS(
    SELECT 1 FROM winner_takes_all_participants
    WHERE session_id::TEXT = v_session_id AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Winner Takes All entry');
  ELSE
    UPDATE users
    SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Winner Takes All entry (mixed)');
  END IF;
  
  -- Get RNG seed (using TEXT comparison)
  SELECT rng_seed INTO v_rng FROM winner_takes_all_sessions WHERE id::TEXT = v_session_id;
  
  -- Create participant
  v_participant_id := gen_random_uuid()::TEXT;
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (
    v_participant_id::UUID,
    v_session_id::UUID,
    p_user,
    NOW()
  );
  
  -- Update session (using TEXT comparison)
  UPDATE winner_takes_all_sessions
  SET participants_count = participants_count + 1,
      current_pool = current_pool + p_fee
  WHERE id::TEXT = v_session_id;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET games_last_hour = user_rate_limits.games_last_hour + 1,
      games_last_day = user_rate_limits.games_last_day + 1,
      last_game_at = NOW();
  
  RAISE NOTICE '✅ Join successful: session=%, participant=%', v_session_id, v_participant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'participant_id', v_participant_id,
    'rng_seed', v_rng
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FINAL COMPLETE FIX DONE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - hs_join_v2(TEXT, UUID, NUMERIC)';
  RAISE NOTICE '  - wta_join_v2(TEXT, UUID, NUMERIC)';
  RAISE NOTICE '';
  RAISE NOTICE 'All comparisons use ::TEXT casting';
  RAISE NOTICE 'Rate limiting: ✅ Active';
  RAISE NOTICE 'User bans: ✅ Checked';
  RAISE NOTICE 'Token deduction: ✅ Purchased first';
  RAISE NOTICE 'RNG seeds: ✅ Included';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Try joining a game now!';
  RAISE NOTICE '';
END $$;
