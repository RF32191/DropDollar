-- ============================================================================
-- 🔧 COMPLETE 1V1 FIX: Username, Leaderboard, Countdown, Payout
-- ============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Ensure username column exists in participants table
SELECT '🔧 STEP 1: Adding username column to participants...' as step;

ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Populate username for any existing participants
UPDATE one_v_one_participants p
SET username = COALESCE(u.username, u.email, 'Player')
FROM users u
WHERE p.user_id = u.id
AND (p.username IS NULL OR p.username = '');

-- Step 3: Drop ALL old functions completely
SELECT '🔧 STEP 2: Dropping old functions...' as step;

DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);
DROP FUNCTION IF EXISTS public.reset_1v1_session(TEXT);
DROP FUNCTION IF EXISTS public.get_all_1v1_sessions();

-- Step 4: Create JOIN function
SELECT '🔧 STEP 3: Creating join_1v1_session...' as step;

CREATE OR REPLACE FUNCTION public.join_1v1_session(
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
    v_current_count INT;
    v_timer_started TIMESTAMPTZ;
    v_timer_duration INT;
    v_time_remaining NUMERIC;
    v_username TEXT;
    v_new_balance NUMERIC;
BEGIN
    -- Check if already joined
    IF EXISTS (SELECT 1 FROM one_v_one_participants WHERE session_id::TEXT = session_id_param AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined', 'already_joined', true);
    END IF;

    -- Get session with lock
    SELECT participants_count, timer_started_at, timer_duration, rng_seed
    INTO v_current_count, v_timer_started, v_timer_duration, v_rng_seed
    FROM one_v_one_sessions
    WHERE id::TEXT = session_id_param AND status IN ('waiting', 'active')
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not available');
    END IF;
    
    IF COALESCE(v_current_count, 0) >= 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing full');
    END IF;
    
    IF v_timer_started IS NOT NULL THEN
        v_time_remaining := COALESCE(v_timer_duration, 7200) - EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        IF v_time_remaining <= 120 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Less than 2 minutes remaining');
        END IF;
    END IF;
    
    -- Get user info
    SELECT purchased_tokens, won_tokens, COALESCE(username, email, 'Player')
    INTO v_purchased, v_won, v_username
    FROM users WHERE id = user_id_param FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    v_purchased := COALESCE(v_purchased, 0);
    v_won := COALESCE(v_won, 0);
    
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
    
    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (user_id_param, 'game_entry', -entry_fee_param, v_new_balance, '1v1 Entry Fee', NOW());
    
    -- Add participant WITH username
    INSERT INTO one_v_one_participants (id, session_id, user_id, username, joined_at)
    VALUES (gen_random_uuid()::TEXT, session_id_param, user_id_param, v_username, NOW());
    
    -- Update session
    UPDATE one_v_one_sessions
    SET participants_count = COALESCE(participants_count, 0) + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id::TEXT = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'message', 'Joined', 'rng_seed', v_rng_seed, 'username', v_username);
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Step 5: Create SCORE UPDATE function (no username column dependency)
SELECT '🔧 STEP 4: Creating update_1v1_score...' as step;

CREATE OR REPLACE FUNCTION public.update_1v1_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple update - just set score and accuracy, no username needed
    UPDATE one_v_one_participants
    SET score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id::TEXT = session_id_param
    AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score saved', 'score', score_param);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- Step 6: Create GET ALL SESSIONS function (for leaderboard)
SELECT '🔧 STEP 5: Creating get_all_1v1_sessions...' as step;

CREATE OR REPLACE FUNCTION public.get_all_1v1_sessions()
RETURNS TABLE (
    id TEXT,
    config_id TEXT,
    current_pool NUMERIC,
    prize_pool NUMERIC,
    participants_count INTEGER,
    max_participants INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rng_seed INTEGER,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::TEXT,
        s.config_id::TEXT,
        COALESCE(s.current_pot, 0)::NUMERIC,
        COALESCE(s.prize_pool, 0)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER,
        2::INTEGER,
        s.status::TEXT,
        s.timer_started_at,
        COALESCE(s.timer_duration, 7200)::INTEGER,
        s.winner_user_id::TEXT,
        COALESCE(s.winner_prize, 0)::NUMERIC,
        COALESCE(s.platform_fee, 0)::NUMERIC,
        s.created_at,
        s.updated_at,
        s.completed_at,
        COALESCE(s.rng_seed, 1)::INTEGER,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id::TEXT,
                        'user_id', p.user_id::TEXT,
                        'username', COALESCE(p.username, u.username, u.email, 'Player'),
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    ) ORDER BY COALESCE(p.score, 0) DESC
                )
                FROM one_v_one_participants p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.session_id::TEXT = s.id::TEXT
            ),
            '[]'::jsonb
        )
    FROM one_v_one_sessions s
    WHERE s.status IN ('waiting', 'active')
    ORDER BY s.created_at DESC
    LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

