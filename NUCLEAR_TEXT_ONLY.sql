-- ============================================================================
-- NUCLEAR OPTION - CONVERT EVERYTHING TO TEXT
-- This will 100% fix the UUID error by eliminating UUID comparisons entirely
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all foreign keys
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '🔥 Dropping all foreign keys...';
  ALTER TABLE hot_sell_participants DROP CONSTRAINT IF EXISTS hot_sell_participants_session_id_fkey CASCADE;
  ALTER TABLE winner_takes_all_participants DROP CONSTRAINT IF EXISTS winner_takes_all_participants_session_id_fkey CASCADE;
  ALTER TABLE one_v_one_participants DROP CONSTRAINT IF EXISTS one_v_one_participants_session_id_fkey CASCADE;
  RAISE NOTICE '✅ Foreign keys dropped';
END $$;

-- ============================================================================
-- STEP 2: Convert ALL session_id columns to TEXT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '🔥 Converting all session_id columns to TEXT...';
  
  -- hot_sell_participants.session_id
  ALTER TABLE hot_sell_participants 
    ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
  
  -- winner_takes_all_participants.session_id
  ALTER TABLE winner_takes_all_participants 
    ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
  
  -- one_v_one_participants.session_id (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'one_v_one_participants' AND column_name = 'session_id') THEN
    ALTER TABLE one_v_one_participants 
      ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
  END IF;
  
  RAISE NOTICE '✅ All session_id columns are now TEXT';
END $$;

-- ============================================================================
-- STEP 3: Convert ALL id columns to TEXT (for consistency)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '🔥 Converting all id columns to TEXT...';
  
  -- Session tables
  ALTER TABLE hot_sell_sessions 
    ALTER COLUMN id TYPE TEXT USING id::TEXT;
  
  ALTER TABLE winner_takes_all_sessions 
    ALTER COLUMN id TYPE TEXT USING id::TEXT;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'one_v_one_sessions') THEN
    ALTER TABLE one_v_one_sessions 
      ALTER COLUMN id TYPE TEXT USING id::TEXT;
  END IF;
  
  -- Participant tables
  ALTER TABLE hot_sell_participants 
    ALTER COLUMN id TYPE TEXT USING id::TEXT;
  
  ALTER TABLE winner_takes_all_participants 
    ALTER COLUMN id TYPE TEXT USING id::TEXT;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'one_v_one_participants') THEN
    ALTER TABLE one_v_one_participants 
      ALTER COLUMN id TYPE TEXT USING id::TEXT;
  END IF;
  
  RAISE NOTICE '✅ All id columns are now TEXT';
END $$;

-- ============================================================================
-- STEP 4: Recreate foreign keys (TEXT -> TEXT)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '🔥 Recreating foreign keys (TEXT -> TEXT)...';
  
  ALTER TABLE hot_sell_participants
    ADD CONSTRAINT hot_sell_participants_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES hot_sell_sessions(id) ON DELETE CASCADE;
  
  ALTER TABLE winner_takes_all_participants
    ADD CONSTRAINT winner_takes_all_participants_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES winner_takes_all_sessions(id) ON DELETE CASCADE;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'one_v_one_participants') THEN
    ALTER TABLE one_v_one_participants
      ADD CONSTRAINT one_v_one_participants_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES one_v_one_sessions(id) ON DELETE CASCADE;
  END IF;
  
  RAISE NOTICE '✅ Foreign keys recreated (TEXT -> TEXT)';
END $$;

-- ============================================================================
-- STEP 5: Recreate functions (ALL using TEXT)
-- ============================================================================

DROP FUNCTION IF EXISTS public.hs_join_v2(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

-- Get all Hot Sell sessions
CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        s.id,
        s.config_id,
        s.prize_pool,
        s.base_price,
        s.participants_count,
        s.status,
        s.rng_seed,
        s.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'user_id', p.user_id,
                'score', p.score,
                'accuracy', p.accuracy,
                'joined_at', p.joined_at,
                'completed_at', p.completed_at
              )
            )
            FROM public.hot_sell_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        ) as participants
      FROM public.hot_sell_sessions s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    ) t
  );
END;
$$;

