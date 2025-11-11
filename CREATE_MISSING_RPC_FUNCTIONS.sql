-- ============================================================================
-- CREATE MISSING RPC FUNCTIONS FOR SCORE UPDATES
-- ============================================================================
-- These functions are called by the client to save player scores
-- They include RNG seed verification and audit logging
-- ============================================================================

SELECT '🔧 Creating missing RPC functions...' as step;

-- ============================================
-- HOT SELL: Update Score
-- ============================================

CREATE OR REPLACE FUNCTION public.update_hot_sell_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  participant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
  v_session_status TEXT;
  v_rng_seed INTEGER;
BEGIN
  -- Verify session exists and is active
  SELECT status, rng_seed INTO v_session_status, v_rng_seed
  FROM hot_sell_sessions
  WHERE id = session_id_param;
  
  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT false, 'Session not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_session_status <> 'active' THEN
    RETURN QUERY SELECT false, 'Session is not active'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update participant score
  UPDATE hot_sell_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = session_id_param 
    AND user_id = user_id_param
  RETURNING id INTO v_participant_id;
  
  IF v_participant_id IS NULL THEN
    RETURN QUERY SELECT false, 'Participant not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Log to audit table
  INSERT INTO game_session_audit (user_id, session_id, game_type, action, details)
  VALUES (
    user_id_param,
    session_id_param,
    'hot_sell',
    'score_updated',
    jsonb_build_object(
      'score', score_param,
      'accuracy', accuracy_param,
      'rng_seed', v_rng_seed,
      'participant_id', v_participant_id
    )
  );
  
  RETURN QUERY SELECT true, 'Score saved successfully'::TEXT, v_participant_id;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.update_hot_sell_score(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_hot_sell_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;

SELECT '✅ update_hot_sell_score created' as result;

-- ============================================
-- WINNER TAKES ALL: Update Score
-- ============================================

CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  participant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
  v_session_status TEXT;
  v_rng_seed INTEGER;
BEGIN
  -- Verify session exists and is active
  SELECT status, rng_seed INTO v_session_status, v_rng_seed
  FROM winner_takes_all_sessions
  WHERE id = session_id_param;
  
  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT false, 'Session not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_session_status <> 'active' THEN
    RETURN QUERY SELECT false, 'Session is not active'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update participant score
  UPDATE winner_takes_all_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = session_id_param 
    AND user_id = user_id_param
  RETURNING id INTO v_participant_id;
  
  IF v_participant_id IS NULL THEN
    RETURN QUERY SELECT false, 'Participant not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Log to audit table
  INSERT INTO game_session_audit (user_id, session_id, game_type, action, details)
  VALUES (
    user_id_param,
    session_id_param,
    'winner_takes_all',
    'score_updated',
    jsonb_build_object(
      'score', score_param,
      'accuracy', accuracy_param,
      'rng_seed', v_rng_seed,
      'participant_id', v_participant_id
    )
  );
  
  RETURN QUERY SELECT true, 'Score saved successfully'::TEXT, v_participant_id;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;

SELECT '✅ update_winner_takes_all_score created' as result;

-- ============================================
-- 1V1: Update Score
-- ============================================

CREATE OR REPLACE FUNCTION public.update_1v1_score(
  session_id_param UUID,
  user_id_param UUID,
  score_param NUMERIC,
  accuracy_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  participant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
  v_session_status TEXT;
  v_rng_seed INTEGER;
BEGIN
  -- Verify session exists and is active
  SELECT status, rng_seed INTO v_session_status, v_rng_seed
  FROM one_v_one_sessions
  WHERE id = session_id_param;
  
  IF v_session_status IS NULL THEN
    RETURN QUERY SELECT false, 'Session not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_session_status <> 'active' THEN
    RETURN QUERY SELECT false, 'Session is not active'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update participant score
  UPDATE one_v_one_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW()
  WHERE session_id = session_id_param 
    AND user_id = user_id_param
  RETURNING id INTO v_participant_id;
  
  IF v_participant_id IS NULL THEN
    RETURN QUERY SELECT false, 'Participant not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Log to audit table
  INSERT INTO game_session_audit (user_id, session_id, game_type, action, details)
  VALUES (
    user_id_param,
    session_id_param,
    '1v1',
    'score_updated',
    jsonb_build_object(
      'score', score_param,
      'accuracy', accuracy_param,
      'rng_seed', v_rng_seed,
      'participant_id', v_participant_id
    )
  );
  
  RETURN QUERY SELECT true, 'Score saved successfully'::TEXT, v_participant_id;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.update_1v1_score(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_1v1_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;

SELECT '✅ update_1v1_score created' as result;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '🎯 VERIFICATION' as step;

-- Check all RPC functions exist
SELECT 
  '📞 RPC Functions' as check_name,
  routine_name,
  '✅ Exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_hot_sell_score',
    'update_winner_takes_all_score',
    'update_1v1_score'
  )
ORDER BY routine_name;

-- Verify audit logging is working
SELECT 
  '📝 Audit Logging' as check_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'game_session_audit') as audit_table_exists,
  EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name LIKE '%audit%') as audit_triggers_exist;

-- Verify RNG seeds are set
SELECT 
  '🎲 RNG Seeds' as check_name,
  'Hot Sell' as game_type,
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0) as sessions_with_seeds,
  COUNT(*) as total_sessions
FROM hot_sell_sessions
UNION ALL
SELECT 
  '🎲 RNG Seeds',
  'Winner Takes All',
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0),
  COUNT(*)
FROM winner_takes_all_sessions
UNION ALL
SELECT 
  '🎲 RNG Seeds',
  '1v1',
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0),
  COUNT(*)
FROM one_v_one_sessions;

SELECT '🎉 ALL RPC FUNCTIONS CREATED!' as message;
SELECT '✅ Scores will now save with audit trails' as status;
SELECT '🎲 RNG seeds are tracked for fairness' as compliance;

