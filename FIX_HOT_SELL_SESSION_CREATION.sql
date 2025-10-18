-- ========================================
-- FIX HOT SELL SESSION CREATION
-- ========================================
-- This script fixes the create_hot_sell_session function to properly create active_fixed_games records
-- Run this in Supabase SQL Editor to fix the foreign key constraint issue

-- Drop the existing function
DROP FUNCTION IF EXISTS create_hot_sell_session(TEXT);

-- Create the fixed function
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
  
  -- Create active fixed game first
  INSERT INTO public.active_fixed_games (
    config_id, 
    game_type, 
    tournament_type, 
    title, 
    description, 
    entry_fee, 
    prize_pool, 
    max_participants, 
    game_duration, 
    rng_seed,
    status,
    created_at,
    expires_at
  ) VALUES (
    p_config_id::UUID,
    config_record.game_type,
    config_record.tournament_type,
    config_record.title,
    config_record.description,
    config_record.entry_fee,
    config_record.prize_pool,
    config_record.max_participants,
    config_record.game_duration,
    config_record.rng_seed,
    'active',
    NOW(),
    NOW() + INTERVAL '2 hours'
  ) RETURNING id INTO active_game_id;
  
  -- Create hot sell session with the active game ID
  INSERT INTO public.hot_sell_sessions (
    config_id, 
    game_id,
    current_pot, 
    target_pot, 
    expires_at
  ) VALUES (
    p_config_id::UUID, 
    active_game_id,
    0, 
    config_record.prize_pool, 
    NOW() + INTERVAL '2 hours'
  ) RETURNING to_jsonb(hot_sell_sessions.*) INTO session_result;
  
  RETURN session_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_hot_sell_session TO authenticated;
GRANT EXECUTE ON FUNCTION create_hot_sell_session TO anon;

-- Also fix the join_hot_sell_session function to use the correct game_id
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
  participant_result JSONB;
BEGIN
  -- Get session details including the game_id
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;
  
  -- Add participant to the session's game using the correct game_id
  INSERT INTO public.fixed_game_participants (
    game_id, user_id, entry_fee_paid
  ) VALUES (
    session_record.game_id, p_user_id, p_entry_fee
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION join_hot_sell_session TO authenticated;
GRANT EXECUTE ON FUNCTION join_hot_sell_session TO anon;

-- Add game_id column to hot_sell_sessions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hot_sell_sessions' AND column_name = 'game_id') THEN
        ALTER TABLE public.hot_sell_sessions ADD COLUMN game_id UUID REFERENCES public.active_fixed_games(id);
    END IF;
END $$;

-- Update existing hot_sell_sessions to have proper game_id references
UPDATE public.hot_sell_sessions 
SET game_id = (
    SELECT id FROM public.active_fixed_games 
    WHERE config_id = hot_sell_sessions.config_id 
    LIMIT 1
)
WHERE game_id IS NULL;

SELECT 'Hot sell session creation fixed!' as status,
       'Now creates both active_fixed_games and hot_sell_sessions records' as message;
