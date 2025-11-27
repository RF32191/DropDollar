-- ============================================================================
-- 🔧 FIX 1V1: balance_after Column Required
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check token_transactions structure
SELECT '📊 CHECKING token_transactions COLUMNS...' as step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'token_transactions'
ORDER BY ordinal_position;

-- Step 2: Fix the join function to include balance_after
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.join_1v1_session(
    session_id_param TEXT,
    user_id_param UUID,
    entry_fee_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5s'
AS $$
DECLARE
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_rng_seed INT;
    v_current_count INT;
    v_timer_started TIMESTAMPTZ;
    v_timer_duration INT;
    v_time_remaining NUMERIC;
    v_username TEXT;
    v_existing_participant_id TEXT;
    v_new_balance NUMERIC;
BEGIN
    -- FIRST: Check if user already joined THIS session
    SELECT id::TEXT INTO v_existing_participant_id
    FROM one_v_one_participants 
    WHERE session_id::TEXT = session_id_param
    AND user_id = user_id_param
    LIMIT 1;
    
    IF v_existing_participant_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You have already joined this session',
            'already_joined', true
        );
    END IF;

    -- Get session info with lock
    SELECT 
        COALESCE(participants_count, 0),
        timer_started_at, 
        COALESCE(timer_duration, 7200),
        rng_seed
    INTO v_current_count, v_timer_started, v_timer_duration, v_rng_seed
    FROM one_v_one_sessions
    WHERE id::TEXT = session_id_param
    AND status IN ('waiting', 'active')
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or not available');
    END IF;
    
    -- Block if 2 players already
    IF v_current_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check if timer running and < 2 minutes remaining
    IF v_timer_started IS NOT NULL THEN
        v_time_remaining := v_timer_duration - EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        IF v_time_remaining <= 120 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Listing closed - less than 2 minutes remaining');
        END IF;
    END IF;
    
    -- Get user tokens AND username
    SELECT 
        COALESCE(purchased_tokens, 0), 
        COALESCE(won_tokens, 0),
        COALESCE(username, email, 'Player')
    INTO v_purchased, v_won, v_username
    FROM users 
    WHERE id = user_id_param
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Calculate new balance BEFORE deducting
    v_new_balance := (v_purchased + v_won) - entry_fee_param;
    
    -- Deduct tokens (purchased first, then won)
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET 
            purchased_tokens = 0, 
            won_tokens = won_tokens - (entry_fee_param - v_purchased) 
        WHERE id = user_id_param;
    END IF;
    
    -- Record token transaction WITH balance_after
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (user_id_param, 'game_entry', -entry_fee_param, v_new_balance, '1v1 Entry Fee', NOW());
    
    -- Add participant WITH username
    INSERT INTO one_v_one_participants (id, session_id, user_id, username, joined_at)
    VALUES (gen_random_uuid()::TEXT, session_id_param, user_id_param, v_username, NOW());
    
    -- Update session
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id::TEXT = session_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', session_id_param,
        'rng_seed', v_rng_seed,
        'username', v_username,
        'new_balance', v_new_balance
    );
    
EXCEPTION 
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session busy, please try again');
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Step 3: Fix process_1v1_payout to include balance_after
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    loser_record RECORD;
    total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_winner_new_balance NUMERIC;
BEGIN
    -- Get the active session for this config
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id::TEXT = config_id_param
    AND status IN ('waiting', 'active')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid out', 'already_paid', true);
    END IF;

    -- Get winner
    SELECT p.*, COALESCE(p.username, u.username, u.email, 'Player') as display_name
    INTO winner_record
    FROM public.one_v_one_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No scores submitted yet');
    END IF;

    -- Get loser
    SELECT p.*, COALESCE(p.username, u.username, u.email, 'Player') as display_name
    INTO loser_record
    FROM public.one_v_one_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    AND p.user_id != winner_record.user_id
    ORDER BY p.score DESC
    LIMIT 1;

    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    -- Winner takes 85%, platform takes 15%
    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;

    -- Pay winner and get new balance
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout 
    WHERE id = winner_record.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_winner_new_balance;

    -- Record transaction WITH balance_after
    INSERT INTO public.token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (winner_record.user_id, 'game_win', v_winner_payout, v_winner_new_balance, '1v1 Winner Takes All', NOW());

    -- Mark session completed
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL),
        winner_prize = v_winner_payout,
        loser_prize = 0,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id::TEXT = session_record.id::TEXT;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.display_name,
        'loser_username', COALESCE(loser_record.display_name, 'None'),
        'winner_payout', v_winner_payout,
        'loser_payout', 0,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- Step 4: Reset sessions again
SELECT '🔄 RESETTING SESSIONS...' as step;

DELETE FROM one_v_one_participants;

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
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Verify
SELECT '✅ DONE!' as step;

SELECT 
    id::TEXT as session_id,
    status,
    participants_count,
    current_pot
FROM one_v_one_sessions
LIMIT 5;

SELECT '
============================================
✅ FIXED: balance_after column now included!
============================================

Changes:
  ✓ join_1v1_session calculates new balance
  ✓ Includes balance_after in transaction
  ✓ process_1v1_payout gets new balance after update
  ✓ Sessions reset to fresh state

Refresh and test!
============================================
' as summary;

