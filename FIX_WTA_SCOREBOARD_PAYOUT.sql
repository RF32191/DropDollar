-- ============================================================================
-- 🔧 FIX WTA: Scoreboard, Payout, Username & 2 Minute Timer
-- ============================================================================

-- Step 1: Clear all participants and sessions
DELETE FROM winner_takes_all_participants;
DELETE FROM winner_takes_all_sessions;

-- Step 2: Add username column if missing
ALTER TABLE winner_takes_all_participants 
ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Player';

-- Step 3: Fix join function with username
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_p NUMERIC; v_w NUMERIC; v_session RECORD; v_name TEXT; v_bal NUMERIC;
BEGIN
    -- Check if already joined
    IF EXISTS (SELECT 1 FROM winner_takes_all_participants WHERE session_id::TEXT = p_session_id AND user_id = p_user_id) THEN
        RETURN QUERY SELECT false, 'Already joined'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    -- Get session
    SELECT * INTO v_session FROM winner_takes_all_sessions WHERE id::TEXT = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Session not found'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    -- Get user
    SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0), COALESCE(username, email, 'Player')
    INTO v_p, v_w, v_name FROM users WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'User not found'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    IF (v_p + v_w) < p_entry_fee THEN
        RETURN QUERY SELECT false, 'Insufficient tokens'::TEXT, 0::NUMERIC, 0::INTEGER, 0::INTEGER;
        RETURN;
    END IF;

    v_bal := (v_p + v_w) - p_entry_fee;

    -- Deduct tokens
    IF v_p >= p_entry_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_entry_fee WHERE id = p_user_id;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_entry_fee - v_p) WHERE id = p_user_id;
    END IF;

    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user_id, 'game_entry', -p_entry_fee, v_bal, 'WTA Entry', NOW());

    -- Add participant WITH USERNAME
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
    VALUES (gen_random_uuid()::TEXT, p_session_id, p_user_id, v_name, NOW());

    -- Update session
    UPDATE winner_takes_all_sessions SET
        participants_count = COALESCE(participants_count,0) + 1,
        current_pot = COALESCE(current_pot,0) + p_entry_fee,
        status = 'active',
        timer_started_at = COALESCE(timer_started_at, NOW()),
        updated_at = NOW()
    WHERE id::TEXT = p_session_id;

    RETURN QUERY SELECT true, 'Joined'::TEXT, 
        (COALESCE(v_session.current_pot,0) + p_entry_fee)::NUMERIC,
        (COALESCE(v_session.participants_count,0) + 1)::INTEGER,
        COALESCE(v_session.rng_seed, 1)::INTEGER;
END;
$$;

-- Step 4: Fix update score function
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score CASCADE;

CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    p_session_id TEXT,
    p_user_id UUID,
    p_score NUMERIC,
    p_accuracy NUMERIC
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE winner_takes_all_participants 
    SET score = p_score, accuracy = p_accuracy, completed_at = NOW()
    WHERE session_id::TEXT = p_session_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Participant not found'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Score updated'::TEXT;
END;
$$;

-- Step 5: Fix get all sessions with scoreboard
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id TEXT, config_id TEXT, current_pot NUMERIC, base_price NUMERIC,
    participants_count INTEGER, max_participants INTEGER, status TEXT,
    timer_started_at TIMESTAMPTZ, timer_duration INTEGER, winner_user_id TEXT,
    winner_prize NUMERIC, platform_fee NUMERIC, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, rng_seed INTEGER, participants JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::TEXT, 
        s.config_id::TEXT, 
        COALESCE(s.current_pot,0)::NUMERIC,
        COALESCE(s.base_price, 1)::NUMERIC,
        COALESCE(s.participants_count,0)::INTEGER, 
        COALESCE(s.max_participants,10)::INTEGER, 
        s.status::TEXT,
        s.timer_started_at, 
        COALESCE(s.timer_duration, 120)::INTEGER,  -- Default 2 min
        s.winner_user_id::TEXT,
        COALESCE(s.winner_prize,0)::NUMERIC, 
        COALESCE(s.platform_fee,0)::NUMERIC,
        s.created_at, 
        s.updated_at, 
        s.completed_at, 
        COALESCE(s.rng_seed,1)::INTEGER,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'user_id', p.user_id::TEXT,
                    'username', COALESCE(p.username, u.username, u.email, 'Player'),
                    'score', p.score,
                    'accuracy', p.accuracy,
                    'joined_at', p.joined_at,
                    'completed_at', p.completed_at
                ) ORDER BY COALESCE(p.score, 0) DESC
            ) FROM winner_takes_all_participants p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.session_id::TEXT = s.id::TEXT
        ), '[]'::jsonb)
    FROM winner_takes_all_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

