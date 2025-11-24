-- ============================================================================
-- SIMPLE WINNER TAKES IT ALL PAYOUT FIX - NO TOKEN_TRANSACTIONS
-- ============================================================================
-- This fixes Winner Takes It All (WTA) payout and reset separately from 1v1
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD MISSING COLUMNS TO WTA SESSIONS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add current_pot if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_takes_all_sessions' 
        AND column_name = 'current_pot'
    ) THEN
        ALTER TABLE public.winner_takes_all_sessions 
        ADD COLUMN current_pot INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added current_pot column';
    ELSE
        RAISE NOTICE '⚠️ current_pot column already exists';
    END IF;

    -- Add timer_duration if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_takes_all_sessions' 
        AND column_name = 'timer_duration'
    ) THEN
        ALTER TABLE public.winner_takes_all_sessions 
        ADD COLUMN timer_duration INTEGER DEFAULT 60;
        RAISE NOTICE '✅ Added timer_duration column';
    ELSE
        RAISE NOTICE '⚠️ timer_duration column already exists';
    END IF;

    -- Add winner_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_takes_all_sessions' 
        AND column_name = 'winner_user_id'
    ) THEN
        ALTER TABLE public.winner_takes_all_sessions 
        ADD COLUMN winner_user_id UUID;
        RAISE NOTICE '✅ Added winner_user_id column';
    ELSE
        RAISE NOTICE '⚠️ winner_user_id column already exists';
    END IF;

    -- Add prize_amount if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_takes_all_sessions' 
        AND column_name = 'prize_amount'
    ) THEN
        ALTER TABLE public.winner_takes_all_sessions 
        ADD COLUMN prize_amount NUMERIC;
        RAISE NOTICE '✅ Added prize_amount column';
    ELSE
        RAISE NOTICE '⚠️ prize_amount column already exists';
    END IF;

    -- Add platform_fee if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_takes_all_sessions' 
        AND column_name = 'platform_fee'
    ) THEN
        ALTER TABLE public.winner_takes_all_sessions 
        ADD COLUMN platform_fee NUMERIC;
        RAISE NOTICE '✅ Added platform_fee column';
    ELSE
        RAISE NOTICE '⚠️ platform_fee column already exists';
    END IF;

    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_takes_all_sessions' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.winner_takes_all_sessions 
        ADD COLUMN completed_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added completed_at column';
    ELSE
        RAISE NOTICE '⚠️ completed_at column already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: RESET ALL WTA SESSIONS
-- ============================================================================

DELETE FROM public.winner_takes_all_participants;

UPDATE public.winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    timer_duration = 60,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    completed_at = NULL,
    updated_at = NOW();

-- ============================================================================
-- STEP 3: SIMPLE WTA PAYOUT FUNCTION (NO TOKEN_TRANSACTIONS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_wta_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    total_pot NUMERIC;
    v_winner_payout NUMERIC;
    v_platform_fee NUMERIC;
    v_completed_count INT;
BEGIN
    RAISE NOTICE '🏆 ======================================';
    RAISE NOTICE '🏆 WINNER TAKES ALL PAYOUT STARTING';
    RAISE NOTICE '🏆 Config ID: %', config_id_param;
    
    -- Find active session
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
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

    -- Need at least 1 completed game
    SELECT COUNT(*) INTO v_completed_count
    FROM public.winner_takes_all_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;

    IF v_completed_count < 1 THEN
        RAISE NOTICE '⏸️ No completed games';
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No winner';
        RETURN jsonb_build_object('success', false, 'message', 'No winner');
    END IF;

    -- Calculate payouts
    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Empty pot';
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee; -- Winner gets 85%

    RAISE NOTICE '🏆 WINNER: % (score: %) = % tokens', winner_record.username, winner_record.score, v_winner_payout;
    RAISE NOTICE '💼 PLATFORM FEE: % tokens', v_platform_fee;

    -- Pay winner (SIMPLE - just update won_tokens)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    RAISE NOTICE '✅ Winner paid!';

    -- Mark session completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        prize_amount = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;
    
    RAISE NOTICE '✅ Session marked completed';

    -- Wait 2 seconds then reset
    PERFORM pg_sleep(2);
    
    -- Reset session inline
    DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        prize_amount = NULL,
        platform_fee = NULL,
        updated_at = NOW()
    WHERE id = session_record.id;
    
    RAISE NOTICE '✅ Session reset - ready for next game!';
    RAISE NOTICE '🏆 PAYOUT COMPLETE!';
    RAISE NOTICE '🏆 ======================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout complete!',
        'winner_username', winner_record.username,
        'winner_score', winner_record.score,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ FATAL ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_wta_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 4: SIMPLE WTA RESET FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_wta_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    RAISE NOTICE '🔄 Resetting WTA session for config: %', config_id_param;
    
    SELECT id INTO v_session_id
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '⚠️ No completed session';
        RETURN jsonb_build_object('success', false, 'message', 'No completed session');
    END IF;
    
    DELETE FROM public.winner_takes_all_participants WHERE session_id = v_session_id;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        prize_amount = NULL,
        platform_fee = NULL,
        updated_at = NOW()
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ WTA session reset!';
    
    RETURN jsonb_build_object('success', true, 'message', 'Reset complete');
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Reset error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_wta_session(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 5: ENSURE TOKENS ARE NULL-SAFE
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
  RAISE NOTICE '✅ WINNER TAKES ALL FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ All WTA sessions reset';
  RAISE NOTICE '✅ WTA payout function updated';
  RAISE NOTICE '✅ WTA reset function updated';
  RAISE NOTICE '✅ NO token_transactions dependency';
  RAISE NOTICE '✅ NULL-safe token operations';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST NOW:';
  RAISE NOTICE '   1. Players join WTA listing';
  RAISE NOTICE '   2. Players complete games';
  RAISE NOTICE '   3. Timer expires';
  RAISE NOTICE '   4. Winner gets 85%% of pot';
  RAISE NOTICE '   5. Listing resets automatically';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
END $$;

