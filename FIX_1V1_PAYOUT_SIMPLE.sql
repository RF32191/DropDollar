-- ============================================================================
-- SIMPLE 1V1 PAYOUT FIX - NO TOKEN_TRANSACTIONS
-- ============================================================================
-- This fixes the payout and reset without relying on token_transactions table
-- ============================================================================

-- ============================================================================
-- STEP 1: RESET ALL 1V1 SESSIONS
-- ============================================================================

DELETE FROM public.one_v_one_participants;

UPDATE public.one_v_one_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    loser_user_id = NULL,
    winner_prize = NULL,
    loser_prize = NULL,
    platform_fee = NULL,
    completed_at = NULL,
    updated_at = NOW();

-- ============================================================================
-- STEP 2: SIMPLE PAYOUT FUNCTION (NO TOKEN_TRANSACTIONS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    loser_record RECORD;
    total_pot NUMERIC;
    v_winner_payout NUMERIC;
    v_loser_payout NUMERIC;
    v_platform_fee NUMERIC;
    v_completed_count INT;
BEGIN
    RAISE NOTICE '💰 ======================================';
    RAISE NOTICE '💰 1V1 PAYOUT STARTING';
    RAISE NOTICE '💰 Config ID: %', config_id_param;
    
    -- Find active session
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session';
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Check if already paid
    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Already paid';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Need 2 players
    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '❌ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;

    -- Count completed games
    SELECT COUNT(*) INTO v_completed_count
    FROM public.one_v_one_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;

    IF v_completed_count < 2 THEN
        RAISE NOTICE '⏸️ Waiting for both players';
        RETURN jsonb_build_object('success', false, 'message', 'Waiting for both to complete');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No winner';
        RETURN jsonb_build_object('success', false, 'message', 'No winner');
    END IF;

    -- Get loser
    SELECT p.*, u.username, u.email
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.user_id != winner_record.user_id
    LIMIT 1;

    -- Calculate payouts
    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Empty pot';
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 WINNER: % (score: %) = % tokens', winner_record.username, winner_record.score, v_winner_payout;
    RAISE NOTICE '🥈 LOSER: % (score: %) = % tokens', loser_record.username, loser_record.score, v_loser_payout;
    RAISE NOTICE '💼 PLATFORM FEE: % tokens', v_platform_fee;

    -- Pay winner (SIMPLE - just update won_tokens)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    RAISE NOTICE '✅ Winner paid!';

    -- Pay loser (SIMPLE - just update won_tokens)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
        updated_at = NOW()
    WHERE id = loser_record.user_id;
    
    RAISE NOTICE '✅ Loser paid!';

    -- Mark session completed
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = loser_record.user_id,
        winner_prize = v_winner_payout,
        loser_prize = v_loser_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;
    
    RAISE NOTICE '✅ Session marked completed';

    -- Wait 2 seconds then reset
    PERFORM pg_sleep(2);
    
    -- Reset session inline (no separate function call)
    DELETE FROM public.one_v_one_participants WHERE session_id = session_record.id;
    
    UPDATE public.one_v_one_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        loser_user_id = NULL,
        winner_prize = NULL,
        loser_prize = NULL,
        platform_fee = NULL,
        updated_at = NOW()
    WHERE id = session_record.id;
    
    RAISE NOTICE '✅ Session reset - ready for next game!';
    RAISE NOTICE '💰 PAYOUT COMPLETE!';
    RAISE NOTICE '💰 ======================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout complete!',
        'winner_username', winner_record.username,
        'winner_score', winner_record.score,
        'winner_payout', v_winner_payout,
        'loser_username', loser_record.username,
        'loser_score', loser_record.score,
        'loser_payout', v_loser_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ FATAL ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 3: SIMPLE RESET FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    RAISE NOTICE '🔄 Resetting session for config: %', config_id_param;
    
    SELECT id INTO v_session_id
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '⚠️ No completed session';
        RETURN jsonb_build_object('success', false, 'message', 'No completed session');
    END IF;
    
    DELETE FROM public.one_v_one_participants WHERE session_id = v_session_id;
    
    UPDATE public.one_v_one_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        loser_user_id = NULL,
        winner_prize = NULL,
        loser_prize = NULL,
        platform_fee = NULL,
        updated_at = NOW()
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ Session reset!';
    
    RETURN jsonb_build_object('success', true, 'message', 'Reset complete');
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Reset error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 4: ENSURE TOKENS ARE NULL-SAFE
-- ============================================================================

UPDATE public.users 
SET won_tokens = COALESCE(won_tokens, 0) 
WHERE won_tokens IS NULL;

UPDATE public.users 
SET purchased_tokens = COALESCE(purchased_tokens, 0) 
WHERE purchased_tokens IS NULL;

ALTER TABLE public.users
ALTER COLUMN won_tokens SET DEFAULT 0,
ALTER COLUMN purchased_tokens SET DEFAULT 0;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ 1V1 PAYOUT FIXED (SIMPLE VERSION)!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ All sessions reset';
  RAISE NOTICE '✅ Payout function updated';
  RAISE NOTICE '✅ Reset function updated';
  RAISE NOTICE '✅ NO token_transactions dependency';
  RAISE NOTICE '✅ NULL-safe token operations';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST NOW:';
  RAISE NOTICE '   1. Two players join 1v1';
  RAISE NOTICE '   2. Both complete game';
  RAISE NOTICE '   3. Watch payout happen';
  RAISE NOTICE '   4. Listing resets automatically';
  RAISE NOTICE '   5. Check wallets for tokens';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
END $$;

