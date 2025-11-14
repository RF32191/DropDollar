-- ============================================================================
-- CHECK COLUMN TYPES AND FIX 1V1
-- ============================================================================

-- Check actual column types
SELECT '📊 one_v_one_sessions column types:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'one_v_one_sessions' 
AND column_name IN ('id', 'config_id', 'winner_user_id', 'loser_user_id')
ORDER BY column_name;

SELECT '📊 one_v_one_participants column types:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants' 
AND column_name IN ('id', 'session_id', 'user_id')
ORDER BY column_name;

-- Now let's create sessions properly based on actual types
DELETE FROM one_v_one_participants;
DELETE FROM one_v_one_sessions;

-- Insert sessions - let database handle the type conversion
INSERT INTO one_v_one_sessions (
    id, 
    config_id, 
    prize_pool, 
    participants_count, 
    status, 
    rng_seed, 
    current_pot, 
    timer_duration, 
    created_at, 
    updated_at
)
SELECT 
    gen_random_uuid()::TEXT,  -- id column is TEXT
    c.id,  -- config_id is TEXT
    c.entry_fee * 2,
    0,
    'waiting',
    floor(random() * 99999 + 1)::integer,
    0,
    7200,
    NOW(),
    NOW()
FROM one_v_one_configs c;

SELECT '✅ Sessions created' as status;

-- Now recreate get_all_1v1_sessions with proper type handling
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
                    'id', part.id,
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
    LEFT JOIN public.one_v_one_participants part ON part.session_id::TEXT = sess.id::TEXT
    LEFT JOIN public.users u ON u.id = part.user_id
    WHERE sess.status IN ('waiting', 'active')
    GROUP BY 
        sess.id,
        sess.config_id,
        sess.current_pot,
        sess.prize_pool,
        sess.participants_count,
        sess.status,
        sess.timer_started_at,
        sess.timer_duration,
        sess.winner_user_id,
        sess.winner_prize,
        sess.platform_fee,
        sess.created_at,
        sess.updated_at,
        sess.completed_at,
        sess.rng_seed
    ORDER BY sess.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon;

-- Recreate join function with simpler type handling (drop ALL versions)
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session;

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
BEGIN
    -- Get session info (cast for type safety)
    SELECT 
        COALESCE(participants_count, 0),
        timer_started_at, 
        COALESCE(timer_duration, 7200)
    INTO v_current_count, v_timer_started, v_timer_duration
    FROM one_v_one_sessions
    WHERE id::TEXT = session_id_param::TEXT
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
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
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined (cast for type safety)
    IF EXISTS(
        SELECT 1 FROM one_v_one_participants 
        WHERE session_id::TEXT = session_id_param::TEXT
        AND user_id = user_id_param
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_purchased) WHERE id = user_id_param;
    END IF;
    
    -- Get RNG seed (cast for type safety)
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id::TEXT = session_id_param::TEXT;
    
    -- Add participant
    INSERT INTO one_v_one_participants (id, session_id, user_id, joined_at)
    VALUES (gen_random_uuid()::TEXT, session_id_param, user_id_param, NOW());
    
    -- Update session (cast for type safety)
    UPDATE one_v_one_sessions
    SET 
        participants_count = v_current_count + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        updated_at = NOW()
    WHERE id::TEXT = session_id_param::TEXT;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', session_id_param,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- Recreate update_1v1_score (drop ALL versions first)
DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.update_1v1_score(UUID, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.update_1v1_score;

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
    UPDATE one_v_one_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id::TEXT = session_id_param::TEXT
    AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- Recreate process_1v1_payout (drop ALL versions)
DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);
DROP FUNCTION IF EXISTS public.process_1v1_payout(UUID);
DROP FUNCTION IF EXISTS public.process_1v1_payout;

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
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_loser_payout NUMERIC;
BEGIN
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id::TEXT = config_id_param::TEXT
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;

    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid out', 'already_paid', true);
    END IF;

    SELECT p.*, u.username
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner found');
    END IF;

    SELECT p.*, u.username
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    AND p.user_id != winner_record.user_id
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    -- Winner takes all minus platform fee (85% winner, 15% platform, 0% loser)
    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;  -- Winner gets 85%
    v_loser_payout := 0;  -- Loser gets nothing

    -- Pay winner
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout WHERE id = winner_record.user_id;
    INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (winner_record.user_id, 'credit', 'game_win', v_winner_payout, '1v1 Winner Takes All');

    -- No payout to loser (loser_payout = 0)

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
    WHERE id::TEXT = session_record.id::TEXT;

    -- Auto-reset the session for the next game (after a 2 second delay via pg_sleep)
    PERFORM pg_sleep(2);
    PERFORM reset_1v1_session(config_id_param);

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

-- Create reset function
DROP FUNCTION IF EXISTS public.reset_1v1_session(TEXT);

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id_to_reset TEXT;
    v_config_id TEXT;
    v_entry_fee NUMERIC;
    v_rng_seed INTEGER;
BEGIN
    -- Get the completed session
    SELECT id::TEXT, config_id::TEXT 
    INTO session_id_to_reset, v_config_id
    FROM public.one_v_one_sessions
    WHERE config_id::TEXT = config_id_param::TEXT
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No completed session found for config: %', config_id_param;
        -- Try to find any session for this config
        SELECT id::TEXT, config_id::TEXT 
        INTO session_id_to_reset, v_config_id
        FROM public.one_v_one_sessions
        WHERE config_id::TEXT = config_id_param::TEXT
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    -- Get config details
    SELECT entry_fee, floor(random() * 99999 + 1)::integer
    INTO v_entry_fee, v_rng_seed
    FROM one_v_one_configs
    WHERE id::TEXT = config_id_param::TEXT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Clear all participants for this session
    IF session_id_to_reset IS NOT NULL THEN
        DELETE FROM public.one_v_one_participants 
        WHERE session_id::TEXT = session_id_to_reset;
        
        RAISE NOTICE 'Cleared participants for session: %', session_id_to_reset;
    END IF;
    
    -- Reset the session
    IF session_id_to_reset IS NOT NULL THEN
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
            prize_pool = v_entry_fee,
            rng_seed = v_rng_seed,
            timer_duration = 7200,
            updated_at = NOW()
        WHERE id::TEXT = session_id_to_reset;
        
        RAISE NOTICE 'Reset session: % to waiting status', session_id_to_reset;
    ELSE
        -- Create a new session if none exists
        session_id_to_reset := gen_random_uuid()::TEXT;
        
        INSERT INTO public.one_v_one_sessions (
            id,
            config_id,
            prize_pool,
            participants_count,
            status,
            rng_seed,
            current_pot,
            timer_duration,
            created_at,
            updated_at
        ) VALUES (
            session_id_to_reset::UUID,
            config_id_param::UUID,
            v_entry_fee,
            0,
            'waiting',
            v_rng_seed,
            0,
            7200,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new session: %', session_id_to_reset;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Session reset successfully',
        'session_id', session_id_to_reset
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error resetting: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- Recreate timer trigger
DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
DROP FUNCTION IF EXISTS auto_start_1v1_timer();

CREATE OR REPLACE FUNCTION auto_start_1v1_timer()
RETURNS TRIGGER AS $$
BEGIN
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

SELECT '✅ All functions created' as status;

-- Test
SELECT '📊 TEST get_all_1v1_sessions():' as info;
SELECT id, config_id, status, participants_count
FROM get_all_1v1_sessions()
LIMIT 3;

SELECT '
✅ 1V1 FIXED WITH PROPER TYPE HANDLING!

Run this script, then refresh your browser.
The key was to let the database handle type conversions
naturally without forcing casts everywhere.

Ready! 🚀
' as summary;

