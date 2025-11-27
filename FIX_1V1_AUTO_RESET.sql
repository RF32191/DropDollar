-- ============================================================================
-- 🔄 FIX: Auto-Reset Listing After Payout
-- ============================================================================

-- Update process_1v1_payout to automatically reset the session after payout
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
    v_loser RECORD;
    v_pot NUMERIC;
    v_fee NUMERIC;
    v_payout NUMERIC;
    v_balance NUMERIC;
    v_new_rng INTEGER;
BEGIN
    -- Get the session
    SELECT * INTO v_session
    FROM one_v_one_sessions
    WHERE config_id::TEXT = config_id_param
    AND status IN ('waiting', 'active')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Already completed? Return success but don't process again
    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid out', 'already_paid', true);
    END IF;

    -- Get winner (highest score)
    SELECT user_id, score, username
    INTO v_winner
    FROM one_v_one_participants
    WHERE session_id = v_session.id::TEXT
    AND score IS NOT NULL
    ORDER BY score DESC, completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No scores submitted yet');
    END IF;

    -- Get loser
    SELECT user_id, username
    INTO v_loser
    FROM one_v_one_participants
    WHERE session_id = v_session.id::TEXT
    AND user_id != v_winner.user_id
    LIMIT 1;

    v_pot := COALESCE(v_session.current_pot, 0);
    
    IF v_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    -- Calculate payout (Winner gets 85%, Platform gets 15%)
    v_fee := v_pot * 0.15;
    v_payout := v_pot - v_fee;

    -- Pay the winner
    UPDATE users
    SET won_tokens = COALESCE(won_tokens, 0) + v_payout
    WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance;

    -- Record the transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_winner.user_id, 'game_win', v_payout, v_balance, '1v1 Winner Takes All', NOW());

    -- Mark session as completed
    UPDATE one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        loser_user_id = v_loser.user_id,
        winner_prize = v_payout,
        platform_fee = v_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id::TEXT = v_session.id::TEXT;

    -- 🔄 AUTO-RESET: Clear participants and reset session for next game
    -- Generate new RNG seed
    v_new_rng := floor(random() * 99999 + 1)::integer;
    
    -- Delete old participants
    DELETE FROM one_v_one_participants
    WHERE session_id = v_session.id::TEXT;
    
    -- Reset the session for the next game
    UPDATE one_v_one_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        loser_user_id = NULL,
        winner_prize = 0,
        loser_prize = 0,
        platform_fee = 0,
        completed_at = NULL,
        rng_seed = v_new_rng,
        updated_at = NOW()
    WHERE id::TEXT = v_session.id::TEXT;

    RAISE NOTICE '🔄 Session % auto-reset with new RNG seed %', v_session.id, v_new_rng;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful! Session reset for next game.',
        'winner_username', v_winner.username,
        'loser_username', COALESCE(v_loser.username, 'None'),
        'winner_payout', v_payout,
        'platform_fee', v_fee,
        'total_pot', v_pot,
        'session_reset', true,
        'new_rng_seed', v_new_rng
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon, service_role;

-- Also update reset function to be more robust
DROP FUNCTION IF EXISTS public.reset_1v1_session(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id TEXT;
    v_entry_fee NUMERIC;
    v_new_rng INTEGER;
BEGIN
    -- Get session ID
    SELECT id::TEXT INTO v_session_id
    FROM one_v_one_sessions
    WHERE config_id::TEXT = config_id_param
    LIMIT 1;

    -- Get entry fee from config
    SELECT entry_fee INTO v_entry_fee
    FROM one_v_one_configs
    WHERE id::TEXT = config_id_param;

    IF v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found for this config');
    END IF;

    -- Generate new RNG seed
    v_new_rng := floor(random() * 99999 + 1)::integer;

    -- Clear all participants
    DELETE FROM one_v_one_participants
    WHERE session_id = v_session_id;

    -- Reset the session
    UPDATE one_v_one_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        loser_user_id = NULL,
        winner_prize = 0,
        loser_prize = 0,
        platform_fee = 0,
        completed_at = NULL,
        prize_pool = COALESCE(v_entry_fee, 0) * 2,
        rng_seed = v_new_rng,
        updated_at = NOW()
    WHERE id::TEXT = v_session_id;

    RAISE NOTICE '🔄 Session % manually reset with new RNG seed %', v_session_id, v_new_rng;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Session reset successfully',
        'session_id', v_session_id,
        'new_rng_seed', v_new_rng
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon, service_role;

-- Verify
SELECT '✅ FUNCTIONS UPDATED:' as status;
SELECT proname FROM pg_proc WHERE proname IN ('process_1v1_payout', 'reset_1v1_session') AND pronamespace = 'public'::regnamespace;

SELECT '
============================================
✅ AUTO-RESET AFTER PAYOUT ENABLED!
============================================

Flow:
1. Both players complete game
2. Payout triggered → Winner gets 85%
3. ✨ Session AUTOMATICALLY resets:
   - Participants cleared
   - Status → waiting
   - New RNG seed generated
   - Ready for next game!

No manual reset needed!
============================================
' as done;

