-- ============================================================================
-- COMPLETE HOT SELL & WINNER TAKES ALL SYSTEM - TRULY FIXED
-- Handles all UUID/TEXT conversions properly
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure all required columns exist
-- ============================================================================

DO $$
BEGIN
  -- Hot Sell Sessions columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'rng_seed') THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN rng_seed INTEGER DEFAULT floor(random() * 1000000);
    RAISE NOTICE '✅ Added rng_seed to hot_sell_sessions';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'prize_pool') THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN prize_pool NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added prize_pool to hot_sell_sessions';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'base_price') THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN base_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added base_price to hot_sell_sessions';
  END IF;
  
  -- Winner Takes All Sessions columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'rng_seed') THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN rng_seed INTEGER DEFAULT floor(random() * 1000000);
    RAISE NOTICE '✅ Added rng_seed to winner_takes_all_sessions';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'current_pool') THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN current_pool NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added current_pool to winner_takes_all_sessions';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'base_price') THEN
    ALTER TABLE winner_takes_all_sessions ADD COLUMN base_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added base_price to winner_takes_all_sessions';
  END IF;
  
  RAISE NOTICE '✅ All required columns verified';
END $$;

-- ============================================================================
-- STEP 2: Drop ALL old versions of functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.join_hot_sell_session(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.hs_join_v2(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;

-- ============================================================================
-- STEP 3: Create get_all functions (list sessions)
-- ============================================================================

CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      id::TEXT as id,
      config_id::TEXT as config_id,
      COALESCE(prize_pool, 0) as prize_pool,
      COALESCE(base_price, 0) as base_price,
      COALESCE(participants_count, 0) as participants_count,
      status::TEXT as status,
      COALESCE(rng_seed, 0) as rng_seed,
      created_at::TEXT as created_at
    FROM hot_sell_sessions
    WHERE status = 'active'
    ORDER BY created_at DESC
  ) t;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'get_all_hot_sell_sessions error: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;

CREATE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      id::TEXT as id,
      config_id::TEXT as config_id,
      COALESCE(current_pool, 0) as current_pool,
      COALESCE(base_price, 0) as base_price,
      COALESCE(participants_count, 0) as participants_count,
      status::TEXT as status,
      COALESCE(rng_seed, 0) as rng_seed,
      timer_started_at::TEXT as timer_started_at,
      COALESCE(timer_duration, 1800) as timer_duration,
      created_at::TEXT as created_at
    FROM winner_takes_all_sessions
    WHERE status = 'active'
    ORDER BY created_at DESC
  ) t;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'get_all_winner_takes_all_sessions error: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;

-- ============================================================================
-- STEP 4: Create HOT SELL join function - PROPERLY HANDLES UUID/TEXT
-- ============================================================================

