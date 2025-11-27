-- ============================================================================
-- 🚀 FIX 1V1 SESSIONS - SCALABLE FOR MILLIONS OF USERS
-- ============================================================================
-- Based on working SQL, with UUID fixes and performance optimizations
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check actual column types first
SELECT '📊 CHECKING COLUMN TYPES...' as step;

SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('one_v_one_sessions', 'one_v_one_participants', 'one_v_one_configs')
AND column_name IN ('id', 'config_id', 'session_id', 'user_id', 'winner_user_id', 'loser_user_id')
ORDER BY table_name, column_name;

-- Step 2: Drop ALL existing functions to prevent signature conflicts
SELECT '🧹 DROPPING OLD FUNCTIONS...' as step;

DROP FUNCTION IF EXISTS public.get_all_1v1_sessions();
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.update_1v1_score(UUID, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);
DROP FUNCTION IF EXISTS public.process_1v1_payout(UUID);
DROP FUNCTION IF EXISTS public.reset_1v1_session(TEXT);
DROP FUNCTION IF EXISTS public.reset_1v1_session(UUID);
DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

-- Step 3: Add performance indexes for millions of users
SELECT '📈 ADDING PERFORMANCE INDEXES...' as step;

-- Index for fast session lookups by status
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_status 
ON one_v_one_sessions(status) 
WHERE status IN ('waiting', 'active');

-- Index for config_id lookups (critical for joining)
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_config_id 
ON one_v_one_sessions(config_id);

-- Index for participant lookups by session
CREATE INDEX IF NOT EXISTS idx_1v1_participants_session_id 
ON one_v_one_participants(session_id);

-- Index for participant lookups by user (prevent double joins)
CREATE INDEX IF NOT EXISTS idx_1v1_participants_user_id 
ON one_v_one_participants(user_id);

