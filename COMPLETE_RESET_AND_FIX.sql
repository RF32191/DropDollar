-- ============================================================================
-- COMPLETE RESET AND FIX
-- Sets up everything to match current frontend - fresh start
-- ============================================================================

-- PART 1: Sync users (critical for login)
DO $$
DECLARE
  v_auth_user RECORD;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '🔄 Syncing auth.users to public.users...';
  
  FOR v_auth_user IN
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (id, email, username, purchased_tokens, won_tokens, created_at, updated_at)
      VALUES (v_auth_user.id, v_auth_user.email, split_part(v_auth_user.email, '@', 1), 0, 0, v_auth_user.created_at, NOW());
      v_count := v_count + 1;
    EXCEPTION
      WHEN unique_violation THEN
        -- Email already exists, skip
        RAISE NOTICE '  ⏭️  User % already exists (email conflict)', v_auth_user.email;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Synced % users', v_count;
END $$;

-- PART 2: Ensure all necessary columns exist
DO $$
BEGIN
  RAISE NOTICE '🔧 Ensuring columns exist...';
  
  -- Users table
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS purchased_tokens NUMERIC(18,2) DEFAULT 0 NOT NULL;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS won_tokens NUMERIC(18,2) DEFAULT 0 NOT NULL;
  
  -- Hot Sell sessions
  ALTER TABLE public.hot_sell_sessions ADD COLUMN IF NOT EXISTS prize_pool NUMERIC(18,2) DEFAULT 0 NOT NULL;
  ALTER TABLE public.hot_sell_sessions ADD COLUMN IF NOT EXISTS rng_seed INTEGER DEFAULT 0 NOT NULL;
  ALTER TABLE public.hot_sell_sessions ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10 NOT NULL;
  
  -- Winner Takes All sessions
  ALTER TABLE public.winner_takes_all_sessions ADD COLUMN IF NOT EXISTS current_pool NUMERIC(18,2) DEFAULT 0 NOT NULL;
  ALTER TABLE public.winner_takes_all_sessions ADD COLUMN IF NOT EXISTS rng_seed INTEGER DEFAULT 0 NOT NULL;
  ALTER TABLE public.winner_takes_all_sessions ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10 NOT NULL;
  
  RAISE NOTICE '✅ Columns verified';
END $$;

-- PART 3: Drop ALL old join functions
DROP FUNCTION IF EXISTS public.hs_join_v2 CASCADE;
DROP FUNCTION IF EXISTS public.wta_join_v2 CASCADE;
DROP FUNCTION IF EXISTS public.join_hot_sell_session CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session CASCADE;
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions CASCADE;

-- PART 4: Create simple, fast get_all functions
CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id,
        'prize_pool', COALESCE(s.prize_pool, 0),
        'base_price', COALESCE(s.base_price, 1),
        'participants_count', COALESCE(s.participants_count, 0),
        'max_participants', COALESCE(s.max_participants, 10),
        'status', s.status,
        'rng_seed', COALESCE(s.rng_seed, 0),
        'created_at', s.created_at,
        'participants', '[]'::json
      )
    ), '[]'::json)
    FROM public.hot_sell_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 50
  );
END;
$$;

CREATE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', s.id::TEXT,
        'config_id', s.config_id,
        'current_pool', COALESCE(s.current_pool, 0),
        'base_price', COALESCE(s.base_price, 1),
        'participants_count', COALESCE(s.participants_count, 0),
        'max_participants', COALESCE(s.max_participants, 10),
        'status', s.status,
        'rng_seed', COALESCE(s.rng_seed, 0),
        'created_at', s.created_at,
        'participants', '[]'::json
      )
    ), '[]'::json)
    FROM public.winner_takes_all_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 50
  );
END;
$$;

-- PART 5: Create simple join functions
CREATE FUNCTION public.hs_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_uuid UUID;
  v_participant_id UUID;
  v_purchased NUMERIC;
  v_won NUMERIC;
BEGIN
  -- Convert to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
  END;
  
  -- Get tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won FROM users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check session
  IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE id = v_session_uuid AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  -- Check already joined
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
  END IF;
  
  -- Join
  v_participant_id := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  
  UPDATE hot_sell_sessions 
  SET participants_count = participants_count + 1, prize_pool = prize_pool + p_fee
  WHERE id = v_session_uuid;
  
  RETURN jsonb_build_object('success', true, 'session_id', p_session, 'participant_id', v_participant_id::TEXT);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE FUNCTION public.wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_uuid UUID;
  v_participant_id UUID;
  v_purchased NUMERIC;
  v_won NUMERIC;
BEGIN
  -- Convert to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
  END;
  
  -- Get tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won FROM users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check session
  IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE id = v_session_uuid AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  -- Check already joined
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
  END IF;
  
  -- Join
  v_participant_id := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  
  UPDATE winner_takes_all_sessions 
  SET participants_count = participants_count + 1, current_pool = current_pool + p_fee
  WHERE id = v_session_uuid;
  
  RETURN jsonb_build_object('success', true, 'session_id', p_session, 'participant_id', v_participant_id::TEXT);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- PART 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- PART 7: Create sessions for all configs
DO $$
DECLARE
  v_config RECORD;
  v_session_id UUID;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '🎮 Creating missing sessions...';
  
  -- Hot Sell
  FOR v_config IN SELECT id, game_type FROM hot_sell_configs LOOP
    IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE config_id = v_config.id AND status = 'active') THEN
      v_session_id := gen_random_uuid();
      INSERT INTO hot_sell_sessions (id, config_id, participants_count, prize_pool, status, created_at, updated_at)
      VALUES (v_session_id, v_config.id, 0, 0, 'active', NOW(), NOW());
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  -- Winner Takes All
  FOR v_config IN SELECT id, game_type FROM winner_takes_all_configs LOOP
    IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE config_id = v_config.id AND status = 'active') THEN
      v_session_id := gen_random_uuid();
      INSERT INTO winner_takes_all_sessions (id, config_id, participants_count, current_pool, status, created_at, updated_at)
      VALUES (v_session_id, v_config.id, 0, 0, 'active', NOW(), NOW());
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Created % sessions', v_count;
END $$;

-- Success
DO $$
DECLARE
  v_hs_sessions INT;
  v_wta_sessions INT;
  v_users INT;
BEGIN
  SELECT COUNT(*) INTO v_hs_sessions FROM hot_sell_sessions WHERE status = 'active';
  SELECT COUNT(*) INTO v_wta_sessions FROM winner_takes_all_sessions WHERE status = 'active';
  SELECT COUNT(*) INTO v_users FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COMPLETE RESET DONE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Users: %', v_users;
  RAISE NOTICE 'Hot Sell sessions: %', v_hs_sessions;
  RAISE NOTICE 'Winner Takes All sessions: %', v_wta_sessions;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database ready!';
  RAISE NOTICE '🚀 Try logging in and joining a game!';
  RAISE NOTICE '';
END $$;