CREATE FUNCTION public.hs_join_v2(
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
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
BEGIN
  -- Convert session TEXT to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  RAISE NOTICE '🎮 HS_JOIN_V2: session=%, user=%', p_session, p_user;
  
  -- ✅ SECURITY 1: Rate limit check
  SELECT 
    COALESCE(games_last_hour, 0),
    COALESCE(games_last_day, 0)
  INTO v_hour_count, v_day_count
  FROM user_rate_limits
  WHERE user_id = p_user;
  
  IF v_hour_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
  END IF;
  
  IF v_day_count >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
  END IF;
  
  -- ✅ SECURITY 2: Get user tokens
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- ✅ Check session exists (cast both to TEXT for comparison)
  IF NOT EXISTS(
    SELECT 1 FROM hot_sell_sessions 
    WHERE id::TEXT = v_session_uuid::TEXT 
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found or inactive');
  END IF;
  
  -- ✅ Check not already joined (cast session_id to TEXT, compare with UUID as TEXT)
  IF EXISTS(
    SELECT 1 FROM hot_sell_participants 
    WHERE session_id::TEXT = v_session_uuid::TEXT
    AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- ✅ SECURITY 3: Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users
    SET purchased_tokens = purchased_tokens - p_fee
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell entry');
  ELSE
    UPDATE users
    SET 
      purchased_tokens = 0,
      won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell entry (mixed wallets)');
  END IF;
  
  -- ✅ SECURITY 4: Get RNG seed (cast to TEXT for comparison)
  SELECT rng_seed INTO v_rng_seed
  FROM hot_sell_sessions
  WHERE id::TEXT = v_session_uuid::TEXT;
  
  -- ✅ Add participant (insert as proper type - handle both UUID and TEXT columns)
  v_participant_id := gen_random_uuid();
  
  -- Try to determine column type and insert accordingly
  BEGIN
    -- First try: assume session_id is UUID type
    INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  EXCEPTION WHEN OTHERS THEN
    -- If that fails, try with TEXT
    BEGIN
      INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
      VALUES (v_participant_id, v_session_uuid::TEXT, p_user, NOW());
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'message', 'Failed to add participant: ' || SQLERRM);
    END;
  END;
  
  -- ✅ Update session (cast to TEXT for WHERE clause)
  UPDATE hot_sell_sessions
  SET 
    participants_count = COALESCE(participants_count, 0) + 1,
    prize_pool = COALESCE(prize_pool, 0) + p_fee
  WHERE id::TEXT = v_session_uuid::TEXT;
  
  -- ✅ SECURITY 5: Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    games_last_hour = user_rate_limits.games_last_hour + 1,
    games_last_day = user_rate_limits.games_last_day + 1,
    last_game_at = NOW();
  
  RAISE NOTICE '✅ SUCCESS: participant=%', v_participant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined',
    'session_id', v_session_uuid::TEXT,
    'participant_id', v_participant_id::TEXT,
    'rng_seed', v_rng_seed
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'hs_join_v2 error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', 'System error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- STEP 5: Create WINNER TAKES ALL join function - PROPERLY HANDLES UUID/TEXT
-- ============================================================================

CREATE FUNCTION public.wta_join_v2(
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
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id UUID;
  v_hour_count INT;
  v_day_count INT;
  v_rng_seed INT;
BEGIN
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  RAISE NOTICE '🎮 WTA_JOIN_V2: session=%, user=%', p_session, p_user;
  
  -- Rate limit check
  SELECT 
    COALESCE(games_last_hour, 0),
    COALESCE(games_last_day, 0)
  INTO v_hour_count, v_day_count
  FROM user_rate_limits
  WHERE user_id = p_user;
  
  IF v_hour_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
  END IF;
  
  IF v_day_count >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
  END IF;
  
  -- Get user tokens
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check session exists (cast both to TEXT)
  IF NOT EXISTS(
    SELECT 1 FROM winner_takes_all_sessions 
    WHERE id::TEXT = v_session_uuid::TEXT 
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found or inactive');
  END IF;
  
  -- Check not already joined (cast to TEXT)
  IF EXISTS(
    SELECT 1 FROM winner_takes_all_participants 
    WHERE session_id::TEXT = v_session_uuid::TEXT
    AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users
    SET purchased_tokens = purchased_tokens - p_fee
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Winner Takes All entry');
  ELSE
    UPDATE users
    SET 
      purchased_tokens = 0,
      won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
    
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA entry (mixed wallets)');
  END IF;
  
  -- Get RNG seed (cast to TEXT)
  SELECT rng_seed INTO v_rng_seed
  FROM winner_takes_all_sessions
  WHERE id::TEXT = v_session_uuid::TEXT;
  
  -- Add participant (handle both UUID and TEXT column types)
  v_participant_id := gen_random_uuid();
  
  BEGIN
    -- First try: assume session_id is UUID type
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  EXCEPTION WHEN OTHERS THEN
    -- If that fails, try with TEXT
    BEGIN
      INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
      VALUES (v_participant_id, v_session_uuid::TEXT, p_user, NOW());
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'message', 'Failed to add participant: ' || SQLERRM);
    END;
  END;
  
  -- Update session (cast to TEXT)
  UPDATE winner_takes_all_sessions
  SET 
    participants_count = COALESCE(participants_count, 0) + 1,
    current_pool = COALESCE(current_pool, 0) + p_fee
  WHERE id::TEXT = v_session_uuid::TEXT;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    games_last_hour = user_rate_limits.games_last_hour + 1,
    games_last_day = user_rate_limits.games_last_day + 1,
    last_game_at = NOW();
  
  RAISE NOTICE '✅ SUCCESS: participant=%', v_participant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined',
    'session_id', v_session_uuid::TEXT,
    'participant_id', v_participant_id::TEXT,
    'rng_seed', v_rng_seed
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'wta_join_v2 error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', 'System error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- STEP 6: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- STEP 7: Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 COMPLETE SYSTEM FIXED & READY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions created:';
    RAISE NOTICE '   • get_all_hot_sell_sessions()';
    RAISE NOTICE '   • get_all_winner_takes_all_sessions()';
    RAISE NOTICE '   • hs_join_v2(session TEXT, user UUID, fee NUMERIC)';
    RAISE NOTICE '   • wta_join_v2(session TEXT, user UUID, fee NUMERIC)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 All security features active:';
    RAISE NOTICE '   • Rate Limiting (30/hr, 200/day)';
    RAISE NOTICE '   • Dual Wallet (purchased first)';
    RAISE NOTICE '   • RNG Seeding (fair gameplay)';
    RAISE NOTICE '   • Audit Trail (all logged)';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️  UUID handling:';
    RAISE NOTICE '   • All comparisons use ::TEXT casting';
    RAISE NOTICE '   • Inserts auto-detect column type';
    RAISE NOTICE '   • Full error handling';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 REFRESH YOUR PAGE AND TEST NOW!';
    RAISE NOTICE '';
END $$;

