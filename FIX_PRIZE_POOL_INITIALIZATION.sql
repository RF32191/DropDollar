-- ============================================================================
-- FIX PRIZE POOL INITIALIZATION - Set to 0 instead of 1
-- ============================================================================
-- This script ensures all hot sell sessions start with prize_pool = 0
-- and fixes any sessions that incorrectly have prize_pool = 1
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix existing sessions with incorrect prize_pool
-- ============================================================================
UPDATE public.hot_sell_sessions
SET prize_pool = 0
WHERE prize_pool = 1 OR (prize_pool IS NULL AND status = 'waiting');

-- ============================================================================
-- STEP 2: Ensure prize_pool defaults to 0 in table schema
-- ============================================================================
ALTER TABLE public.hot_sell_sessions
ALTER COLUMN prize_pool SET DEFAULT 0;

-- ============================================================================
-- STEP 3: Update create_hot_sell_session function to ensure prize_pool = 0
-- ============================================================================
-- Fix the create_hot_sell_session function to set prize_pool = 0
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
  -- Get config details (try both table names)
  BEGIN
    SELECT * INTO config_record FROM public.hot_sell_configs WHERE id = p_config_id;
    IF NOT FOUND THEN
      SELECT * INTO config_record FROM public.fixed_games_config WHERE id = p_config_id::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    SELECT * INTO config_record FROM public.fixed_games_config WHERE id = p_config_id::UUID;
  END;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config not found: %', p_config_id;
  END IF;
  
  -- Create active_fixed_games record if needed
  BEGIN
    INSERT INTO public.active_fixed_games (
      config_id, 
      tournament_type, 
      status, 
      started_at, 
      created_at
    ) VALUES (
      COALESCE(config_record.id::UUID, p_config_id::UUID),
      'hot_sell',
      'waiting',
      NOW(),
      NOW()
    ) RETURNING id INTO active_game_id;
  EXCEPTION WHEN OTHERS THEN
    -- If table doesn't exist or insert fails, continue without game_id
    active_game_id := NULL;
  END;

  -- Create hot_sell_sessions record with prize_pool = 0
  INSERT INTO public.hot_sell_sessions (
    config_id, 
    game_id,
    prize_pool,
    base_price,
    max_participants,
    participants_count,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_config_id,
    active_game_id,
    0,  -- prize_pool starts at 0
    COALESCE(config_record.base_price, 0),
    COALESCE(config_record.max_participants, 0),
    0,  -- participants_count starts at 0
    'waiting',
    NOW(),
    NOW()
  ) RETURNING to_jsonb(hot_sell_sessions.*) INTO session_result;
  
  RETURN session_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_hot_sell_session(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 4: Verify fixes
-- ============================================================================
DO $$
DECLARE
    v_waiting_count INTEGER;
    v_incorrect_count INTEGER;
BEGIN
    -- Count waiting sessions
    SELECT COUNT(*) INTO v_waiting_count
    FROM public.hot_sell_sessions
    WHERE status = 'waiting';
    
    -- Count sessions with incorrect prize_pool
    SELECT COUNT(*) INTO v_incorrect_count
    FROM public.hot_sell_sessions
    WHERE prize_pool = 1 OR (prize_pool IS NULL AND status = 'waiting');
    
    RAISE NOTICE '✅ Waiting sessions: %', v_waiting_count;
    RAISE NOTICE '✅ Sessions with incorrect prize_pool: %', v_incorrect_count;
    
    IF v_incorrect_count > 0 THEN
        RAISE NOTICE '⚠️ Some sessions still have incorrect prize_pool - may need manual fix';
    ELSE
        RAISE NOTICE '✅ All sessions have correct prize_pool (0 or actual value)';
    END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ PRIZE POOL INITIALIZATION FIXED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All sessions with prize_pool = 1 have been set to 0';
    RAISE NOTICE '✅ Default value for prize_pool is now 0';
    RAISE NOTICE '✅ New sessions will start with prize_pool = 0';
    RAISE NOTICE '✅ ============================================================';
END $$;

