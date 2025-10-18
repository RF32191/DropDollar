-- COMPREHENSIVE HOT SELL FIX - FINAL VERSION
-- This fixes all remaining issues with hot sell sessions

-- 1. Drop and recreate create_hot_sell_session function
DROP FUNCTION IF EXISTS create_hot_sell_session(TEXT);

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
  
  -- 1. Create an entry in active_fixed_games FIRST (only existing columns)
  INSERT INTO public.active_fixed_games (
    config_id, 
    tournament_type, 
    status, 
    started_at, 
    created_at
  ) VALUES (
    config_record.id,
    config_record.tournament_type,
    'waiting', -- Initial status
    NOW(),
    NOW()
  ) RETURNING id INTO active_game_id;

  -- 2. Create hot sell session, linking to the active_game_id
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
    active_game_id, -- Link to the newly created active game
    0,
    config_record.prize_pool,
    NOW() + INTERVAL '2 hours',
    NOW(),
    'waiting'
  ) RETURNING to_jsonb(hot_sell_sessions.*) INTO session_result;
  
  RETURN session_result;
END;
$$;

-- 2. Drop and recreate join_hot_sell_session function with duplicate check
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
  
  -- Check if user already joined this game
  SELECT * INTO existing_participant 
  FROM public.fixed_game_participants 
  WHERE game_id = active_game_id 
  AND user_id = p_user_id::UUID;
  
  IF FOUND THEN
    RAISE EXCEPTION 'User has already joined this game';
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
    participants_count = participants_count + 1
  WHERE id = p_session_id::UUID;
  
  RETURN participant_result;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION create_hot_sell_session(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION join_hot_sell_session(TEXT, TEXT, INTEGER) TO authenticated, anon;

-- 4. Fix any existing sessions with NULL game_id
DO $$
DECLARE
    session_rec RECORD;
    config_rec RECORD;
    active_game_id UUID;
    sessions_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Fixing existing sessions with NULL game_id...';
    
    FOR session_rec IN 
        SELECT * FROM public.hot_sell_sessions 
        WHERE game_id IS NULL 
        ORDER BY created_at DESC
    LOOP
        -- Get the config for this session
        SELECT * INTO config_rec 
        FROM public.fixed_games_config 
        WHERE id = session_rec.config_id;
        
        IF FOUND THEN
            -- Create an entry in active_fixed_games for this session
            INSERT INTO public.active_fixed_games (
                config_id, 
                tournament_type, 
                status, 
                started_at, 
                created_at
            ) VALUES (
                config_rec.id,
                config_rec.tournament_type,
                session_rec.status,
                session_rec.started_at,
                session_rec.created_at
            ) RETURNING id INTO active_game_id;
            
            -- Update the hot_sell_session with the new game_id
            UPDATE public.hot_sell_sessions
            SET game_id = active_game_id
            WHERE id = session_rec.id;
            
            sessions_fixed := sessions_fixed + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Fixed % sessions with NULL game_id', sessions_fixed;
END $$;

-- 5. Verification
SELECT 
    'COMPREHENSIVE HOT SELL FIX COMPLETED' as status,
    COUNT(*) as total_sessions,
    COUNT(game_id) as sessions_with_game_id,
    COUNT(*) - COUNT(game_id) as sessions_without_game_id
FROM public.hot_sell_sessions;

SELECT 'Hot Sell Functions Fixed!' as message;
