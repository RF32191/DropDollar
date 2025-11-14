-- ============================================================================
-- STEP 2: SIMPLE JOIN FUNCTIONS
-- Bare minimum to make joining work - we'll add security after
-- ============================================================================

-- Drop old functions
DROP FUNCTION IF EXISTS public.hs_join_v2 CASCADE;
DROP FUNCTION IF EXISTS public.wta_join_v2 CASCADE;

-- Simple Hot Sell join
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
  RAISE NOTICE '🎮 Joining Hot Sell: session=%, user=%', p_session, p_user;
  
  -- Convert session to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  -- Check session exists
  IF NOT EXISTS(SELECT 1 FROM hot_sell_sessions WHERE id = v_session_uuid AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found or not active');
  END IF;
  
  -- Get user tokens
  SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check not already joined
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users 
    SET purchased_tokens = 0, 
        won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
  END IF;
  
  -- Create participant
  v_participant_id := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  
  -- Update session
  UPDATE hot_sell_sessions 
  SET participants_count = participants_count + 1,
      prize_pool = prize_pool + p_fee
  WHERE id = v_session_uuid;
  
  RAISE NOTICE '✅ Join successful!';
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session,
    'participant_id', v_participant_id::TEXT,
    'message', 'Joined successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Simple Winner Takes All join
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
  RAISE NOTICE '🎮 Joining WTA: session=%, user=%', p_session, p_user;
  
  -- Convert session to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  -- Check session exists
  IF NOT EXISTS(SELECT 1 FROM winner_takes_all_sessions WHERE id = v_session_uuid AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found or not active');
  END IF;
  
  -- Get user tokens
  SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM users WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- Check not already joined
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users 
    SET purchased_tokens = 0, 
        won_tokens = won_tokens - (p_fee - v_purchased)
    WHERE id = p_user;
  END IF;
  
  -- Create participant
  v_participant_id := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  
  -- Update session
  UPDATE winner_takes_all_sessions 
  SET participants_count = participants_count + 1,
      current_pool = current_pool + p_fee
  WHERE id = v_session_uuid;
  
  RAISE NOTICE '✅ Join successful!';
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session,
    'participant_id', v_participant_id::TEXT,
    'message', 'Joined successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Test it
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SIMPLE JOIN FUNCTIONS CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - hs_join_v2(TEXT, UUID, NUMERIC)';
  RAISE NOTICE '  - wta_join_v2(TEXT, UUID, NUMERIC)';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Try joining a game from the website now';
  RAISE NOTICE '';
END $$;