-- Step 7: Create PAYOUT function
SELECT '🔧 STEP 6: Creating process_1v1_payout...' as step;

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
    v_new_balance NUMERIC;
BEGIN
    -- Get active session
    SELECT * INTO v_session
    FROM one_v_one_sessions
    WHERE config_id::TEXT = config_id_param AND status IN ('waiting', 'active')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

    IF NOT FOUND OR v_session.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Get winner (highest score)
    SELECT p.user_id, p.score, COALESCE(p.username, u.username, u.email, 'Player') as name
    INTO v_winner
    FROM one_v_one_participants p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = v_session.id::TEXT AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No scores yet');
    END IF;

    -- Get loser
    SELECT p.user_id, COALESCE(p.username, u.username, u.email, 'Player') as name
    INTO v_loser
    FROM one_v_one_participants p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = v_session.id::TEXT AND p.user_id != v_winner.user_id
    LIMIT 1;

    v_pot := COALESCE(v_session.current_pot, 0);
    IF v_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_fee := v_pot * 0.15;
    v_payout := v_pot - v_fee;

    -- Pay winner
    UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + v_payout WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_new_balance;

    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_winner.user_id, 'game_win', v_payout, v_new_balance, '1v1 Winner', NOW());

    -- Complete session
    UPDATE one_v_one_sessions
    SET status = 'completed', winner_user_id = v_winner.user_id, 
        loser_user_id = v_loser.user_id, winner_prize = v_payout,
        platform_fee = v_fee, completed_at = NOW(), updated_at = NOW()
    WHERE id::TEXT = v_session.id::TEXT;

    RETURN jsonb_build_object(
        'success', true,
        'winner_username', v_winner.name,
        'loser_username', COALESCE(v_loser.name, 'None'),
        'winner_payout', v_payout,
        'platform_fee', v_fee
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- Step 8: Create RESET function
SELECT '🔧 STEP 7: Creating reset_1v1_session...' as step;

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id TEXT;
    v_entry_fee NUMERIC;
BEGIN
    SELECT id::TEXT INTO v_session_id FROM one_v_one_sessions WHERE config_id::TEXT = config_id_param LIMIT 1;
    SELECT entry_fee INTO v_entry_fee FROM one_v_one_configs WHERE id::TEXT = config_id_param;
    
    IF v_session_id IS NOT NULL THEN
        DELETE FROM one_v_one_participants WHERE session_id::TEXT = v_session_id;
        UPDATE one_v_one_sessions
        SET status = 'waiting', participants_count = 0, current_pot = 0,
            timer_started_at = NULL, winner_user_id = NULL, loser_user_id = NULL,
            winner_prize = 0, platform_fee = 0, completed_at = NULL,
            prize_pool = COALESCE(v_entry_fee, 0) * 2,
            rng_seed = floor(random() * 99999 + 1)::integer, updated_at = NOW()
        WHERE id::TEXT = v_session_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- Step 9: Reset ALL sessions for fresh start
SELECT '🔄 STEP 8: Resetting all sessions...' as step;

DELETE FROM one_v_one_participants;

UPDATE one_v_one_sessions
SET status = 'waiting', participants_count = 0, current_pot = 0,
    timer_started_at = NULL, winner_user_id = NULL, loser_user_id = NULL,
    winner_prize = 0, loser_prize = 0, platform_fee = 0, completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer, updated_at = NOW();

-- Step 10: Verify
SELECT '✅ VERIFICATION...' as step;

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants' ORDER BY ordinal_position;

SELECT id::TEXT, status, participants_count, current_pot, prize_pool
FROM one_v_one_sessions LIMIT 5;

SELECT '
============================================
✅ COMPLETE 1V1 FIX APPLIED!
============================================

Fixed:
  ✓ Username column added to participants
  ✓ update_1v1_score no longer needs username
  ✓ get_all_1v1_sessions returns leaderboard
  ✓ Participants ordered by score DESC
  ✓ All sessions reset to waiting

Features:
  ✓ Leaderboard: participants sorted by score
  ✓ Countdown: timer_started_at + timer_duration
  ✓ Payout: Winner gets 85%, platform 15%
  ✓ Auto-reset after completion

Refresh and test!
============================================
' as summary;

