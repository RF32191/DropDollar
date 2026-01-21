-- ============================================================================
-- FIX HS_JOIN_V2 TO ACCEPT WAITING SESSIONS
-- The problem: hs_join_v2 only allows joining 'active' sessions
-- But new sessions are created as 'waiting'
-- ============================================================================

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
  -- Convert session ID to UUID
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;
  
  RAISE NOTICE '🎮 HS_JOIN_V2: session=%, user=%', v_session_uuid, p_user;
  
  -- Check rate limits
  SELECT 
    COALESCE(games_last_hour, 0),
    COALESCE(games_last_day, 0)
  INTO v_hour_count, v_day_count
  FROM public.user_rate_limits
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
  FROM public.users
  WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Check sufficient tokens
  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;
  
  -- FIX: Get session and check if it exists AND is joinable (waiting OR active)
  -- This is the KEY FIX - allow both 'waiting' and 'active' status
  SELECT * INTO v_session_record
  FROM public.hot_sell_sessions
  WHERE id = v_session_uuid
    AND status IN ('waiting', 'active')  -- ✅ FIXED: Allow both waiting and active
    AND first_place_user_id IS NULL;     -- Not already paid out
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ Session not found or not joinable: %', v_session_uuid;
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Session not found or inactive',
      'debug_session_id', v_session_uuid::TEXT
    );
  END IF;
  
  RAISE NOTICE '✅ Found joinable session: % (status: %)', v_session_record.id, v_session_record.status;
  
  -- Check not already a participant
  IF EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = v_session_uuid AND user_id = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
  END IF;
  
  -- Deduct tokens (prefer purchased over won)
  IF v_purchased >= p_fee THEN
    UPDATE public.users
    SET purchased_tokens = purchased_tokens - p_fee,
        updated_at = NOW()
    WHERE id = p_user;
    
    INSERT INTO public.token_transactions (
      user_id, 
      transaction_type, 
      amount, 
      balance_after,
      description
    )
    VALUES (
      p_user, 
      'game_entry', 
      -p_fee, 
      (v_purchased - p_fee) + v_won,  -- New balance after deduction
      'Hot Sell Entry'
    );
  ELSE
    UPDATE public.users
    SET purchased_tokens = 0,
        won_tokens = won_tokens - (p_fee - v_purchased),
        updated_at = NOW()
    WHERE id = p_user;
    
    INSERT INTO public.token_transactions (
      user_id, 
      transaction_type, 
      amount, 
      balance_after,
      description
    )
    VALUES (
      p_user, 
      'game_entry', 
      -p_fee, 
      v_won - (p_fee - v_purchased),  -- New balance after mixed deduction
      'Hot Sell Entry (mixed)'
    );
  END IF;
  
  -- Add participant
  INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at)
  VALUES (v_session_uuid, p_user, NOW())
  RETURNING id INTO v_participant_id;
  
  -- Update session
  UPDATE public.hot_sell_sessions
  SET 
    prize_pool = prize_pool + p_fee,
    participants_count = participants_count + 1,
    status = 'active',  -- Change to active when first player joins
    updated_at = NOW()
  WHERE id = v_session_uuid;
  
  -- Update rate limits
  INSERT INTO public.user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
  VALUES (p_user, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    games_last_hour = CASE 
      WHEN user_rate_limits.last_game_at > NOW() - INTERVAL '1 hour' 
      THEN user_rate_limits.games_last_hour + 1 
      ELSE 1 
    END,
    games_last_day = CASE 
      WHEN user_rate_limits.last_game_at > NOW() - INTERVAL '24 hours' 
      THEN user_rate_limits.games_last_day + 1 
      ELSE 1 
    END,
    last_game_at = NOW();
  
  -- Get RNG seed
  SELECT rng_seed INTO v_rng_seed
  FROM public.hot_sell_sessions
  WHERE id = v_session_uuid;
  
  RAISE NOTICE '✅ Join successful! Participant: %, New pot: $%', 
    v_participant_id, v_session_record.prize_pool + p_fee;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Joined successfully',
    'participant_id', v_participant_id,
    'new_pot', v_session_record.prize_pool + p_fee,
    'rng_seed', v_rng_seed
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error in hs_join_v2: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ HS_JOIN_V2 FUNCTION FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '- Now accepts BOTH waiting AND active sessions';
  RAISE NOTICE '- Was only accepting active sessions before';
  RAISE NOTICE '- This fixes "Session not found or inactive" error';
  RAISE NOTICE '';
END $$;

