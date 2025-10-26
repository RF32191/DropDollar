-- ============================================================================
-- FIXED AUTOMATIC WINNER PAYOUT SYSTEM
-- ============================================================================
-- This script fixes the ambiguous column reference error
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.winner_payout(UUID);
DROP FUNCTION IF EXISTS public.auto_payout_expired_sessions();

-- Create the winner payout function with unambiguous variables
CREATE OR REPLACE FUNCTION public.winner_payout(session_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  winner_record RECORD;
  total_pot DECIMAL(10,2);
  fee_amount DECIMAL(10,2);
  payout_amount DECIMAL(10,2);
  winner_current_tokens NUMERIC(10,2);
  winner_new_tokens NUMERIC(10,2);
  result JSONB;
BEGIN
  -- Get session details
  SELECT * INTO session_record
  FROM public.winner_takes_all_sessions
  WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Session not found'
    );
  END IF;
  
  -- Check if already paid out
  IF session_record.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Session already completed and paid out'
    );
  END IF;
  
  -- Get winner (highest score)
  SELECT * INTO winner_record
  FROM public.winner_takes_all_participants
  WHERE session_id = session_id_param
  AND score IS NOT NULL
  ORDER BY score DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No participants with scores found'
    );
  END IF;
  
  -- Calculate payout
  total_pot := COALESCE(session_record.current_pot, 0);
  fee_amount := total_pot * 0.15;
  payout_amount := total_pot - fee_amount;
  
  -- Get winner's current tokens
  SELECT tokens INTO winner_current_tokens
  FROM public.users
  WHERE id = winner_record.user_id;
  
  -- Calculate new token balance
  winner_new_tokens := COALESCE(winner_current_tokens, 0) + payout_amount;
  
  -- Update winner's tokens
  UPDATE public.users
  SET 
    tokens = winner_new_tokens,
    total_winnings = COALESCE(total_winnings, 0) + payout_amount,
    games_won = COALESCE(games_won, 0) + 1,
    updated_at = NOW()
  WHERE id = winner_record.user_id;
  
  -- Mark session as completed
  UPDATE public.winner_takes_all_sessions
  SET 
    status = 'completed',
    winner_user_id = winner_record.user_id,
    prize_amount = payout_amount,
    updated_at = NOW()
  WHERE id = session_id_param;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'message', 'Winner paid out successfully',
    'winner_user_id', winner_record.user_id,
    'payout_amount', payout_amount,
    'platform_fee', fee_amount,
    'tokens_before', winner_current_tokens,
    'tokens_after', winner_new_tokens
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.winner_payout(UUID) TO authenticated, anon;

-- Create function to check and auto-payout expired sessions
CREATE OR REPLACE FUNCTION public.auto_payout_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_sessions UUID[];
  session_id UUID;
  payout_count INTEGER := 0;
BEGIN
  -- Find all active sessions that should be paid out (status is 'active' and timer expired)
  SELECT ARRAY_AGG(public.winner_takes_all_sessions.id)
  INTO expired_sessions
  FROM public.winner_takes_all_sessions
  WHERE status = 'active'
  AND timer_started_at IS NOT NULL
  AND (NOW() - timer_started_at) >= INTERVAL '1 minute'
  AND EXISTS (
    SELECT 1 
    FROM public.winner_takes_all_participants 
    WHERE public.winner_takes_all_participants.session_id = public.winner_takes_all_sessions.id 
    AND public.winner_takes_all_participants.score IS NOT NULL
  );
  
  -- If no expired sessions, return 0
  IF expired_sessions IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Pay out each expired session
  FOREACH session_id IN ARRAY expired_sessions
  LOOP
    BEGIN
      PERFORM public.winner_payout(session_id);
      payout_count := payout_count + 1;
      RAISE NOTICE 'Auto-paid out session: %', session_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to auto-payout session %: %', session_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN payout_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_payout_expired_sessions() TO authenticated, anon;

-- Test the auto-payout function
SELECT public.auto_payout_expired_sessions() as sessions_paid_out;

