-- ============================================================================
-- WINNER PAYOUT SYSTEM - WORKING VERSION
-- ============================================================================
-- This script creates a simple, working payout function that:
-- 1. Identifies the winner by highest score
-- 2. Calculates the payout amount (pot - 15% platform fee)
-- 3. Updates the winner's tokens in the users table
-- 4. Marks the session as completed
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.winner_payout(UUID);

-- Create the winner payout function
CREATE OR REPLACE FUNCTION public.winner_payout(session_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  winner_record RECORD;
  total_pot DECIMAL(10,2);
  platform_fee DECIMAL(10,2);
  winner_payout DECIMAL(10,2);
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
  platform_fee := total_pot * 0.15;
  winner_payout := total_pot - platform_fee;
  
  -- Get winner's current tokens
  SELECT tokens INTO winner_current_tokens
  FROM public.users
  WHERE id = winner_record.user_id;
  
  -- Calculate new token balance
  winner_new_tokens := COALESCE(winner_current_tokens, 0) + winner_payout;
  
  -- Update winner's tokens
  UPDATE public.users
  SET 
    tokens = winner_new_tokens,
    total_winnings = COALESCE(total_winnings, 0) + winner_payout,
    games_won = COALESCE(games_won, 0) + 1,
    updated_at = NOW()
  WHERE id = winner_record.user_id;
  
  -- Mark session as completed
  UPDATE public.winner_takes_all_sessions
  SET 
    status = 'completed',
    winner_user_id = winner_record.user_id,
    prize_amount = winner_payout,
    platform_fee = platform_fee,
    updated_at = NOW()
  WHERE id = session_id_param;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'message', 'Winner paid out successfully',
    'winner_user_id', winner_record.user_id,
    'payout_amount', winner_payout,
    'platform_fee', platform_fee,
    'tokens_before', winner_current_tokens,
    'tokens_after', winner_new_tokens
  );
  
  RETURN result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.winner_payout(UUID) IS 'Pays out the winner based on highest score for a given session';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.winner_payout(UUID) TO authenticated, anon;

-- Test query (optional - uncomment to test)
/*
SELECT public.winner_payout('your-session-id-here');
*/

