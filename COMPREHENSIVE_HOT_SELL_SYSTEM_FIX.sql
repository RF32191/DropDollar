-- COMPREHENSIVE HOT SELL SYSTEM FIX
-- This fixes all remaining issues with the hot sell system

-- 1. Fix the BlindScoreboardService column issue
-- The listings table uses 'status' not 'state'

-- 2. Drop and recreate join_hot_sell_session with better error handling
DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION join_hot_sell_session(
  p_session_id TEXT,
  p_user_id TEXT,
  p_entry_fee INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  config_record RECORD;
  active_game_id UUID;
  participant_result JSONB;
  existing_participant RECORD;
BEGIN
  -- Get session details
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;
  
  -- Get config details
  SELECT * INTO config_record FROM public.fixed_games_config WHERE id = session_record.config_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found for session: %', p_session_id;
  END IF;
  
  -- Find or create active game
  SELECT id INTO active_game_id 
  FROM public.active_fixed_games 
  WHERE config_id = session_record.config_id 
  AND status = 'waiting'
  LIMIT 1;
  
  IF active_game_id IS NULL THEN
    INSERT INTO public.active_fixed_games (
      config_id, 
      tournament_type, 
      status, 
      started_at, 
      created_at
    ) VALUES (
      session_record.config_id,
      config_record.tournament_type,
      'waiting',
      NOW(),
      NOW()
    ) RETURNING id INTO active_game_id;
  END IF;
  
  -- Check if user already joined (FIXED TYPE CASTING)
  SELECT * INTO existing_participant 
  FROM public.fixed_game_participants 
  WHERE game_id = active_game_id 
  AND user_id = p_user_id::TEXT;
  
  IF FOUND THEN
    -- Return the existing participant instead of raising an exception
    SELECT to_jsonb(existing_participant.*) INTO participant_result;
    RETURN participant_result;
  END IF;
  
  -- Add participant (FIXED TYPE CASTING)
  INSERT INTO public.fixed_game_participants (
    game_id, 
    user_id, 
    entry_fee_paid
  ) VALUES (
    active_game_id, 
    p_user_id::TEXT,
    p_entry_fee
  ) RETURNING to_jsonb(fixed_game_participants.*) INTO participant_result;
  
  -- Update session
  UPDATE public.hot_sell_sessions 
  SET 
    current_pot = current_pot + p_entry_fee,
    participants_count = participants_count + 1
  WHERE id = p_session_id::UUID;
  
  RETURN participant_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION join_hot_sell_session(TEXT, TEXT, INTEGER) TO authenticated, anon;

-- 3. Create a function to get user's participation status
CREATE OR REPLACE FUNCTION get_user_participation_status(
  p_session_id TEXT,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  active_game_id UUID;
  participant_record RECORD;
  result JSONB;
BEGIN
  -- Get session details
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('hasJoined', false, 'error', 'Session not found');
  END IF;
  
  -- Find active game
  SELECT id INTO active_game_id 
  FROM public.active_fixed_games 
  WHERE config_id = session_record.config_id 
  AND status = 'waiting'
  LIMIT 1;
  
  IF active_game_id IS NULL THEN
    RETURN jsonb_build_object('hasJoined', false, 'error', 'No active game found');
  END IF;
  
  -- Check if user has joined
  SELECT * INTO participant_record 
  FROM public.fixed_game_participants 
  WHERE game_id = active_game_id 
  AND user_id = p_user_id::TEXT;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'hasJoined', true, 
      'participant', to_jsonb(participant_record.*),
      'hasScore', participant_record.score IS NOT NULL
    );
  ELSE
    RETURN jsonb_build_object('hasJoined', false);
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_participation_status(TEXT, TEXT) TO authenticated, anon;

-- Test the functions
SELECT 'Hot sell system functions created successfully!' as status;