-- Step 6: Fix payout function
DROP FUNCTION IF EXISTS public.process_winner_takes_all_payout CASCADE;

CREATE OR REPLACE FUNCTION public.process_winner_takes_all_payout(p_config_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_s RECORD; v_win RECORD; v_pot NUMERIC; v_fee NUMERIC; v_pay NUMERIC; v_bal NUMERIC; v_rng INT;
BEGIN
    -- Get session
    SELECT * INTO v_s FROM winner_takes_all_sessions 
    WHERE config_id::TEXT = p_config_id AND status IN ('waiting', 'active') 
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'No active session'); 
    END IF;
    
    -- Get winner with username from users table as fallback
    SELECT p.user_id, p.score, COALESCE(p.username, u.username, u.email, 'Player') as name
    INTO v_win
    FROM winner_takes_all_participants p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = v_s.id::TEXT AND p.score IS NOT NULL 
    ORDER BY p.score DESC LIMIT 1;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'No scores yet'); 
    END IF;
    
    v_pot := COALESCE(v_s.current_pot, 0);
    IF v_pot <= 0 THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot'); 
    END IF;
    
    v_fee := v_pot * 0.15;
    v_pay := v_pot - v_fee;
    
    -- Pay winner
    UPDATE users SET won_tokens = COALESCE(won_tokens,0) + v_pay WHERE id = v_win.user_id
    RETURNING (COALESCE(purchased_tokens,0) + COALESCE(won_tokens,0)) INTO v_bal;
    
    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_win.user_id, 'game_win', v_pay, v_bal, 'WTA Winner', NOW());
    
    -- Mark completed
    UPDATE winner_takes_all_sessions SET 
        status = 'completed', 
        winner_user_id = v_win.user_id,
        winner_prize = v_pay, 
        platform_fee = v_fee, 
        completed_at = NOW()
    WHERE id::TEXT = v_s.id::TEXT;
    
    -- Auto-reset
    v_rng := floor(random() * 99999 + 1)::integer;
    DELETE FROM winner_takes_all_participants WHERE session_id::TEXT = v_s.id::TEXT;
    UPDATE winner_takes_all_sessions SET
        status = 'waiting', participants_count = 0, current_pot = 0,
        timer_started_at = NULL, winner_user_id = NULL, winner_prize = 0,
        platform_fee = 0, completed_at = NULL, rng_seed = v_rng, updated_at = NOW()
    WHERE id::TEXT = v_s.id::TEXT;
    
    RETURN jsonb_build_object('success', true, 'winner', v_win.name, 'payout', v_pay, 'fee', v_fee);
END;
$$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_winner_takes_all_payout(TEXT) TO authenticated, anon, service_role;

-- Step 8: Recreate sessions with 2 MINUTE timer
INSERT INTO winner_takes_all_sessions (
    id, config_id, status, participants_count, current_pot, prize_pool,
    timer_started_at, timer_duration, winner_user_id, winner_prize,
    platform_fee, rng_seed, created_at, updated_at, completed_at, base_price
)
SELECT 
    gen_random_uuid(),
    c.id,
    'waiting',
    0,
    0,
    0,
    NULL,
    120,  -- 2 MINUTES!
    NULL,
    0,
    0,
    floor(random() * 99999 + 1)::integer,
    NOW(),
    NOW(),
    NULL,
    COALESCE(c.entry_fee, c.base_price, 1)
FROM winner_takes_all_configs c;

-- Verify
SELECT '✅ WTA SESSIONS WITH 2 MIN TIMER:' as check;
SELECT id::TEXT, config_id, status, timer_duration, participants_count FROM winner_takes_all_sessions;

SELECT '
============================================
✅ WTA FULLY FIXED!
============================================
- Username column added
- Join function saves username
- Scoreboard shows usernames
- Payout function fixed
- Timer set to 120 seconds (2 minutes)
- Auto-reset after payout
============================================
' as done;

