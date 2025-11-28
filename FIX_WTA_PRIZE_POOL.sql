-- ============================================================================
-- 🔧 FIX WTA: Prize Pool Not Updating
-- ============================================================================

-- Step 1: Check current sessions state
SELECT '📋 CURRENT SESSIONS:' as info;
SELECT id::TEXT, config_id, status, participants_count, prize_pool, base_price 
FROM winner_takes_all_sessions;

-- Step 2: Check current participants
SELECT '📋 CURRENT PARTICIPANTS:' as info;
SELECT session_id::TEXT, user_id::TEXT, username, score, joined_at
FROM winner_takes_all_participants;

-- Step 3: Fix the JOIN function to properly update prize_pool
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.wta_join_v2(
    p_session TEXT, 
    p_user UUID, 
    p_fee NUMERIC
)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sid UUID; 
    v_p NUMERIC; 
    v_w NUMERIC; 
    v_s RECORD; 
    v_name TEXT; 
    v_bal NUMERIC;
    v_new_pool NUMERIC;
    v_new_count INTEGER;
BEGIN
    -- Convert session ID
    BEGIN
        v_sid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    -- Check already joined
    IF EXISTS (SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_sid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Get session with lock
    SELECT * INTO v_s FROM winner_takes_all_sessions WHERE id = v_sid FOR UPDATE;
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Get user with lock
    SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0), COALESCE(username, email, 'Player')
    INTO v_p, v_w, v_name FROM users WHERE id = p_user FOR UPDATE;
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Check balance
    IF (v_p + v_w) < p_fee THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    v_bal := (v_p + v_w) - p_fee;
    
    -- Deduct tokens
    IF v_p >= p_fee THEN 
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE 
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_p) WHERE id = p_user;
    END IF;

    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, v_bal, 'WTA Entry: ' || v_s.config_id, NOW());

    -- Add participant
    INSERT INTO winner_takes_all_participants (session_id, user_id, username, joined_at) 
    VALUES (v_sid, p_user, v_name, NOW());

    -- Calculate new values
    v_new_pool := COALESCE(v_s.prize_pool, 0) + p_fee;
    v_new_count := COALESCE(v_s.participants_count, 0) + 1;

    -- Update session with new prize_pool
    UPDATE winner_takes_all_sessions SET
        participants_count = v_new_count,
        prize_pool = v_new_pool,
        status = CASE 
            WHEN v_new_pool >= COALESCE(base_price, 2) THEN 'active' 
            ELSE 'waiting' 
        END,
        timer_started_at = CASE 
            WHEN v_new_pool >= COALESCE(base_price, 2) AND timer_started_at IS NULL THEN NOW() 
            ELSE timer_started_at 
        END,
        updated_at = NOW()
    WHERE id = v_sid;

    RAISE NOTICE 'WTA Join: session=%, user=%, fee=%, new_pool=%, new_count=%', 
        v_sid, p_user, p_fee, v_new_pool, v_new_count;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Successfully joined',
        'rng_seed', v_s.rng_seed, 
        'username', v_name,
        'new_pool', v_new_pool,
        'participants_count', v_new_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;

-- Step 4: Also fix get_all_sessions to return correct prize_pool
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id TEXT, config_id TEXT, current_pot NUMERIC, base_price NUMERIC,
    participants_count INTEGER, max_participants INTEGER, status TEXT,
    timer_started_at TIMESTAMPTZ, timer_duration INTEGER, winner_user_id TEXT,
    winner_prize NUMERIC, platform_fee NUMERIC, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, rng_seed INTEGER, participants JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::TEXT, 
        s.config_id::TEXT, 
        COALESCE(s.prize_pool, 0)::NUMERIC as current_pot,  -- This is the prize pool!
        COALESCE(s.base_price, 2)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER, 
        1000::INTEGER as max_participants, 
        COALESCE(s.status, 'waiting')::TEXT,
        s.timer_started_at, 
        COALESCE(s.timer_duration, 60)::INTEGER,
        s.winner_user_id::TEXT, 
        COALESCE(s.winner_prize, 0)::NUMERIC, 
        COALESCE(s.platform_fee_amount, 0)::NUMERIC,
        s.created_at, 
        s.updated_at, 
        s.completed_at, 
        COALESCE(s.rng_seed, 1)::INTEGER,
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id::TEXT, 
                'user_id', p.user_id::TEXT, 
                'username', COALESCE(p.username, 'Player'),
                'score', p.score, 
                'accuracy', p.accuracy, 
                'joined_at', p.joined_at, 
                'completed_at', p.completed_at
            ) ORDER BY COALESCE(p.score, 0) DESC)
            FROM winner_takes_all_participants p WHERE p.session_id = s.id
        ), '[]'::jsonb) as participants
    FROM winner_takes_all_sessions s 
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;

-- Step 5: Reset all sessions clean
DELETE FROM winner_takes_all_participants;

UPDATE winner_takes_all_sessions SET
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Step 6: Verify
SELECT '✅ SESSIONS AFTER RESET:' as info;
SELECT id::TEXT, config_id, status, participants_count, prize_pool, base_price 
FROM winner_takes_all_sessions;

-- Test get function
SELECT '✅ GET FUNCTION TEST:' as info;
SELECT id, config_id, current_pot, base_price, participants_count, status
FROM get_all_winner_takes_all_sessions() LIMIT 3;

SELECT '
============================================
✅ PRIZE POOL FIX COMPLETE!
============================================
- Join function now properly updates prize_pool
- Get sessions returns prize_pool as current_pot
- Timer starts when prize_pool >= base_price
- All sessions reset to 0
============================================
' as done;

