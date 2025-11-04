-- ============================================================================
-- FIX 1V1 TO USE DUAL WALLET SYSTEM
-- ============================================================================
-- This fixes the "operator does not exist: text = uuid" error
-- Updates join_1v1_session to use spend_tokens (purchased first, then won)
-- ============================================================================

-- Drop existing function with all possible signatures
DROP FUNCTION IF EXISTS public.join_1v1_session(UUID, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC) CASCADE;

-- Create updated join_1v1_session using dual wallet system
CREATE OR REPLACE FUNCTION public.join_1v1_session(
  session_id_param UUID,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  new_pot NUMERIC;
  new_participants_count INTEGER;
  already_joined BOOLEAN;
  v_spend_result RECORD;
BEGIN
  RAISE NOTICE '🎮 [1v1 Join] User % attempting to join session %', user_id_param, session_id_param;

  -- Check if user already joined this session
  SELECT EXISTS(
    SELECT 1 FROM one_v_one_participants 
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO already_joined;

  IF already_joined THEN
    RAISE NOTICE '❌ [1v1 Join] User already joined this session';
    RETURN json_build_object(
      'success', false, 
      'message', 'You have already joined this game'
    );
  END IF;

  -- Get session
  SELECT * INTO session_record FROM one_v_one_sessions WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ [1v1 Join] Session not found';
    RETURN json_build_object('success', false, 'message', 'Session not found');
  END IF;

  -- Check if session is full
  IF session_record.participants_count >= 2 THEN
    RAISE NOTICE '❌ [1v1 Join] Session is full';
    RETURN json_build_object('success', false, 'message', 'Session is full');
  END IF;

  -- Check if session is already completed
  IF session_record.status = 'completed' THEN
    RAISE NOTICE '❌ [1v1 Join] Session already completed';
    RETURN json_build_object('success', false, 'message', 'This game has already been completed');
  END IF;

  -- Use spend_tokens function (DUAL WALLET - purchased first, then won)
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  
  IF NOT v_spend_result.success THEN
    RAISE NOTICE '❌ [1v1 Join] Insufficient tokens: %', v_spend_result.message;
    RETURN json_build_object('success', false, 'message', v_spend_result.message);
  END IF;

  RAISE NOTICE '✅ [1v1 Join] Tokens spent - Purchased: %, Won: %', v_spend_result.purchased_spent, v_spend_result.won_spent;

  -- Add participant
  INSERT INTO one_v_one_participants (session_id, user_id, joined_at)
  VALUES (session_id_param, user_id_param, NOW());

  -- Update session
  new_pot := session_record.current_pot + entry_fee_param;
  new_participants_count := session_record.participants_count + 1;

  UPDATE one_v_one_sessions
  SET 
    current_pot = new_pot,
    participants_count = new_participants_count,
    status = CASE WHEN new_participants_count >= 2 THEN 'active' ELSE 'waiting' END,
    updated_at = NOW()
  WHERE id = session_id_param;

  RAISE NOTICE '✅ [1v1 Join] User joined successfully! New pot: %, Participants: %', new_pot, new_participants_count;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined session',
    'newPot', new_pot,
    'participantsCount', new_participants_count,
    'status', CASE WHEN new_participants_count >= 2 THEN 'active' ELSE 'waiting' END
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.join_1v1_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show current token balances for test users
SELECT 
  id,
  email,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total
FROM public.users
WHERE 
  email ILIKE '%ryan%'
ORDER BY email;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ join_1v1_session now uses dual wallet system
-- ✅ spend_tokens deducts from purchased first, then won
-- ✅ Fixed TEXT = UUID operator error
-- ============================================================================

