-- ============================================================================
-- FIX WTA JOIN AND SCORE SUBMISSION FOR NEW SESSIONS
-- ============================================================================
-- This ensures users can join new sessions and scores are saved properly
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix join_winner_takes_all_session function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  prize_pool_new NUMERIC,
  session_id_out TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_participant_id UUID;
  v_current_prize_pool NUMERIC;
  v_new_prize_pool NUMERIC;
  v_participant_count INTEGER;
  v_session_status TEXT;
BEGIN
  -- Convert TEXT to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, 0::NUMERIC, ''::TEXT;
    RETURN;
  END;

  -- Get current session state
  SELECT 
    COALESCE(prize_pool, 0),
    COALESCE(participants_count, 0),
    status
  INTO v_current_prize_pool, v_participant_count, v_session_status
  FROM winner_takes_all_sessions
  WHERE id = v_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::NUMERIC, ''::TEXT;
    RETURN;
  END IF;

  -- Check session status
  IF v_session_status = 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Session is completed'::TEXT, v_current_prize_pool, session_id_param;
    RETURN;
  END IF;

  -- Check if user already joined THIS session
  IF EXISTS (
    SELECT 1 FROM winner_takes_all_participants 
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) THEN
    RETURN QUERY SELECT FALSE, 'Already joined this session'::TEXT, v_current_prize_pool, session_id_param;
    RETURN;
  END IF;

  -- Deduct tokens (using spend_tokens function if exists)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'spend_tokens') THEN
    DECLARE
      spend_result RECORD;
    BEGIN
      SELECT * INTO spend_result FROM spend_tokens(user_id_param, entry_fee_param);
      IF NOT spend_result.success THEN
        RETURN QUERY SELECT FALSE, spend_result.message, v_current_prize_pool, ''::TEXT;
        RETURN;
      END IF;
    END;
  ELSE
    -- Fallback: Manual token deduction
    UPDATE users
    SET purchased_tokens = GREATEST(0, COALESCE(purchased_tokens, 0) - entry_fee_param)
    WHERE id = user_id_param
      AND COALESCE(purchased_tokens, 0) >= entry_fee_param;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, v_current_prize_pool, ''::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate new prize pool
  v_new_prize_pool := v_current_prize_pool + entry_fee_param;

  -- Add participant
  v_participant_id := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_id, user_id_param, NOW());

  -- Update session with new prize pool and participant count
  UPDATE winner_takes_all_sessions
  SET 
    prize_pool = v_new_prize_pool,
    participants_count = participants_count + 1,
    status = CASE 
      WHEN status = 'waiting' AND participants_count + 1 >= 1 THEN 'active'
      ELSE status
    END,
    timer_started_at = CASE
      WHEN timer_started_at IS NULL AND participants_count + 1 >= 1 THEN NOW()
      ELSE timer_started_at
    END,
    updated_at = NOW()
  WHERE id = v_session_id;

  RAISE NOTICE 'User % joined WTA session %, prize_pool: % -> %', 
    user_id_param, v_session_id, v_current_prize_pool, v_new_prize_pool;

  RETURN QUERY SELECT TRUE, 'Joined successfully'::TEXT, v_new_prize_pool, session_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE 'Fixed join_winner_takes_all_session function';
END $$;

-- ============================================================================
-- STEP 2: Fix submit_winner_takes_all_score function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_winner_takes_all_score(
  session_id_param TEXT,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_participant_exists BOOLEAN;
  v_session_status TEXT;
BEGIN
  -- Convert TEXT to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
  END;

  -- Check if session exists and get status
  SELECT status INTO v_session_status
  FROM winner_takes_all_sessions
  WHERE id = v_session_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Session not found: %', v_session_id;
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;

  -- Check if session is still active
  IF v_session_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is completed');
  END IF;

  -- Check if user is a participant in THIS session
  SELECT EXISTS (
    SELECT 1 FROM winner_takes_all_participants
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) INTO v_participant_exists;

  IF NOT v_participant_exists THEN
    RAISE WARNING 'User % is not a participant in session %', user_id_param, v_session_id;
    RETURN jsonb_build_object('success', false, 'message', 'You must join the session first');
  END IF;

  -- Update participant score
  UPDATE winner_takes_all_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = v_session_id 
    AND user_id = user_id_param;

  RAISE NOTICE 'Score submitted: User %, Session %, Score: %, Accuracy: %', 
    user_id_param, v_session_id, score_param, accuracy_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Score submitted successfully',
    'score', score_param,
    'accuracy', accuracy_param
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error submitting score: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE 'Fixed submit_winner_takes_all_score function';
END $$;

-- ============================================================================
-- STEP 3: Ensure all active configs have sessions
-- ============================================================================
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
  new_session_id UUID;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE 'Ensuring all configs have active sessions...';
  
  FOR config_rec IN 
    SELECT id, game_type, title, base_price, timer_duration
    FROM winner_takes_all_configs
    WHERE is_active = true
  LOOP
    -- Check if this config has an active session
    SELECT EXISTS (
      SELECT 1 FROM winner_takes_all_sessions
      WHERE config_id = config_rec.id
      AND status IN ('waiting', 'active')
    ) INTO session_exists;
    
    IF NOT session_exists THEN
      -- Create a new session for this config
      new_session_id := gen_random_uuid();
      
      INSERT INTO winner_takes_all_sessions (
        id,
        config_id,
        prize_pool,
        base_price,
        participants_count,
        status,
        timer_started_at,
        timer_duration,
        created_at,
        updated_at
      )
      VALUES (
        new_session_id,
        config_rec.id,
        0,
        config_rec.base_price,
        0,
        'waiting',
        NULL,
        COALESCE(config_rec.timer_duration, 7200),
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created session for: % (ID: %)', config_rec.title, new_session_id;
    ELSE
      RAISE NOTICE 'Session exists for: %', config_rec.title;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'All configs have sessions';
END $$;

-- ============================================================================
-- STEP 4: Verify setup
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '=== WTA JOIN AND SCORE SUBMISSION FIX COMPLETE ===';
  RAISE NOTICE 'Fixed join function - users can join new sessions';
  RAISE NOTICE 'Fixed score submission - scores save to correct session';
  RAISE NOTICE 'Created missing sessions for all active configs';
  RAISE NOTICE 'Progress bar will now update correctly';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Active Sessions:';
END $$;

SELECT 
  s.config_id,
  c.title,
  s.participants_count || ' players' as players,
  '$' || s.prize_pool::TEXT as prize_pool,
  s.status
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY c.base_price;

