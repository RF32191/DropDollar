-- ============================================================================
-- FAST FALLBACK: TIMER START + PAYOUT/RESET BY SESSION (SAFE, SEPARATE)
-- ============================================================================
-- Use these two RPCs without touching existing system logic.
-- 1) start_timer_if_missing(session_id UUID, duration_seconds INT DEFAULT 30)
-- 2) payout_and_reset_session(session_id UUID)
-- ============================================================================

-- 1) Start timer if missing (idempotent)
CREATE OR REPLACE FUNCTION public.start_timer_if_missing(
  session_id_param UUID,
  duration_seconds INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  s RECORD;
BEGIN
  SELECT * INTO s FROM public.winner_takes_all_sessions WHERE id = session_id_param;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;

  IF s.timer_started_at IS NULL THEN
    UPDATE public.winner_takes_all_sessions
    SET 
      timer_started_at = NOW(),
      timer_duration = COALESCE(timer_duration, duration_seconds),
      updated_at = NOW()
    WHERE id = session_id_param;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'timer_started_at', (SELECT timer_started_at FROM public.winner_takes_all_sessions WHERE id = session_id_param),
    'timer_duration', (SELECT timer_duration FROM public.winner_takes_all_sessions WHERE id = session_id_param)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_timer_if_missing(UUID, INT) TO authenticated, anon;

-- 2) Payout and reset specific session (safe, idempotent)
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
  platform_fee NUMERIC;
  winner_payout NUMERIC;
  payout_result JSONB;
BEGIN
  SELECT * INTO s FROM public.winner_takes_all_sessions WHERE id = session_id_param;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;

  -- find winner by highest score
  SELECT * INTO w
  FROM public.winner_takes_all_participants
  WHERE session_id = session_id_param AND score IS NOT NULL
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No participants with scores');
  END IF;

  total_pot := COALESCE(s.current_pot, 0);
  platform_fee := total_pot * 0.15;
  winner_payout := total_pot - platform_fee;

  -- pay winner using existing add_tokens_to_user if present; fallback direct update
  BEGIN
    SELECT public.add_tokens_to_user(w.user_id, winner_payout) INTO payout_result;
  EXCEPTION WHEN undefined_function THEN
    UPDATE public.users SET tokens = COALESCE(tokens,0) + winner_payout, updated_at = NOW() WHERE id = w.user_id;
    payout_result := jsonb_build_object('success', true);
  END;

  -- mark completed
  UPDATE public.winner_takes_all_sessions
  SET status = 'completed', winner_user_id = w.user_id, prize_amount = winner_payout, updated_at = NOW()
  WHERE id = session_id_param;

  -- reset for next game
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

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payout processed and session reset',
    'winner_user_id', w.user_id,
    'payout_amount', winner_payout
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.payout_and_reset_session(UUID) TO authenticated, anon;


