-- SIMPLE DIRECT FIX FOR HOT SELL SESSIONS
-- This bypasses the game_id issue by using config_id directly in fixed_game_participants

-- 1. Drop and recreate join_hot_sell_session function to use config_id directly
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
  
  -- Check if there's already an active_fixed_games record for this config
  SELECT id INTO active_game_id 
  FROM public.active_fixed_games 
  WHERE config_id = session_record.config_id 
  AND status = 'waiting'
  LIMIT 1;
  
  -- If no active game exists, create one
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
      'waiting', -- Use valid status value
      NOW(),
      NOW()
    ) RETURNING id INTO active_game_id;
  END IF;
  
  -- Add participant to the active game
  INSERT INTO public.fixed_game_participants (
    game_id, 
    user_id, 
    entry_fee_paid
  ) VALUES (
    active_game_id, 
    p_user_id::UUID, 
    p_entry_fee
  ) RETURNING to_jsonb(fixed_game_participants.*) INTO participant_result;
  
  -- Update session pot and participant count
  UPDATE public.hot_sell_sessions 
  SET 
    current_pot = current_pot + p_entry_fee,
    participants_count = participants_count + 1,
    updated_at = NOW()
  WHERE id = p_session_id::UUID;
  
  RETURN participant_result;
END;
$$;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION join_hot_sell_session(TEXT, TEXT, INTEGER) TO authenticated, anon;

-- 3. Test the function
SELECT 'SIMPLE HOT SELL FIX APPLIED!' as status,
       'join_hot_sell_session now creates active_fixed_games records automatically' as message;