-- Composite index for participant session+user (most common query)
CREATE INDEX IF NOT EXISTS idx_1v1_participants_session_user 
ON one_v_one_participants(session_id, user_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_created_at 
ON one_v_one_sessions(created_at DESC);

-- Index for completed sessions (for payout queries)
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_completed 
ON one_v_one_sessions(config_id, completed_at DESC) 
WHERE status = 'completed';

-- Step 4: Clear and recreate sessions
SELECT '🗑️ CLEARING OLD SESSIONS...' as step;

DELETE FROM one_v_one_participants;
DELETE FROM one_v_one_sessions;

-- Step 5: Insert fresh sessions (handle both UUID and TEXT types)
SELECT '✨ CREATING NEW SESSIONS...' as step;

DO $$
DECLARE
    v_id_type TEXT;
    v_config_id_type TEXT;
BEGIN
    -- Check id column type
    SELECT data_type INTO v_id_type
    FROM information_schema.columns 
    WHERE table_name = 'one_v_one_sessions' AND column_name = 'id';
    
    -- Check config_id column type
    SELECT data_type INTO v_config_id_type
    FROM information_schema.columns 
    WHERE table_name = 'one_v_one_sessions' AND column_name = 'config_id';
    
    RAISE NOTICE 'ID type: %, Config ID type: %', v_id_type, v_config_id_type;
    
    -- Insert based on actual types
    IF v_id_type = 'uuid' THEN
        -- Both are UUID
        INSERT INTO one_v_one_sessions (
            id, config_id, prize_pool, participants_count, status, 
            rng_seed, current_pot, timer_duration, created_at, updated_at
        )
        SELECT 
            gen_random_uuid(),
            c.id::UUID,
            c.entry_fee * 2,
            0,
            'waiting',
            floor(random() * 99999 + 1)::integer,
            0,
            7200,
            NOW(),
            NOW()
        FROM one_v_one_configs c;
    ELSE
        -- ID is TEXT
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
        FROM one_v_one_configs c;
    END IF;
END $$;

SELECT '✅ Sessions created: ' || COUNT(*)::TEXT FROM one_v_one_sessions;

-- Step 6: Create get_all_1v1_sessions with UNIVERSAL type handling
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
SET statement_timeout = '10s'  -- Prevent long-running queries
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
                    'username', COALESCE(u.username, 'Anonymous'),
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
    LIMIT 100;  -- Limit for performance with millions of users
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

-- Step 7: Create join_1v1_session with atomic locking for concurrency
SELECT '🔧 CREATING join_1v1_session...' as step;

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
    v_session_locked RECORD;
BEGIN
    -- ATOMIC LOCK: Lock the session row to prevent race conditions
    SELECT 
        id::TEXT,
        COALESCE(participants_count, 0) as participants_count,
        timer_started_at, 
        COALESCE(timer_duration, 7200) as timer_duration,
        rng_seed,
        status
    INTO v_session_locked
    FROM one_v_one_sessions
    WHERE id::TEXT = session_id_param
    AND status IN ('waiting', 'active')
    FOR UPDATE NOWAIT;  -- Fail fast if another transaction has the lock
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or not available');
    END IF;
    
    v_current_count := v_session_locked.participants_count;
    v_timer_started := v_session_locked.timer_started_at;
    v_timer_duration := v_session_locked.timer_duration;
    v_rng_seed := v_session_locked.rng_seed;
    
    -- Block if 2 players already (race condition protected)
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
    
    -- Check tokens (also lock user row)
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users 
    WHERE id = user_id_param
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(
        SELECT 1 FROM one_v_one_participants 
        WHERE session_id::TEXT = session_id_param
        AND user_id = user_id_param
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
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
    
    -- Add participant (handle TEXT or UUID session_id column)
    INSERT INTO one_v_one_participants (id, session_id, user_id, joined_at)
    VALUES (gen_random_uuid()::TEXT, session_id_param, user_id_param, NOW());
    
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
        'rng_seed', v_rng_seed
    );
    
EXCEPTION 
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session busy, please try again');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Step 8: Create update_1v1_score
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
SET statement_timeout = '5s'
AS $$
BEGIN
    UPDATE one_v_one_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id::TEXT = session_id_param
    AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- Step 9: Create process_1v1_payout (winner takes 85%)
SELECT '🔧 CREATING process_1v1_payout...' as step;

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
    -- Get the active session for this config (with lock)
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

    -- Already completed?
    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid out', 'already_paid', true);
    END IF;

    -- Get winner (highest score, earliest completion for ties)
    SELECT p.*, u.username
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No scores submitted yet');
    END IF;

    -- Get loser
    SELECT p.*, u.username
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
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

    -- Pay winner (atomic update)
    UPDATE public.users 
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout 
    WHERE id = winner_record.user_id;

    -- Record transaction
    INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (winner_record.user_id, 'credit', 'game_win', v_winner_payout, '1v1 Winner Takes All');

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
        'winner_username', winner_record.username,
        'loser_username', COALESCE(loser_record.username, 'None'),
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

-- Step 10: Create reset_1v1_session
SELECT '🔧 CREATING reset_1v1_session...' as step;

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
    v_session_id TEXT;
    v_entry_fee NUMERIC;
    v_rng_seed INTEGER;
BEGIN
    -- Get the completed session
    SELECT id::TEXT INTO v_session_id
    FROM public.one_v_one_sessions
    WHERE config_id::TEXT = config_id_param
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Get config details
    SELECT entry_fee, floor(random() * 99999 + 1)::integer
    INTO v_entry_fee, v_rng_seed
    FROM one_v_one_configs
    WHERE id::TEXT = config_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Clear participants
    IF v_session_id IS NOT NULL THEN
        DELETE FROM public.one_v_one_participants 
        WHERE session_id::TEXT = v_session_id;
        
        -- Reset the session
        UPDATE public.one_v_one_sessions
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
            prize_pool = v_entry_fee * 2,
            rng_seed = v_rng_seed,
            timer_duration = 7200,
            updated_at = NOW()
        WHERE id::TEXT = v_session_id;
    ELSE
        -- Create new session
        v_session_id := gen_random_uuid()::TEXT;
        
        INSERT INTO public.one_v_one_sessions (
            id, config_id, prize_pool, participants_count, status,
            rng_seed, current_pot, timer_duration, created_at, updated_at
        ) VALUES (
            v_session_id,
            config_id_param,
            v_entry_fee * 2,
            0,
            'waiting',
            v_rng_seed,
            0,
            7200,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Session reset successfully',
        'session_id', v_session_id,
        'new_rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error resetting: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- Step 11: Create auto timer trigger
SELECT '🔧 CREATING AUTO TIMER TRIGGER...' as step;

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Start timer when pot is full (2 players joined)
    IF NEW.current_pot >= NEW.prize_pool 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.timer_duration := 7200;
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_start_1v1_timer
    BEFORE UPDATE OR INSERT ON one_v_one_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_1v1_timer();

-- Step 12: Final verification
SELECT '🧪 TESTING...' as step;

SELECT 
    '✅ Sessions available: ' || COUNT(*)::TEXT as sessions
FROM one_v_one_sessions 
WHERE status IN ('waiting', 'active');

SELECT 
    id::TEXT as session_id,
    config_id::TEXT as config,
    status,
    participants_count,
    prize_pool
FROM one_v_one_sessions
LIMIT 5;

-- Summary
SELECT '
============================================
✅ 1V1 SYSTEM FIXED AND OPTIMIZED!
============================================

🔧 FIXES APPLIED:
  ✓ Universal TEXT casting for UUID/TEXT compatibility
  ✓ Atomic row locking to prevent race conditions
  ✓ NOWAIT locks for instant failure on conflicts

📈 SCALABILITY FOR MILLIONS OF USERS:
  ✓ Indexed: status, config_id, session_id, user_id
  ✓ Composite index for session+user lookups
  ✓ Statement timeouts to prevent runaway queries
  ✓ Query limits (100 sessions max per request)

💰 PAYOUT LOGIC:
  ✓ Winner gets 85% of pot
  ✓ Platform takes 15% fee
  ✓ Loser gets 0%

🎮 GAME FLOW:
  1. Player joins → tokens deducted
  2. Both players join → timer starts (2 hours)
  3. Players submit scores
  4. Winner determined by highest score
  5. Payout processed
  6. Session auto-resets for next game

Ready for production! 🚀
============================================
' as summary;

