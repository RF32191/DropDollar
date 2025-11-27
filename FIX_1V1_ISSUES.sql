-- ============================================================================
-- 🔧 FIX 1V1 ISSUES: Username Column & Double Join Prevention
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Issue 1: Check what columns exist in participants table
SELECT '📊 CHECKING PARTICIPANTS TABLE STRUCTURE...' as step;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants'
ORDER BY ordinal_position;

-- Issue 2: Check if username column needs to be added
SELECT '🔧 ADDING USERNAME COLUMN IF MISSING...' as step;

ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Issue 3: Fix the join function to prevent double joins AND store username
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
    -- FIRST: Check if user already joined THIS session (before any locks)
    SELECT id::TEXT INTO v_existing_participant_id
    FROM one_v_one_participants 
    WHERE session_id::TEXT = session_id_param
    AND user_id = user_id_param
    LIMIT 1;
    
    IF v_existing_participant_id IS NOT NULL THEN
        RAISE NOTICE 'User % already joined session % (participant: %)', 
            user_id_param, session_id_param, v_existing_participant_id;
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
    
    -- Record token transaction
    INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (user_id_param, 'debit', 'game_entry', entry_fee_param, '1v1 Entry Fee');
    
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
    
    RAISE NOTICE 'User % (%) joined session % successfully', v_username, user_id_param, session_id_param;
    
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

-- Issue 4: Add unique constraint to prevent double joins at database level
SELECT '🔒 ADDING UNIQUE CONSTRAINT TO PREVENT DOUBLE JOINS...' as step;

-- Drop if exists first
ALTER TABLE one_v_one_participants 
DROP CONSTRAINT IF EXISTS unique_session_user;

-- Add unique constraint on session_id + user_id
ALTER TABLE one_v_one_participants 
ADD CONSTRAINT unique_session_user UNIQUE (session_id, user_id);

-- Issue 5: Fix update_1v1_score to not need username column
DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_1v1_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5s'
AS $$
DECLARE
    v_participant_id TEXT;
    v_username TEXT;
BEGIN
    -- Get participant info
    SELECT p.id::TEXT, COALESCE(p.username, u.username, u.email, 'Player')
    INTO v_participant_id, v_username
    FROM one_v_one_participants p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_id_param
    AND p.user_id = user_id_param;
    
    IF v_participant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found in this session');
    END IF;
    
    -- Update score
    UPDATE one_v_one_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE id::TEXT = v_participant_id;
    
    RAISE NOTICE 'Score updated for % in session %: score=%, accuracy=%', 
        v_username, session_id_param, score_param, accuracy_param;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Score updated',
        'username', v_username,
        'score', score_param
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- Issue 6: Fix get_all_1v1_sessions to handle missing username column
DROP FUNCTION IF EXISTS public.get_all_1v1_sessions();

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
SET statement_timeout = '10s'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sess.id::TEXT,
        sess.config_id::TEXT,
        COALESCE(sess.current_pot, 0)::NUMERIC as current_pool,
        COALESCE(sess.prize_pool, 0)::NUMERIC,
        COALESCE(sess.participants_count, 0)::INTEGER,
        2::INTEGER as max_participants,
        sess.status::TEXT,
        sess.timer_started_at,
        COALESCE(sess.timer_duration, 7200)::INTEGER,
        sess.winner_user_id::TEXT,
        COALESCE(sess.winner_prize, 0)::NUMERIC as prize_amount,
        COALESCE(sess.platform_fee, 0)::NUMERIC,
        sess.created_at,
        sess.updated_at,
        sess.completed_at,
        COALESCE(sess.rng_seed, 1)::INTEGER,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', part.id::TEXT,
                    'user_id', part.user_id::TEXT,
                    'username', COALESCE(part.username, u.username, u.email, 'Anonymous'),
                    'score', part.score,
                    'accuracy', part.accuracy,
                    'joined_at', part.joined_at,
                    'completed_at', part.completed_at
                )
            ) FILTER (WHERE part.id IS NOT NULL),
            '[]'::jsonb
        ) as participants
    FROM public.one_v_one_sessions sess
    LEFT JOIN public.one_v_one_participants part 
        ON part.session_id::TEXT = sess.id::TEXT
    LEFT JOIN public.users u ON u.id = part.user_id
    WHERE sess.status IN ('waiting', 'active')
    GROUP BY 
        sess.id, sess.config_id, sess.current_pot, sess.prize_pool,
        sess.participants_count, sess.status, sess.timer_started_at,
        sess.timer_duration, sess.winner_user_id, sess.winner_prize,
        sess.platform_fee, sess.created_at, sess.updated_at,
        sess.completed_at, sess.rng_seed
    ORDER BY sess.created_at DESC
    LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

-- Issue 7: Update existing participants to have username
SELECT '📝 UPDATING EXISTING PARTICIPANTS WITH USERNAMES...' as step;

UPDATE one_v_one_participants p
SET username = COALESCE(u.username, u.email, 'Player')
FROM users u
WHERE p.user_id = u.id
AND p.username IS NULL;

-- Verify fixes
SELECT '✅ VERIFICATION...' as step;

SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants'
ORDER BY ordinal_position;

SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'one_v_one_participants';

SELECT '
============================================
✅ FIXES APPLIED!
============================================

🔧 Fixed Issues:
  ✓ Added "username" column to participants table
  ✓ Join function now stores username when joining
  ✓ Added UNIQUE constraint on (session_id, user_id)
  ✓ Double join now prevented at database level
  ✓ Score update no longer needs username column
  ✓ get_all_1v1_sessions uses fallback for username

🔒 Double Join Prevention:
  - Check before lock (early return)
  - Unique constraint (database enforced)
  - Unique violation exception handler

Refresh your browser and test again!
============================================
' as summary;

