-- ============================================================================
-- FIX 1V1 SCORE SAVING AND GAME LOCKOUT
-- ============================================================================
-- This fixes:
-- 1. "Could not find the function public.update_1v1_score" error
-- 2. Players able to join the same game multiple times
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure update_1v1_score Function Exists with Proper Permissions
-- ============================================================================

-- Drop and recreate to ensure it's in the schema cache
DROP FUNCTION IF EXISTS public.update_1v1_score(UUID, UUID, NUMERIC, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.update_1v1_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_exists BOOLEAN;
  session_status TEXT;
BEGIN
  -- Log the call
  RAISE NOTICE '📊 [1v1 Score] Updating score for session: %, user: %, score: %', 
    session_id_param, user_id_param, score_param;

  -- Check if participant exists
  SELECT EXISTS(
    SELECT 1 FROM one_v_one_participants 
    WHERE session_id = session_id_param AND user_id = user_id_param
  ) INTO participant_exists;

  IF NOT participant_exists THEN
    RAISE NOTICE '❌ [1v1 Score] Participant not found';
    RETURN json_build_object(
      'success', false, 
      'message', 'Participant not found in this session'
    );
  END IF;

  -- Update the score
  UPDATE one_v_one_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = session_id_param 
    AND user_id = user_id_param;

  -- Check if both players have completed
  DECLARE
    completed_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO completed_count
    FROM one_v_one_participants
    WHERE session_id = session_id_param
      AND score IS NOT NULL
      AND completed_at IS NOT NULL;

    RAISE NOTICE '✅ [1v1 Score] Score updated! Completed players: %/2', completed_count;

    RETURN json_build_object(
      'success', true, 
      'message', 'Score updated successfully',
      'completed_players', completed_count,
      'ready_for_payout', completed_count >= 2
    );
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_1v1_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

RAISE NOTICE '✅ update_1v1_score function created and permissions granted';

-- ============================================================================
-- STEP 2: Add Check to Prevent Joining Same Game Twice
-- ============================================================================

-- Update join function to check if user already joined
DROP FUNCTION IF EXISTS public.join_1v1_session(UUID, UUID, NUMERIC) CASCADE;

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
  user_record RECORD;
  new_pot NUMERIC;
  new_participants_count INTEGER;
  already_joined BOOLEAN;
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

  -- Get user
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ [1v1 Join] User not found';
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Check user has enough tokens
  IF user_record.tokens < entry_fee_param THEN
    RAISE NOTICE '❌ [1v1 Join] Insufficient tokens (has: %, needs: %)', user_record.tokens, entry_fee_param;
    RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;

  -- Deduct tokens
  UPDATE users SET tokens = tokens - entry_fee_param, updated_at = NOW() 
  WHERE id = user_id_param;

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

RAISE NOTICE '✅ join_1v1_session function updated with duplicate check';

-- ============================================================================
-- STEP 3: Verify Functions Are in Schema Cache
-- ============================================================================

DO $$
DECLARE
  update_score_exists BOOLEAN;
  join_session_exists BOOLEAN;
BEGIN
  -- Check update_1v1_score
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_1v1_score'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO update_score_exists;

  -- Check join_1v1_session
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'join_1v1_session'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO join_session_exists;

  IF update_score_exists AND join_session_exists THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ 1v1 Functions Verified in Schema Cache!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✓ update_1v1_score - Score saving function';
    RAISE NOTICE '✓ join_1v1_session - Join with duplicate check';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 What This Fixes:';
    RAISE NOTICE '   1. Score saving now works properly';
    RAISE NOTICE '   2. Players cannot join the same game twice';
    RAISE NOTICE '   3. Completed games cannot be joined';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
  ELSE
    RAISE EXCEPTION 'Functions not found in schema cache!';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Test Current State
-- ============================================================================

-- Show all 1v1 sessions
SELECT 
  config_id,
  status,
  current_pot,
  participants_count,
  winner_user_id IS NOT NULL as has_winner,
  created_at
FROM one_v_one_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Show participants with scores
SELECT 
  s.config_id,
  p.user_id,
  p.score,
  p.completed_at IS NOT NULL as has_completed
FROM one_v_one_participants p
JOIN one_v_one_sessions s ON p.session_id = s.id
ORDER BY p.joined_at DESC
LIMIT 10;

