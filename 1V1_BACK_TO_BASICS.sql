-- ============================================================================
-- 1V1 BACK TO BASICS - USING THE WORKING CODE FROM BEFORE
-- ============================================================================
-- This is based on RESET_1V1_AND_FIX_PAYOUTS.sql that WAS working
-- Just ensuring payout and reset work properly
-- ============================================================================

-- Ensure tokens are NULL-safe
UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) WHERE won_tokens IS NULL;
UPDATE public.users SET purchased_tokens = COALESCE(purchased_tokens, 0) WHERE purchased_tokens IS NULL;

-- ============================================================================
-- PAYOUT FUNCTION (the one that was working before)
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);

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
    RAISE NOTICE '💰 [1V1 PAYOUT] Starting for config: %', config_id_param;
    
    -- Find the active session
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session found';
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Session already paid out';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '⏸️ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;

    -- Count how many players have completed
    SELECT COUNT(*) INTO v_completed_count
    FROM public.one_v_one_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;

    IF v_completed_count < 2 THEN
        RAISE NOTICE '⏸️ Only % completed game(s)', v_completed_count;
        RETURN jsonb_build_object('success', false, 'message', 'Waiting for both players to finish');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No winner found';
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
        RAISE NOTICE '❌ Prize pool is empty';
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 Winner: % gets %', winner_record.username, v_winner_payout;
    RAISE NOTICE '🥈 Loser: % gets %', COALESCE(loser_record.username, 'None'), v_loser_payout;

    -- Pay winner
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    -- Pay loser if exists
    IF loser_record IS NOT NULL THEN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
            updated_at = NOW()
        WHERE id = loser_record.user_id;
    END IF;

    -- Mark session as completed
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL),
        winner_prize = v_winner_payout,
        loser_prize = COALESCE(v_loser_payout, 0),
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    -- Create new waiting session immediately
    INSERT INTO public.one_v_one_sessions (
        id, config_id, status, participants_count, current_pot, rng_seed, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(),
        config_id_param,
        'waiting',
        0,
        0,
        session_record.rng_seed,
        NOW(),
        NOW()
    );

    -- Clear old participants
    DELETE FROM public.one_v_one_participants WHERE session_id = session_record.id;

    RAISE NOTICE '✅ Payout complete! Session reset!';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.username,
        'loser_username', COALESCE(loser_record.username, 'None'),
        'winner_payout', v_winner_payout,
        'loser_payout', v_loser_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Fatal error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ 1V1 PAYOUT & RESET FIXED!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ Based on working code from before';
    RAISE NOTICE '✅ Payouts: 50%% winner, 35%% loser, 15%% platform';
    RAISE NOTICE '✅ Auto-reset: New session created immediately';
    RAISE NOTICE '✅ Fair skill-based: Highest score wins';
    RAISE NOTICE '✅ ========================================';
END $$;

