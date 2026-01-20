-- ============================================================================
-- FIX HOT SELL PRIZE POOL - Ensure prize_pool = participants × entry_fee
-- ============================================================================
-- Issue: Prize pool shows $2.00 when only 1 player joined ($1 entry fee)
-- Expected: Prize pool should show $1.00 (1 player × $1)
-- Root Cause: Prize pool might be initialized with base_price instead of 0
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current hot sell sessions and their prize pools
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '=== Checking Hot Sell Sessions ===';
END $$;

SELECT 
  id::TEXT,
  config_id,
  prize_pool,
  current_pool,
  base_price,
  participants_count,
  status
FROM hot_sell_sessions
WHERE status IN ('waiting', 'active')
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: Fix column confusion - Use prize_pool consistently
-- ============================================================================
-- Ensure prize_pool column exists and current_pot is synced
DO $$ 
BEGIN
  -- Add prize_pool column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' 
    AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE hot_sell_sessions ADD COLUMN prize_pool NUMERIC(18,2) DEFAULT 0;
    RAISE NOTICE '✅ Added prize_pool column';
  END IF;

  -- Sync current_pool to prize_pool if current_pool exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' 
    AND column_name = 'current_pool'
  ) THEN
    UPDATE hot_sell_sessions
    SET prize_pool = COALESCE(current_pool, 0)
    WHERE prize_pool IS NULL OR prize_pool = 0;
    RAISE NOTICE '✅ Synced current_pool to prize_pool';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Recalculate prize_pool from actual participants
-- ============================================================================
-- Prize pool should equal: participants_count × entry_fee
-- For hot sell games, entry_fee is typically $1
UPDATE hot_sell_sessions s
SET prize_pool = COALESCE(
  (
    SELECT COUNT(*) * c.entry_fee
    FROM hot_sell_participants p
    WHERE p.session_id = s.id
  ),
  0
),
participants_count = COALESCE(
  (
    SELECT COUNT(*)
    FROM hot_sell_participants p
    WHERE p.session_id = s.id
  ),
  0
)
FROM hot_sell_configs c
WHERE s.config_id = c.id
  AND s.status IN ('waiting', 'active');

DO $$ 
BEGIN
  RAISE NOTICE '✅ Recalculated prize pools from participant counts';
END $$;

-- ============================================================================
-- STEP 4: Update join_hot_sell_session function to correctly update prize_pool
-- ============================================================================
-- This function is called when a player joins - must add entry_fee to prize_pool
CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
  session_id_param TEXT,
  user_id_param UUID,
  entry_fee_param NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  prize_pool_new NUMERIC,
  session_id_out TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_participant_id UUID;
  v_current_prize_pool NUMERIC;
  v_new_prize_pool NUMERIC;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Convert TEXT to UUID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID format'::TEXT, 0::NUMERIC, ''::TEXT;
    RETURN;
  END;

  -- Get current session state
  SELECT 
    COALESCE(prize_pool, 0),
    COALESCE(participants_count, 0),
    max_participants
  INTO v_current_prize_pool, v_participant_count, v_max_participants
  FROM hot_sell_sessions
  WHERE id = v_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::NUMERIC, ''::TEXT;
    RETURN;
  END IF;

  -- Check if session is full
  IF v_participant_count >= v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Session is full'::TEXT, v_current_prize_pool, session_id_param;
    RETURN;
  END IF;

  -- Check if user already joined
  IF EXISTS (
    SELECT 1 FROM hot_sell_participants 
    WHERE session_id = v_session_id AND user_id = user_id_param
  ) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_current_prize_pool, session_id_param;
    RETURN;
  END IF;

  -- Deduct tokens (using spend_tokens function if exists, or manual deduction)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'spend_tokens') THEN
    -- Use the anti-cheat spend_tokens function
    DECLARE
      spend_result RECORD;
    BEGIN
      SELECT * INTO spend_result FROM spend_tokens(user_id_param, entry_fee_param);
      IF NOT spend_result.success THEN
        RETURN QUERY SELECT FALSE, spend_result.message, v_current_prize_pool, ''::TEXT;
        RETURN;
      END IF;
    END;
  ELSE
    -- Fallback: Manual token deduction
    UPDATE users
    SET purchased_tokens = GREATEST(0, COALESCE(purchased_tokens, 0) - entry_fee_param)
    WHERE id = user_id_param
      AND COALESCE(purchased_tokens, 0) >= entry_fee_param;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT, v_current_prize_pool, ''::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate new prize pool: current + entry fee
  v_new_prize_pool := v_current_prize_pool + entry_fee_param;

  -- Add participant
  v_participant_id := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
  VALUES (v_participant_id, v_session_id, user_id_param, NOW());

  -- Update session with new prize pool and participant count
  UPDATE hot_sell_sessions
  SET 
    prize_pool = v_new_prize_pool,
    participants_count = participants_count + 1,
    status = CASE 
      WHEN participants_count + 1 >= max_participants THEN 'active'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_session_id;

  RAISE NOTICE '✅ Player joined: prize_pool % → % (added $%)', 
    v_current_prize_pool, v_new_prize_pool, entry_fee_param;

  RETURN QUERY SELECT TRUE, 'Joined successfully'::TEXT, v_new_prize_pool, session_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Updated join_hot_sell_session function';
END $$;

-- ============================================================================
-- STEP 5: Ensure sessions are created with prize_pool = 0
-- ============================================================================
-- When creating new sessions, prize_pool must start at 0, not base_price
CREATE OR REPLACE FUNCTION public.create_hot_sell_session_if_needed(
  config_id_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_session RECORD;
  new_session_id UUID;
  config_record RECORD;
BEGIN
  -- Check if active session already exists
  SELECT * INTO existing_session
  FROM hot_sell_sessions
  WHERE config_id = config_id_param
    AND status IN ('waiting', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'session_id', existing_session.id::TEXT,
      'message', 'Using existing session'
    );
  END IF;

  -- Get config details
  SELECT * INTO config_record
  FROM hot_sell_configs
  WHERE id = config_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Config not found');
  END IF;

  -- Create new session with prize_pool = 0
  new_session_id := gen_random_uuid();
  
  INSERT INTO hot_sell_sessions (
    id,
    config_id,
    prize_pool,
    base_price,
    max_participants,
    participants_count,
    status,
    created_at,
    updated_at
  ) VALUES (
    new_session_id,
    config_id_param,
    0,  -- ✅ START AT 0, NOT base_price
    config_record.base_price,
    config_record.max_participants,
    0,
    'waiting',
    NOW(),
    NOW()
  );

  RAISE NOTICE '✅ Created new session with prize_pool = 0';

  RETURN jsonb_build_object(
    'success', true,
    'session_id', new_session_id::TEXT,
    'message', 'New session created'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_hot_sell_session_if_needed(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 6: Verify the fix
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== HOT SELL PRIZE POOL FIX COMPLETE ===';
  RAISE NOTICE '✅ Prize pools recalculated from participant counts';
  RAISE NOTICE '✅ join_hot_sell_session now correctly adds entry_fee to prize_pool';
  RAISE NOTICE '✅ New sessions start with prize_pool = 0';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Sessions:';
END $$;

SELECT 
  config_id,
  participants_count || ' players' as players,
  '$' || prize_pool::TEXT as prize_pool,
  '$' || base_price::TEXT as base_price,
  status
FROM hot_sell_sessions
WHERE status IN ('waiting', 'active')
ORDER BY created_at DESC;

