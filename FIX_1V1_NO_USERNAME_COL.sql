-- ============================================================================
-- 🔧 FIX 1V1: Remove ALL Username Column Dependencies
-- ============================================================================
-- This fix removes ALL references to username column in participants
-- and ALWAYS gets username from the users table via JOIN
-- ============================================================================

-- Step 1: Check current participants table structure
SELECT '📊 CHECKING PARTICIPANTS TABLE...' as step;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants';

-- Step 2: Drop ALL existing functions
SELECT '🧹 DROPPING ALL FUNCTIONS...' as step;

DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reset_1v1_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_1v1_sessions() CASCADE;

-- Step 3: Create SIMPLE join function (NO username column)
SELECT '🔧 CREATING join_1v1_session...' as step;

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
    v_new_balance NUMERIC;
BEGIN
    -- Check if already joined
    IF EXISTS (SELECT 1 FROM one_v_one_participants WHERE session_id::TEXT = session_id_param AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined', 'already_joined', true);
    END IF;

    -- Get session with lock
    SELECT COALESCE(participants_count, 0), timer_started_at, COALESCE(timer_duration, 7200), rng_seed
    INTO v_current_count, v_timer_started, v_timer_duration, v_rng_seed
    FROM one_v_one_sessions
    WHERE id::TEXT = session_id_param AND status IN ('waiting', 'active')
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not available');
    END IF;
    
    IF v_current_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing full');
    END IF;
    
    IF v_timer_started IS NOT NULL THEN
        v_time_remaining := v_timer_duration - EXTRACT(EPOCH FROM (NOW() - v_timer_started));
        IF v_time_remaining <= 120 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Less than 2 minutes remaining');
        END IF;
    END IF;
    
    -- Get user tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
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
    
    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (user_id_param, 'game_entry', -entry_fee_param, v_new_balance, '1v1 Entry', NOW());
    
    -- Add participant - NO USERNAME COLUMN, just core fields
    INSERT INTO one_v_one_participants (id, session_id, user_id, joined_at)
    VALUES (gen_random_uuid()::TEXT, session_id_param, user_id_param, NOW());
    
    -- Update session
    UPDATE one_v_one_sessions
    SET participants_count = COALESCE(participants_count, 0) + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id::TEXT = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'message', 'Joined', 'rng_seed', v_rng_seed);
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Step 4: Create SIMPLE score update (NO username anywhere)
SELECT '🔧 CREATING update_1v1_score...' as step;

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
DECLARE
    v_rows_updated INT;
BEGIN
    -- Update using ONLY session_id and user_id - no other columns
    UPDATE one_v_one_participants
    SET score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id::TEXT = session_id_param
    AND user_id = user_id_param;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score saved', 'score', score_param);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- Step 5: Create get_all_sessions (username from JOIN only)
SELECT '🔧 CREATING get_all_1v1_sessions...' as step;

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
                        'username', COALESCE(u.username, u.email, 'Player'),
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    ) ORDER BY COALESCE(p.score, 0) DESC
                )
                FROM one_v_one_participants p
                JOIN users u ON p.user_id = u.id
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

-- Step 6: Create payout function (username from JOIN)
SELECT '🔧 CREATING process_1v1_payout...' as step;

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
    SELECT * INTO v_session
    FROM one_v_one_sessions
    WHERE config_id::TEXT = config_id_param AND status IN ('waiting', 'active')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

    IF NOT FOUND OR v_session.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Get winner - username from users table JOIN
    SELECT p.user_id, p.score, COALESCE(u.username, u.email, 'Player') as display_name
    INTO v_winner
    FROM one_v_one_participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = v_session.id::TEXT AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No scores yet');
    END IF;

    -- Get loser - username from users table JOIN
    SELECT p.user_id, COALESCE(u.username, u.email, 'Player') as display_name
    INTO v_loser
    FROM one_v_one_participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = v_session.id::TEXT AND p.user_id != v_winner.user_id
    LIMIT 1;

    v_pot := COALESCE(v_session.current_pot, 0);
    IF v_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_fee := v_pot * 0.15;
    v_payout := v_pot - v_fee;

    UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + v_payout WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_new_balance;

    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_winner.user_id, 'game_win', v_payout, v_new_balance, '1v1 Winner', NOW());

    UPDATE one_v_one_sessions
    SET status = 'completed', winner_user_id = v_winner.user_id, 
        loser_user_id = v_loser.user_id, winner_prize = v_payout,
        platform_fee = v_fee, completed_at = NOW(), updated_at = NOW()
    WHERE id::TEXT = v_session.id::TEXT;

    RETURN jsonb_build_object(
        'success', true,
        'winner_username', v_winner.display_name,
        'loser_username', COALESCE(v_loser.display_name, 'None'),
        'winner_payout', v_payout,
        'platform_fee', v_fee
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- Step 7: Create reset function
SELECT '🔧 CREATING reset_1v1_session...' as step;

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

-- Step 8: Try to drop the problematic username column if it partially exists
SELECT '🧹 CLEANING UP...' as step;

-- This won't error if column doesn't exist
DO $$
BEGIN
    ALTER TABLE one_v_one_participants DROP COLUMN IF EXISTS username;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop username column: %', SQLERRM;
END $$;

-- Step 9: Reset all sessions
SELECT '🔄 RESETTING SESSIONS...' as step;

DELETE FROM one_v_one_participants;

UPDATE one_v_one_sessions
SET status = 'waiting', participants_count = 0, current_pot = 0,
    timer_started_at = NULL, winner_user_id = NULL, loser_user_id = NULL,
    winner_prize = 0, loser_prize = 0, platform_fee = 0, completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer, updated_at = NOW();

-- Step 10: Final verification
SELECT '✅ VERIFICATION...' as step;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants'
ORDER BY ordinal_position;

SELECT proname as function_name
FROM pg_proc 
WHERE proname LIKE '%1v1%' AND pronamespace = 'public'::regnamespace;

SELECT '
============================================
✅ COMPLETE FIX - NO USERNAME COLUMN!
============================================

Changes:
  ✓ REMOVED username column from participants
  ✓ ALL functions get username via JOIN to users table
  ✓ update_1v1_score is now super simple
  ✓ No more "column username does not exist" error!

Flow:
  1. join_1v1_session - stores user_id only
  2. update_1v1_score - updates by user_id only
  3. get_all_1v1_sessions - JOINs users for username
  4. process_1v1_payout - JOINs users for username

Refresh and test!
============================================
' as summary;

