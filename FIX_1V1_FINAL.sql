-- ============================================================================
-- 🔧 FIX 1V1: Token Transactions Column + Reset All Listings
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check token_transactions table structure
SELECT '📊 CHECKING token_transactions STRUCTURE...' as step;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'token_transactions'
ORDER BY ordinal_position;

-- Step 2: Add missing columns to token_transactions if they don't exist
SELECT '🔧 FIXING token_transactions TABLE...' as step;

-- The table might only have transaction_type, not type
-- Let's check what we have and adapt

-- Add type column if missing (or use transaction_type)
DO $$
DECLARE
    v_has_type BOOLEAN;
    v_has_transaction_type BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'token_transactions' AND column_name = 'type'
    ) INTO v_has_type;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'token_transactions' AND column_name = 'transaction_type'
    ) INTO v_has_transaction_type;
    
    RAISE NOTICE 'Has type column: %, Has transaction_type column: %', v_has_type, v_has_transaction_type;
    
    -- If neither exists, add transaction_type
    IF NOT v_has_type AND NOT v_has_transaction_type THEN
        ALTER TABLE token_transactions ADD COLUMN transaction_type TEXT;
        RAISE NOTICE 'Added transaction_type column';
    END IF;
END $$;

-- Step 3: Fix the join function to use correct column name
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
    
    -- Deduct tokens (purchased first, then won)
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET 
            purchased_tokens = 0, 
            won_tokens = won_tokens - (entry_fee_param - v_purchased) 
        WHERE id = user_id_param;
    END IF;
    
    -- Record token transaction (use only transaction_type, not type)
    INSERT INTO token_transactions (user_id, transaction_type, amount, description, created_at)
    VALUES (user_id_param, 'game_entry', entry_fee_param, '1v1 Entry Fee', NOW());
    
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
        'username', v_username
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

-- Step 4: Fix process_1v1_payout to use correct column
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

    -- Pay winner
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout 
    WHERE id = winner_record.user_id;

    -- Record transaction (only transaction_type column)
    INSERT INTO public.token_transactions (user_id, transaction_type, amount, description, created_at)
    VALUES (winner_record.user_id, 'game_win', v_winner_payout, '1v1 Winner Takes All', NOW());

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

-- Step 5: RESET ALL 1V1 SESSIONS
SELECT '🔄 RESETTING ALL 1V1 SESSIONS...' as step;

-- Clear all participants
DELETE FROM one_v_one_participants;

-- Reset all sessions to waiting state
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

-- If no sessions exist, create them fresh
INSERT INTO one_v_one_sessions (
    id, config_id, prize_pool, participants_count, status, 
    rng_seed, current_pot, timer_duration, created_at, updated_at
)
SELECT 
    gen_random_uuid()::TEXT,
    c.id::TEXT,
    c.entry_fee * 2,
    0,
    'waiting',
    floor(random() * 99999 + 1)::integer,
    0,
    7200,
    NOW(),
    NOW()
FROM one_v_one_configs c
WHERE NOT EXISTS (
    SELECT 1 FROM one_v_one_sessions s 
    WHERE s.config_id::TEXT = c.id::TEXT
);

-- Verify reset
SELECT '✅ VERIFICATION...' as step;

SELECT 
    id::TEXT as session_id,
    config_id::TEXT as config,
    status,
    participants_count,
    current_pot,
    prize_pool
FROM one_v_one_sessions
ORDER BY created_at DESC;

SELECT '
============================================
✅ ALL FIXES APPLIED!
============================================

🔧 Fixed:
  ✓ Token transaction uses "transaction_type" not "type"
  ✓ All 1v1 sessions reset to waiting state
  ✓ All participants cleared
  ✓ New RNG seeds generated

🔄 Sessions Reset:
  ✓ Status: waiting
  ✓ Participants: 0
  ✓ Current pot: 0
  ✓ Timer: not started

Refresh your browser and test!
============================================
' as summary;

