-- ============================================================================
-- FIX WTA PAYOUT WITH 30 SECOND WINNER ANIMATION
-- ============================================================================
-- Flow:
-- 1. Payout function: Pays winner, marks complete, creates NEW session immediately
-- 2. Frontend shows 30 second animation (completed session shows winner)
-- 3. New session is ready for players to join during animation
-- 4. No "Session not found" errors!
-- ============================================================================

-- ============================================================================
-- STEP 1: PAYOUT FUNCTION - Pays winner, creates new session immediately
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  winner_record RECORD;
  total_pot NUMERIC;
  v_platform_fee NUMERIC;
  v_winner_payout NUMERIC;
  v_balance_after NUMERIC;
  v_total_participants INTEGER;
  v_completed_participants INTEGER;
BEGIN
  RAISE NOTICE '🎮 Starting payout for config: %', config_id_param;
  
  -- Find the MOST RECENT session for this config
  SELECT * INTO session_record
  FROM public.winner_takes_all_sessions
  WHERE config_id = config_id_param
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE WARNING '⚠️ No session found for config: %', config_id_param;
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Session not found! Please refresh the page or try again.'
    );
  END IF;

  RAISE NOTICE '📊 Found session: % (status: %)', session_record.id, session_record.status;

  -- If already completed and paid, just return success
  IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Already paid out';
    
    -- Get winner info for display
    SELECT 
      p.*,
      COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
    INTO winner_record
    FROM public.winner_takes_all_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
      AND p.user_id = session_record.winner_user_id
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Already paid out',
      'already_paid', true,
      'winner_username', COALESCE(winner_record.username, 'Player'),
      'winner_score', COALESCE(winner_record.score, 0),
      'payout_amount', session_record.winner_prize,
      'show_animation', true
    );
  END IF;

  -- CHECK: Ensure ALL participants have submitted scores
  SELECT COUNT(*) INTO v_total_participants
  FROM public.winner_takes_all_participants
  WHERE session_id = session_record.id;

  SELECT COUNT(*) INTO v_completed_participants
  FROM public.winner_takes_all_participants
  WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;

  RAISE NOTICE '📊 Participants: % total, % completed', v_total_participants, v_completed_participants;

  -- If not all players have finished, don't process payout yet
  IF v_completed_participants < v_total_participants THEN
    RAISE WARNING '⚠️ Not all players have finished yet (%/%)', v_completed_participants, v_total_participants;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Waiting for all players to finish...',
      'waiting', true,
      'completed', v_completed_participants,
      'total', v_total_participants
    );
  END IF;

  -- NOW find winner (highest score) - ALL scores are in
  SELECT 
    p.*,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
  INTO winner_record
  FROM public.winner_takes_all_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE WARNING '⚠️ No scores submitted';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No winner found - no completed games'
    );
  END IF;

  RAISE NOTICE '🏆 WINNER FOUND: % with score: %', winner_record.username, winner_record.score;

  -- Calculate payout (85% winner, 15% platform)
  total_pot := COALESCE(session_record.prize_pool, 0);
  
  IF total_pot <= 0 THEN
    RAISE WARNING '⚠️ Prize pool is empty';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Prize pool is empty'
    );
  END IF;

  v_platform_fee := total_pot * 0.15;
  v_winner_payout := total_pot * 0.85;

  RAISE NOTICE '💰 Payout calculation: Total=$%, Winner=$%, Platform=$%', 
    total_pot, v_winner_payout, v_platform_fee;

  -- PAY THE WINNER
  UPDATE public.users
  SET 
    won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
    updated_at = NOW()
  WHERE id = winner_record.user_id
  RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance_after;

  RAISE NOTICE '✅ Winner paid: $% to % (new balance: $%)', 
    v_winner_payout, winner_record.username, v_balance_after;

  -- Record transaction
  INSERT INTO public.token_transactions (
    user_id, 
    transaction_type, 
    amount,
    balance_after,
    description
  )
  VALUES (
    winner_record.user_id,
    'game_win',
    v_winner_payout,
    v_balance_after,
    'Winner Takes All - ' || config_id_param
  );

  RAISE NOTICE '💳 Transaction recorded';

  -- MARK SESSION COMPLETED with winner info
  UPDATE public.winner_takes_all_sessions
  SET 
    status = 'completed',
    winner_user_id = winner_record.user_id,
    winner_prize = v_winner_payout,
    platform_fee_amount = v_platform_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = session_record.id;

  RAISE NOTICE '✅ Session marked completed';

  -- CREATE NEW SESSION IMMEDIATELY so players can join right away
  DECLARE
    v_new_session_id UUID;
    v_config_record RECORD;
  BEGIN
    -- Get config details
    SELECT * INTO v_config_record
    FROM winner_takes_all_configs
    WHERE id = config_id_param;
    
    -- Delete any leftover waiting/active sessions
    DELETE FROM winner_takes_all_sessions
    WHERE config_id = config_id_param
      AND status IN ('waiting', 'active')
      AND id != session_record.id;
    
    -- Create brand new session
    v_new_session_id := gen_random_uuid();
    
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
      v_new_session_id,
      config_id_param,
      0,
      v_config_record.base_price,
      0,
      'waiting',
      NULL,
      COALESCE(v_config_record.timer_duration, 7200),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '🎮 Created new session immediately: %', v_new_session_id;
  END;

  -- Return success with ALL winner info for frontend animation
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Winner announced! Show animation for 30 seconds',
    'winner_username', winner_record.username,
    'winner_user_id', winner_record.user_id::TEXT,
    'winner_score', winner_record.score,
    'payout_amount', v_winner_payout,
    'platform_fee', v_platform_fee,
    'total_pot', total_pot,
    'show_animation', true,
    'animation_duration', 30
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Payout error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false, 
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Payout function updated - creates new session immediately';
END $$;