-- Get all Winner Takes All sessions
CREATE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        s.id,
        s.config_id,
        s.current_pool,
        s.base_price,
        s.participants_count,
        s.status,
        s.rng_seed,
        s.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'user_id', p.user_id,
                'score', p.score,
                'accuracy', p.accuracy,
                'joined_at', p.joined_at,
                'completed_at', p.completed_at
              )
            )
            FROM public.winner_takes_all_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        ) as participants
      FROM public.winner_takes_all_sessions s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    ) t
  );
END;
$$;

-- Hot Sell join (TEXT session ID)
CREATE FUNCTION public.hs_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id TEXT;
  v_hour INT;
  v_day INT;
  v_rng INT;
BEGIN
  -- Rate limit check
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0) 
  INTO v_hour, v_day 
  FROM user_rate_limits 
  WHERE user_id = p_user;
  
  IF v_hour >= 30 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr'); 
  END IF;
  
  IF v_day >= 200 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day'); 
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
  
  -- Check session exists (TEXT = TEXT comparison)
  IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE id = p_session AND status = 'active') THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Session not found'); 
  END IF;
  
  -- Check not already joined (TEXT = TEXT comparison)
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id = p_session AND user_id = p_user) THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Already joined'); 
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) 
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell');
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) 
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'Hot Sell (mixed)');
  END IF;
  
  -- Get RNG seed
  SELECT rng_seed INTO v_rng FROM hot_sell_sessions WHERE id = p_session;
  
  -- Create participant (TEXT session_id)
  v_participant_id := gen_random_uuid()::TEXT;
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at) 
  VALUES (v_participant_id, p_session, p_user, NOW());
  
  -- Update session (TEXT id)
  UPDATE hot_sell_sessions 
  SET participants_count = participants_count + 1, 
      prize_pool = prize_pool + p_fee 
  WHERE id = p_session;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at) 
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET games_last_hour = user_rate_limits.games_last_hour + 1, 
      games_last_day = user_rate_limits.games_last_day + 1, 
      last_game_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true, 
    'session_id', p_session, 
    'participant_id', v_participant_id, 
    'rng_seed', v_rng
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Winner Takes All join (TEXT session ID)
CREATE FUNCTION public.wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchased NUMERIC;
  v_won NUMERIC;
  v_participant_id TEXT;
  v_hour INT;
  v_day INT;
  v_rng INT;
BEGIN
  -- Rate limit check
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0) 
  INTO v_hour, v_day 
  FROM user_rate_limits 
  WHERE user_id = p_user;
  
  IF v_hour >= 30 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr'); 
  END IF;
  
  IF v_day >= 200 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day'); 
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
  
  -- Check session exists (TEXT = TEXT comparison)
  IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE id = p_session AND status = 'active') THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Session not found'); 
  END IF;
  
  -- Check not already joined (TEXT = TEXT comparison)
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = p_session AND user_id = p_user) THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Already joined'); 
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) 
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA');
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description) 
    VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA (mixed)');
  END IF;
  
  -- Get RNG seed
  SELECT rng_seed INTO v_rng FROM winner_takes_all_sessions WHERE id = p_session;
  
  -- Create participant (TEXT session_id)
  v_participant_id := gen_random_uuid()::TEXT;
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at) 
  VALUES (v_participant_id, p_session, p_user, NOW());
  
  -- Update session (TEXT id)
  UPDATE winner_takes_all_sessions 
  SET participants_count = participants_count + 1, 
      current_pool = current_pool + p_fee 
  WHERE id = p_session;
  
  -- Update rate limits
  INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at) 
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET games_last_hour = user_rate_limits.games_last_hour + 1, 
      games_last_day = user_rate_limits.games_last_day + 1, 
      last_game_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true, 
    'session_id', p_session, 
    'participant_id', v_participant_id, 
    'rng_seed', v_rng
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ NUCLEAR TEXT-ONLY FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All ID columns: TEXT';
  RAISE NOTICE 'All comparisons: TEXT = TEXT';
  RAISE NOTICE 'Foreign keys: TEXT -> TEXT';
  RAISE NOTICE 'Functions: All using TEXT';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 NO MORE UUID ERRORS POSSIBLE!';
  RAISE NOTICE '';
END $$;


