-- ============================================================================
-- ENHANCED TIMER AND PAYOUT SYSTEM
-- ============================================================================
-- This script enhances the timer system to be more reliable and ensures
-- automatic payout when the timer expires.
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.start_timer_if_missing(UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS public.payout_and_reset_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_and_start_timer(UUID) CASCADE;

-- ============================================================================
-- Function 1: Check and start timer for a session if base price is met
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_start_timer(
  session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  s RECORD;
  timer_duration_seconds INT := 30; -- 30 seconds hot sell timer
BEGIN
  SELECT * INTO s FROM public.winner_takes_all_sessions WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;

  -- Only start timer if:
  -- 1. Status is 'active' (base price met)
  -- 2. Timer hasn't started yet
  IF s.status = 'active' AND s.timer_started_at IS NULL THEN
    UPDATE public.winner_takes_all_sessions
    SET 
      timer_started_at = NOW(),
      timer_duration = timer_duration_seconds,
      updated_at = NOW()
    WHERE id = session_id_param;
    
    RAISE NOTICE '🔥 [Winner Takes All] Timer started for session % at %', session_id_param, NOW();
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Timer started',
      'timer_started_at', NOW(),
      'timer_duration', timer_duration_seconds
    );
  ELSIF s.timer_started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Timer already running',
      'timer_started_at', s.timer_started_at,
      'timer_duration', s.timer_duration
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Session not active yet (base price not met)',
      'current_pot', s.current_pot,
      'base_price', s.base_price
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_start_timer(UUID) TO authenticated, anon;

-- ============================================================================
-- Function 2: Enhanced payout and reset for a specific session
-- ============================================================================
CREATE OR REPLACE FUNCTION public.payout_and_reset_session(
  session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  s RECORD;
  w RECORD;
  total_pot NUMERIC;
  platform_fee_amount NUMERIC;
  winner_payout_amount NUMERIC;
  payout_result JSONB;
  elapsed_time INT;
BEGIN
  -- Get session details
  SELECT * INTO s FROM public.winner_takes_all_sessions WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;

  -- Check if already completed
  IF s.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session already completed');
  END IF;

  -- Check if timer has actually expired
  IF s.timer_started_at IS NOT NULL THEN
    elapsed_time := EXTRACT(EPOCH FROM (NOW() - s.timer_started_at))::INT;
    
    IF elapsed_time < s.timer_duration THEN
      RETURN jsonb_build_object(
        'success', false, 
        'message', 'Timer has not expired yet',
        'elapsed', elapsed_time,
        'duration', s.timer_duration,
        'remaining', s.timer_duration - elapsed_time
      );
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Timer never started');
  END IF;

  -- Find winner by highest score
  SELECT * INTO w
  FROM public.winner_takes_all_participants
  WHERE session_id = session_id_param 
    AND score IS NOT NULL
    AND completed_at IS NOT NULL
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No participants with scores found');
  END IF;

  -- Calculate payout (15% platform fee)
  total_pot := COALESCE(s.current_pot, 0);
  platform_fee_amount := total_pot * 0.15;
  winner_payout_amount := total_pot - platform_fee_amount;

  RAISE NOTICE '💰 [Winner Takes All] Processing payout: pot=%, fee=%, payout=%', total_pot, platform_fee_amount, winner_payout_amount;

  -- Pay winner using add_tokens_to_user function
  BEGIN
    SELECT public.add_tokens_to_user(w.user_id, winner_payout_amount) INTO payout_result;
    
    IF NOT (payout_result->>'success')::BOOLEAN THEN
      RETURN jsonb_build_object('success', false, 'message', 'Failed to pay winner: ' || (payout_result->>'message'));
    END IF;
  EXCEPTION 
    WHEN undefined_function THEN
      -- Fallback: direct token update if add_tokens_to_user doesn't exist
      UPDATE public.users 
      SET tokens = COALESCE(tokens, 0) + winner_payout_amount, updated_at = NOW() 
      WHERE id = w.user_id;
      
      payout_result := jsonb_build_object('success', true, 'tokens_after', (SELECT tokens FROM public.users WHERE id = w.user_id));
  END;

  RAISE NOTICE '✅ [Winner Takes All] Winner paid: user_id=%, amount=%', w.user_id, winner_payout_amount;

  -- Mark session as completed
  UPDATE public.winner_takes_all_sessions
  SET 
    status = 'completed',
    winner_user_id = w.user_id,
    prize_amount = winner_payout_amount,
    platform_fee = platform_fee_amount,
    updated_at = NOW()
  WHERE id = session_id_param;

  RAISE NOTICE '📝 [Winner Takes All] Session marked as completed: %', session_id_param;

  -- Reset session for next game (delete participants and reset fields)
  DELETE FROM public.winner_takes_all_participants WHERE session_id = session_id_param;
  
  UPDATE public.winner_takes_all_sessions
  SET 
    status = 'waiting',
    current_pot = 0,
    participants_count = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    prize_amount = NULL,
    updated_at = NOW()
  WHERE id = session_id_param;

  RAISE NOTICE '🔄 [Winner Takes All] Session reset complete: %', session_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Winner paid and session reset',
    'winner_user_id', w.user_id,
    'payout_amount', winner_payout_amount,
    'platform_fee', platform_fee_amount,
    'total_pot', total_pot,
    'new_balance', (payout_result->>'tokens_after')::NUMERIC
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.payout_and_reset_session(UUID) TO authenticated, anon;

-- ============================================================================
-- Function 3: Auto-check all sessions and payout expired ones
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_check_and_payout_expired()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  payout_count INT := 0;
  payout_result JSONB;
  elapsed_time INT;
BEGIN
  -- Loop through all active sessions with timers
  FOR session_record IN 
    SELECT * FROM public.winner_takes_all_sessions 
    WHERE status = 'active' 
      AND timer_started_at IS NOT NULL
  LOOP
    -- Calculate elapsed time
    elapsed_time := EXTRACT(EPOCH FROM (NOW() - session_record.timer_started_at))::INT;
    
    -- If timer expired, process payout
    IF elapsed_time >= session_record.timer_duration THEN
      RAISE NOTICE '⏰ [Winner Takes All] Timer expired for session %, processing payout...', session_record.id;
      
      SELECT public.payout_and_reset_session(session_record.id) INTO payout_result;
      
      IF (payout_result->>'success')::BOOLEAN THEN
        payout_count := payout_count + 1;
        RAISE NOTICE '✅ [Winner Takes All] Successfully paid out session %', session_record.id;
      ELSE
        RAISE WARNING '❌ [Winner Takes All] Failed to payout session %: %', session_record.id, (payout_result->>'message');
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Auto-payout check complete',
    'sessions_paid_out', payout_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_check_and_payout_expired() TO authenticated, anon;

-- ============================================================================
-- DONE! These functions work together:
-- 1. check_and_start_timer(session_id) - Call after join to ensure timer starts
-- 2. payout_and_reset_session(session_id) - Call when timer expires to pay winner
-- 3. auto_check_and_payout_expired() - Call periodically to check all sessions
-- ============================================================================