-- ============================================================================
-- STEP 2: RESET FUNCTION (OPTIONAL - for manual resets only)
-- ============================================================================
-- Note: This is only needed if you want to manually reset a listing
-- The payout function already creates the new session automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_winner_takes_all_listing(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_session_id UUID;
  v_config_record RECORD;
  v_existing_waiting_session_id UUID;
BEGIN
  RAISE NOTICE '🔄 Resetting listing for config: %', config_id_param;
  
  -- Get config details
  SELECT * INTO v_config_record
  FROM winner_takes_all_configs
  WHERE id = config_id_param;
  
  IF NOT FOUND THEN
    RAISE WARNING '⚠️ Config not found: %', config_id_param;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Config not found'
    );
  END IF;
  
  -- Check if a waiting/active session already exists
  SELECT id INTO v_existing_waiting_session_id
  FROM winner_takes_all_sessions
  WHERE config_id = config_id_param
    AND status IN ('waiting', 'active')
  LIMIT 1;
  
  IF v_existing_waiting_session_id IS NOT NULL THEN
    RAISE NOTICE '✅ Session already exists: %', v_existing_waiting_session_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Session already exists',
      'session_id', v_existing_waiting_session_id::TEXT
    );
  END IF;
  
  -- Delete any leftover waiting/active sessions (shouldn't exist but just in case)
  DELETE FROM winner_takes_all_sessions
  WHERE config_id = config_id_param
    AND status IN ('waiting', 'active');
  
  -- Create brand new session
  v_new_session_id := gen_random_uuid();
  
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
    v_new_session_id,
    config_id_param,
    0,
    v_config_record.base_price,
    0,
    'waiting',
    NULL,
    COALESCE(v_config_record.timer_duration, 7200),
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '🎮 Created new session: %', v_new_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Listing reset successfully',
    'session_id', v_new_session_id::TEXT
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Reset error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false, 
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_winner_takes_all_listing(TEXT) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Reset function created';
END $$;

-- ============================================================================
-- ENSURE ALL CONFIGS HAVE SESSIONS
-- ============================================================================
DO $$
DECLARE
  config_rec RECORD;
  v_active_session_count INTEGER;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '🔍 Checking all configs have sessions...';
  
  FOR config_rec IN 
    SELECT id, title, base_price, timer_duration
    FROM winner_takes_all_configs
    WHERE is_active = true
  LOOP
    SELECT COUNT(*) INTO v_active_session_count
    FROM winner_takes_all_sessions
    WHERE config_id = config_rec.id
      AND status IN ('waiting', 'active');
    
    IF v_active_session_count = 0 THEN
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
      RAISE NOTICE '✅ Created session for: %', config_rec.title;
    ELSIF v_active_session_count > 1 THEN
      DELETE FROM winner_takes_all_sessions
      WHERE config_id = config_rec.id
        AND status IN ('waiting', 'active')
        AND id NOT IN (
          SELECT id FROM winner_takes_all_sessions
          WHERE config_id = config_rec.id
            AND status IN ('waiting', 'active')
          ORDER BY created_at DESC
          LIMIT 1
        );
      RAISE NOTICE '🧹 Cleaned up duplicate sessions for: %', config_rec.title;
    ELSE
      RAISE NOTICE '✅ Session exists for: %', config_rec.title;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ All configs have exactly one active session';
END $$;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ WTA PAYOUT WITH 30 SECOND ANIMATION - READY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Frontend Flow:';
  RAISE NOTICE '1. All players finish → Scores saved';
  RAISE NOTICE '2. Call payout function → Winner paid';
  RAISE NOTICE '3. New session created IMMEDIATELY';
  RAISE NOTICE '4. Show 30 SECOND COUNTDOWN with animation';
  RAISE NOTICE '5. Players can join new game during animation';
  RAISE NOTICE '6. No "Session not found" errors!';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '- process_payout_by_config(config_id) → Pays winner + creates new session';
  RAISE NOTICE '- reset_winner_takes_all_listing(config_id) → Manual reset (optional)';
  RAISE NOTICE ' ';
  RAISE NOTICE '📋 Current Sessions:';
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
  RAISE NOTICE '🎮 Ready! New session created immediately - no waiting!';
  RAISE NOTICE ' ';
END $$;

