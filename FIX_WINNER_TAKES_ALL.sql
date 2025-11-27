-- ============================================================================
-- 🔧 FIX WINNER TAKES ALL - Correct Table Names
-- ============================================================================
-- The service uses "winner_takes_all_*" not "wta_*"
-- ============================================================================

-- Step 1: Check existing tables
SELECT '📋 CHECKING TABLES:' as step;
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%winner%' AND table_schema = 'public';

-- Step 2: Drop and recreate the join function with correct column name
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session CASCADE;

CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
    p_session_id TEXT,
    p_user_id UUID,
    p_entry_fee NUMERIC
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_pot NUMERIC,
    participants_count INTEGER,
    rng_seed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_session RECORD;
    v_username TEXT;
    v_new_balance NUMERIC;
BEGIN
    -- Check if already joined
    IF EXISTS (
        SELECT 1 FROM winner_takes_all_participants 
        WHERE session_id = p_session_id AND user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT false, 'Already joined this session'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    -- Get session
    SELECT s.*, c.entry_fee as config_entry_fee
    INTO v_session
    FROM winner_takes_all_sessions s
    JOIN winner_takes_all_configs c ON s.config_id = c.id
    WHERE s.id = p_session_id AND s.status IN ('waiting', 'active')
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Session not found or not active'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    -- Get user info
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0), COALESCE(username, email, 'Player')
    INTO v_purchased, v_won, v_username
    FROM users WHERE id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'User not found'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    -- Check balance
    IF (v_purchased + v_won) < p_entry_fee THEN
        RETURN QUERY SELECT false, 'Insufficient tokens'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    v_new_balance := (v_purchased + v_won) - p_entry_fee;

    -- Deduct tokens
    IF v_purchased >= p_entry_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_entry_fee WHERE id = p_user_id;
    ELSE
        UPDATE users SET 
            purchased_tokens = 0, 
            won_tokens = won_tokens - (p_entry_fee - v_purchased) 
        WHERE id = p_user_id;
    END IF;
    
    -- Record transaction - USE transaction_type NOT type!
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user_id, 'game_entry', -p_entry_fee, v_new_balance, 'Winner Takes All Entry', NOW());
    
    -- Add participant
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
    VALUES (gen_random_uuid()::TEXT, p_session_id, p_user_id, v_username, NOW());
    
    -- Update session
    UPDATE winner_takes_all_sessions
    SET participants_count = COALESCE(participants_count, 0) + 1,
        current_pot = COALESCE(current_pot, 0) + p_entry_fee,
        status = CASE WHEN status = 'waiting' AND timer_started_at IS NULL THEN 'active' ELSE status END,
        timer_started_at = COALESCE(timer_started_at, NOW()),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN QUERY SELECT 
        true, 
        'Successfully joined'::TEXT, 
        (COALESCE(v_session.current_pot, 0) + p_entry_fee)::NUMERIC,
        (COALESCE(v_session.participants_count, 0) + 1)::INTEGER,
        COALESCE(v_session.rng_seed, 1)::INTEGER;
END;
$$;

-- Step 3: Fix process_winner_takes_all_payout
DROP FUNCTION IF EXISTS public.process_winner_takes_all_payout CASCADE;

CREATE OR REPLACE FUNCTION public.process_winner_takes_all_payout(p_config_id TEXT)
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
    FROM winner_takes_all_sessions
    WHERE config_id = p_config_id AND status IN ('waiting', 'active')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Get winner (highest score)
    SELECT user_id, score, COALESCE(username, 'Player') as name
    INTO v_winner
    FROM winner_takes_all_participants
    WHERE session_id = v_session.id AND score IS NOT NULL
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
    VALUES (v_winner.user_id, 'game_win', v_payout, v_balance, 'Winner Takes All - Winner', NOW());

    -- Mark completed
    UPDATE winner_takes_all_sessions
    SET status = 'completed', 
        winner_user_id = v_winner.user_id, 
        winner_prize = v_payout,
        platform_fee = v_fee, 
        completed_at = NOW(), 
        updated_at = NOW()
    WHERE id = v_session.id;

    -- Auto-reset for next game
    v_new_rng := floor(random() * 99999 + 1)::integer;
    
    DELETE FROM winner_takes_all_participants WHERE session_id = v_session.id;
    
    UPDATE winner_takes_all_sessions SET
        status = 'waiting', 
        participants_count = 0, 
        current_pot = 0,
        timer_started_at = NULL, 
        winner_user_id = NULL, 
        winner_prize = 0,
        platform_fee = 0, 
        completed_at = NULL, 
        rng_seed = v_new_rng, 
        updated_at = NOW()
    WHERE id = v_session.id;

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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_winner_takes_all_payout(TEXT) TO authenticated, anon, service_role;

-- Step 5: Reset all Winner Takes All sessions
DELETE FROM winner_takes_all_participants;

UPDATE winner_takes_all_sessions SET
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

-- Verify
SELECT '✅ WINNER TAKES ALL SESSIONS:' as check;
SELECT id, config_id, status, participants_count, current_pot FROM winner_takes_all_sessions LIMIT 5;

SELECT '
============================================
✅ WINNER TAKES ALL FIXED!
============================================
- join_winner_takes_all_session uses transaction_type
- process_winner_takes_all_payout uses transaction_type
- All sessions reset to waiting
============================================
' as done;

