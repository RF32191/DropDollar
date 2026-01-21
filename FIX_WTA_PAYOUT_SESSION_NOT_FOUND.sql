-- ============================================================================
-- FIX WINNER TAKES ALL PAYOUT - SESSION NOT FOUND ISSUE
-- ============================================================================
-- This fixes the "Session not found" error in WTA payout processing
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix the process_payout_by_config function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  winner_record RECORD;
  winner_username TEXT;
  total_pot NUMERIC;
  v_platform_fee NUMERIC;
  v_winner_payout NUMERIC;
BEGIN
  RAISE NOTICE 'Starting payout for config: %', config_id_param;
  
  -- Find the most recent session for this config (any status)
  SELECT * INTO session_record
  FROM public.winner_takes_all_sessions
  WHERE config_id = config_id_param
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE WARNING 'No session found for config: %', config_id_param;
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'No session found for this game',
      'config_id', config_id_param
    );
  END IF;

  RAISE NOTICE 'Found session: %, status: %', session_record.id, session_record.status;

  -- Check if already paid out
  IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
    SELECT username INTO winner_username 
    FROM public.users 
    WHERE id = session_record.winner_user_id;
    
    RAISE NOTICE 'Session already paid out to: %', winner_username;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Session already paid out',
      'winner_username', COALESCE(winner_username, 'Anonymous'),
      'payout_amount', session_record.winner_prize,
      'already_paid', true
    );
  END IF;

  -- Get participants count
  DECLARE
    v_participants_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_participants_count
    FROM public.winner_takes_all_participants
    WHERE session_id = session_record.id;
    
    RAISE NOTICE 'Participants count: %', v_participants_count;
    
    IF v_participants_count = 0 THEN
      RAISE WARNING 'No participants found for session: %', session_record.id;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'No participants in this game session'
      );
    END IF;
  END;

  -- Find winner (highest score)
  SELECT p.*, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
  INTO winner_record
  FROM public.winner_takes_all_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = session_record.id
  AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE WARNING 'No scores submitted for session: %', session_record.id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No winner found - no completed games',
      'config_id', config_id_param
    );
  END IF;

  RAISE NOTICE 'Winner found: % with score: %', winner_record.username, winner_record.score;

  -- Calculate payout (85% winner, 15% platform)
  total_pot := COALESCE(session_record.prize_pool, 0);
  
  IF total_pot <= 0 THEN
    RAISE WARNING 'Prize pool is empty: %', total_pot;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Prize pool is empty',
      'total_pot', total_pot
    );
  END IF;

  v_platform_fee := total_pot * 0.15;
  v_winner_payout := total_pot * 0.85;

  RAISE NOTICE 'Payout calculation - Total: $%, Winner: $%, Platform: $%', 
    total_pot, v_winner_payout, v_platform_fee;

  -- Pay winner to won_tokens wallet
  UPDATE public.users
  SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
      updated_at = NOW()
  WHERE id = winner_record.user_id;

  RAISE NOTICE 'Winner paid: $% to user: %', v_winner_payout, winner_record.user_id;

  -- Record transaction
  INSERT INTO public.token_transactions (
    user_id, 
    type, 
    transaction_type, 
    amount, 
    description
  )
  VALUES (
    winner_record.user_id,
    'credit',
    'game_win',
    v_winner_payout,
    'Winner Takes All - ' || config_id_param
  );

  RAISE NOTICE 'Transaction recorded';

  -- Mark session as completed
  UPDATE public.winner_takes_all_sessions
  SET 
    status = 'completed',
    winner_user_id = winner_record.user_id,
    winner_prize = v_winner_payout,
    platform_fee_amount = v_platform_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = session_record.id;

  RAISE NOTICE 'Session marked as completed';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payout successful',
    'winner_username', winner_record.username,
    'winner_user_id', winner_record.user_id::TEXT,
    'winner_score', winner_record.score,
    'payout_amount', v_winner_payout,
    'platform_fee', v_platform_fee,
    'total_pot', total_pot
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Payout error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false, 
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE 'WTA payout function updated with better error handling';
END $$;

-- ============================================================================
-- STEP 2: Ensure all WTA configs have active sessions
-- ============================================================================
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE 'Ensuring all configs have sessions...';
  
  FOR config_rec IN 
    SELECT id, game_type, title, base_price, timer_duration
    FROM winner_takes_all_configs
    WHERE is_active = true
  LOOP
    -- Check if this config has an active session
    SELECT EXISTS (
      SELECT 1 FROM winner_takes_all_sessions
      WHERE config_id = config_rec.id
      AND status IN ('waiting', 'active')
    ) INTO session_exists;
    
    IF NOT session_exists THEN
      -- Create a new session for this config
      INSERT INTO winner_takes_all_sessions (
        id,
        config_id,
        prize_pool,
        base_price,
        participants_count,
        status,
        timer_started_at,
        timer_duration,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        config_rec.id,
        0,
        config_rec.base_price,
        0,
        'waiting',
        NULL,
        COALESCE(config_rec.timer_duration, 7200),
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created session for: %', config_rec.title;
    ELSE
      RAISE NOTICE 'Session exists for: %', config_rec.title;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'All configs have sessions';
END $$;

-- ============================================================================
-- STEP 3: Verify setup
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '=== WTA PAYOUT FIX COMPLETE ===';
  RAISE NOTICE 'Fixed process_payout_by_config function';
  RAISE NOTICE 'Added better error handling';
  RAISE NOTICE 'Ensured all configs have sessions';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Current WTA Sessions:';
END $$;

SELECT 
  s.config_id,
  c.title,
  s.participants_count || ' players' as players,
  '$' || s.prize_pool::TEXT as prize_pool,
  s.status
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY c.base_price;

DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE 'WTA is ready for testing!';
  RAISE NOTICE ' ';
END $$;

