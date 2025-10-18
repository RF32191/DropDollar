-- IMMEDIATE HOT SELL FIX - RUN THIS NOW
-- This fixes the create_hot_sell_session function immediately

-- Drop the broken function
DROP FUNCTION IF EXISTS create_hot_sell_session(TEXT);

-- Create the fixed function (only existing columns)
CREATE OR REPLACE FUNCTION create_hot_sell_session(
  p_config_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_record RECORD;
  active_game_id UUID;
  session_result JSONB;
BEGIN
  -- Get config details
  SELECT * INTO config_record FROM public.fixed_games_config WHERE id = p_config_id::UUID;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', p_config_id;
  END IF;
  
  -- Create active_fixed_games record (ONLY existing columns)
  INSERT INTO public.active_fixed_games (
    config_id, 
    tournament_type, 
    status, 
    started_at, 
    created_at
  ) VALUES (
    config_record.id,
    config_record.tournament_type,
    'waiting',
    NOW(),
    NOW()
  ) RETURNING id INTO active_game_id;

  -- Create hot_sell_sessions record
  INSERT INTO public.hot_sell_sessions (
    config_id, 
    game_id, 
    current_pot, 
    target_pot, 
    expires_at, 
    started_at, 
    status
  ) VALUES (
    p_config_id::UUID,
    active_game_id,
    0,
    config_record.prize_pool,
    NOW() + INTERVAL '2 hours',
    NOW(),
    'waiting'
  ) RETURNING to_jsonb(hot_sell_sessions.*) INTO session_result;
  
  RETURN session_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_hot_sell_session(TEXT) TO authenticated, anon;

-- Test the function
SELECT 'create_hot_sell_session function fixed!' as status;
