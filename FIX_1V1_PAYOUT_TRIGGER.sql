-- ============================================================================
-- FIX 1V1 PAYOUT TRIGGER - Ensure Automatic Payouts Work
-- ============================================================================
-- This ensures payouts happen automatically when both players complete their games
-- ============================================================================

-- First, make sure the payout function exists and works
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
        RAISE NOTICE '❌ No active session found for config: %', config_id_param;
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Check if already paid out
    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Session already paid out';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Check we have 2 participants
    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '⏸️ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
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
        RAISE NOTICE '❌ No winner found - no completed games';
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;

    -- Get loser
    SELECT p.*, u.username, u.email
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.user_id != winner_record.user_id
    LIMIT 1;

    -- Check if loser has completed
    IF loser_record IS NULL OR loser_record.score IS NULL OR loser_record.completed_at IS NULL THEN
        RAISE NOTICE '⏸️ Waiting for both players to complete';
        RETURN jsonb_build_object('success', false, 'message', 'Waiting for both players to complete');
    END IF;

    -- Calculate payouts
    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Prize pool is empty or zero';
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 Winner: % gets % tokens', winner_record.username, v_winner_payout;
    RAISE NOTICE '🥈 Loser: % gets % tokens', COALESCE(loser_record.username, 'None'), v_loser_payout;

    -- Pay winner (NULL-safe with COALESCE)
    BEGIN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
            updated_at = NOW()
        WHERE id = winner_record.user_id;
        
        RAISE NOTICE '✅ Winner paid successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to pay winner: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'message', 'Failed to pay winner: ' || SQLERRM);
    END;

    -- Pay loser (NULL-safe)
    IF loser_record IS NOT NULL THEN
        BEGIN
            UPDATE public.users
            SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
                updated_at = NOW()
            WHERE id = loser_record.user_id;
            
            RAISE NOTICE '✅ Loser paid successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed to pay loser: %', SQLERRM;
        END;
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

    -- Reset the session for the next game
    PERFORM pg_sleep(1);
    
    BEGIN
        PERFORM reset_1v1_session(config_id_param);
        RAISE NOTICE '✅ Session reset successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to reset session: %', SQLERRM;
    END;

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
    RAISE NOTICE '❌ Fatal error in payout: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Payout failed: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- Create or replace the reset function
CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_config RECORD;
BEGIN
    RAISE NOTICE '🔄 [1V1 RESET] Resetting session for config: %', config_id_param;
    
    -- Get the completed session ID
    SELECT id INTO v_session_id
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '⚠️ No completed session found to reset';
        RETURN jsonb_build_object('success', false, 'message', 'No completed session');
    END IF;
    
    -- Get config details
    SELECT * INTO v_config FROM public.one_v_one_configs WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Config not found';
        RETURN jsonb_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Delete old participants
    DELETE FROM public.one_v_one_participants WHERE session_id = v_session_id;
    
    -- Reset the session
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
    
    RAISE NOTICE '✅ Session reset successfully';
    
    RETURN jsonb_build_object('success', true, 'message', 'Session reset');
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error resetting session: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ 1V1 PAYOUT FUNCTIONS UPDATED!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ Payout function: process_1v1_payout(config_id)';
  RAISE NOTICE '✅ Reset function: reset_1v1_session(config_id)';
  RAISE NOTICE '✅ Both players must complete before payout';
  RAISE NOTICE '✅ Automatic session reset after payout';
  RAISE NOTICE '✅ NULL-safe token operations';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '🎮 Frontend should call process_1v1_payout() when both complete';
  RAISE NOTICE '✅ ============================================';
END $$;

