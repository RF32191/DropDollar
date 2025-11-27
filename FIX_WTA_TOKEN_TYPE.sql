-- ============================================================================
-- 🔧 FIX WTA: Token Transactions Column Name
-- ============================================================================
-- The token_transactions table uses "transaction_type" not "type"
-- ============================================================================

-- Check what WTA functions exist
SELECT '📋 WTA FUNCTIONS:' as info;
SELECT proname FROM pg_proc WHERE proname LIKE '%wta%' AND pronamespace = 'public'::regnamespace;

-- Fix join_wta_session
DROP FUNCTION IF EXISTS public.join_wta_session CASCADE;

CREATE OR REPLACE FUNCTION public.join_wta_session(
    session_id_param TEXT,
    user_id_param UUID,
    entry_fee_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_rng_seed INT;
    v_count INT;
    v_max INT;
    v_username TEXT;
    v_new_balance NUMERIC;
BEGIN
    -- Check if already joined
    IF EXISTS (SELECT 1 FROM wta_participants WHERE session_id::TEXT = session_id_param AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;

    -- Get session info
    SELECT COALESCE(participants_count, 0), COALESCE(max_participants, 10), rng_seed
    INTO v_count, v_max, v_rng_seed
    FROM wta_sessions
    WHERE id::TEXT = session_id_param AND status IN ('waiting', 'active')
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    IF v_count >= v_max THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session full');
    END IF;
    
    -- Get user info
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0), COALESCE(username, email, 'Player')
    INTO v_purchased, v_won, v_username
    FROM users WHERE id = user_id_param FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    v_new_balance := (v_purchased + v_won) - entry_fee_param;
    
    -- Deduct tokens
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_purchased) WHERE id = user_id_param;
    END IF;
    
    -- Record transaction - USE transaction_type NOT type!
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (user_id_param, 'game_entry', -entry_fee_param, v_new_balance, 'WTA Entry', NOW());
    
    -- Add participant
    INSERT INTO wta_participants (id, session_id, user_id, username, joined_at)
    VALUES (gen_random_uuid()::TEXT, session_id_param, user_id_param, v_username, NOW());
    
    -- Update session
    UPDATE wta_sessions
    SET participants_count = v_count + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id::TEXT = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'rng_seed', v_rng_seed, 'username', v_username);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Fix process_wta_payout
DROP FUNCTION IF EXISTS public.process_wta_payout CASCADE;

CREATE OR REPLACE FUNCTION public.process_wta_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
    v_pot NUMERIC;
    v_fee NUMERIC;
    v_payout NUMERIC;
    v_balance NUMERIC;
    v_new_rng INTEGER;
BEGIN
    -- Get session
    SELECT * INTO v_session
    FROM wta_sessions
    WHERE config_id::TEXT = config_id_param AND status IN ('waiting', 'active')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid', 'already_paid', true);
    END IF;

    -- Get winner (highest score)
    SELECT user_id, score, COALESCE(username, 'Player') as name
    INTO v_winner
    FROM wta_participants
    WHERE session_id = v_session.id::TEXT AND score IS NOT NULL
    ORDER BY score DESC, completed_at ASC LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No scores yet');
    END IF;

    v_pot := COALESCE(v_session.current_pot, 0);
    IF v_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    -- Winner gets 85%
    v_fee := v_pot * 0.15;
    v_payout := v_pot - v_fee;

    -- Pay winner
    UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + v_payout WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance;

    -- Record transaction - USE transaction_type NOT type!
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_winner.user_id, 'game_win', v_payout, v_balance, 'WTA Winner', NOW());

    -- Mark completed
    UPDATE wta_sessions
    SET status = 'completed', winner_user_id = v_winner.user_id, winner_prize = v_payout,
        platform_fee = v_fee, completed_at = NOW(), updated_at = NOW()
    WHERE id::TEXT = v_session.id::TEXT;

    -- Auto-reset for next game
    v_new_rng := floor(random() * 99999 + 1)::integer;
    
    DELETE FROM wta_participants WHERE session_id = v_session.id::TEXT;
    
    UPDATE wta_sessions SET
        status = 'waiting', participants_count = 0, current_pot = 0,
        timer_started_at = NULL, winner_user_id = NULL, winner_prize = 0,
        platform_fee = 0, completed_at = NULL, rng_seed = v_new_rng, updated_at = NOW()
    WHERE id::TEXT = v_session.id::TEXT;

    RETURN jsonb_build_object(
        'success', true,
        'winner_username', v_winner.name,
        'winner_payout', v_payout,
        'platform_fee', v_fee,
        'session_reset', true
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.join_wta_session(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_wta_payout(TEXT) TO authenticated, anon, service_role;

-- Reset WTA sessions
DELETE FROM wta_participants;

UPDATE wta_sessions SET
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

SELECT '✅ WTA FIXED!' as status;
SELECT id::TEXT, status, participants_count FROM wta_sessions LIMIT 5;

SELECT '
============================================
✅ WTA TOKEN TYPE FIXED!
============================================
- join_wta_session uses transaction_type
- process_wta_payout uses transaction_type
- All WTA sessions reset
============================================
' as done;

