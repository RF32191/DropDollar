-- ============================================================================
-- 🚀 WTA SCALED SOLUTION - Based on Working Code
-- ============================================================================
-- Timer starts when prize_pool >= base_price
-- Optimized for many concurrent users
-- ============================================================================

-- ============================================================================
-- STEP 1: RESET ALL SESSIONS FOR CLEAN START
-- ============================================================================
DELETE FROM winner_takes_all_participants;

UPDATE winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    updated_at = NOW();

SELECT '✅ Step 1: All sessions reset' as status;

-- ============================================================================
-- STEP 2: ADD INDEXES FOR SCALABILITY
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wta_sessions_config_status ON winner_takes_all_sessions(config_id, status);
CREATE INDEX IF NOT EXISTS idx_wta_sessions_status ON winner_takes_all_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wta_participants_session ON winner_takes_all_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_wta_participants_user ON winner_takes_all_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_wta_participants_score ON winner_takes_all_participants(session_id, score DESC NULLS LAST);

SELECT '✅ Step 2: Performance indexes created' as status;

-- ============================================================================
-- STEP 3: ENSURE USERNAME COLUMN EXISTS
-- ============================================================================
ALTER TABLE winner_takes_all_participants ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Player';

SELECT '✅ Step 3: Username column ensured' as status;

-- ============================================================================
-- STEP 4: ENSURE TIMER_DURATION ON CONFIGS
-- ============================================================================
ALTER TABLE winner_takes_all_configs ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 60;
UPDATE winner_takes_all_configs SET timer_duration = 60 WHERE timer_duration IS NULL;

SELECT '✅ Step 4: Timer duration set to 60 seconds' as status;

-- ============================================================================
-- STEP 5: CREATE AUTO-START TIMER TRIGGER
-- ============================================================================
DROP TRIGGER IF EXISTS auto_start_wta_timer ON winner_takes_all_sessions;
DROP FUNCTION IF EXISTS auto_start_wta_timer();

CREATE OR REPLACE FUNCTION auto_start_wta_timer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prize_pool >= NEW.base_price 
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.timer_duration := COALESCE(NEW.timer_duration, 60);
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_start_wta_timer
    BEFORE UPDATE OR INSERT ON winner_takes_all_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_wta_timer();

SELECT '✅ Step 5: Auto-timer trigger created' as status;

-- ============================================================================
-- STEP 6: SCALED JOIN FUNCTION (wta_join_v2)
-- ============================================================================
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.wta_join_v2(
    p_session TEXT,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_rng_seed INT;
    v_username TEXT;
    v_balance_after NUMERIC;
BEGIN
    v_session_uuid := p_session::UUID;
    
    -- Check tokens with row lock
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0), COALESCE(username, email, 'Player')
    INTO v_purchased, v_won, v_username
    FROM users WHERE id = p_user FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    v_balance_after := (v_purchased + v_won) - p_fee;
    
    -- Deduct tokens
    IF v_purchased >= p_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    END IF;
    
    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, v_balance_after, 'WTA Entry', NOW());
    
    -- Get RNG seed
    SELECT rng_seed INTO v_rng_seed FROM winner_takes_all_sessions WHERE id = v_session_uuid;
    
    -- Add participant with username
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
    VALUES (gen_random_uuid(), v_session_uuid, p_user, v_username, NOW());
    
    -- Update session (trigger checks prize_pool >= base_price)
    UPDATE winner_takes_all_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        prize_pool = COALESCE(prize_pool, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'rng_seed', v_rng_seed,
        'username', v_username
    );
    
EXCEPTION 
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'message', 'Server busy, please retry');
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;

SELECT '✅ Step 6: Scaled join function created' as status;

-- ============================================================================
-- STEP 7: UPDATE SCORE FUNCTION (CORRECT PARAMS)
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score CASCADE;

CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session_uuid UUID;
BEGIN
    v_session_uuid := session_id_param::UUID;
    
    UPDATE winner_takes_all_participants 
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = v_session_uuid AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Participant not found'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Score saved'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;

SELECT '✅ Step 7: Score update function created' as status;

-- ============================================================================
-- STEP 8: GET ALL SESSIONS FUNCTION
-- ============================================================================
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
        COALESCE(s.prize_pool, 0)::NUMERIC as current_pot,
        COALESCE(s.base_price, 1)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER, 
        COALESCE(s.max_participants, 1000)::INTEGER, 
        s.status::TEXT,
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
            FROM winner_takes_all_participants p 
            WHERE p.session_id = s.id
        ), '[]'::jsonb)
    FROM winner_takes_all_sessions s 
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;

SELECT '✅ Step 8: Get sessions function created' as status;

-- ============================================================================
-- STEP 9: PAYOUT FUNCTION (FRONTEND COMPATIBLE)
-- ============================================================================
DROP FUNCTION IF EXISTS public.process_payout_by_config(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_balance_after NUMERIC;
BEGIN
    -- Find session with lock
    SELECT * INTO session_record
    FROM winner_takes_all_sessions
    WHERE config_id = config_id_param
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;

    -- Check if already paid
    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Already paid out',
            'winner_username', (SELECT COALESCE(username, 'Player') FROM users WHERE id = session_record.winner_user_id),
            'payout_amount', session_record.winner_prize,
            'already_paid', true
        );
    END IF;

    -- Find winner
    SELECT p.user_id, p.score, COALESCE(p.username, u.username, 'Player') as username
    INTO winner_record
    FROM winner_takes_all_participants p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;

    -- Calculate payout
    total_pot := COALESCE(session_record.prize_pool, 0);
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;

    -- Pay winner
    UPDATE users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout, updated_at = NOW()
    WHERE id = winner_record.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance_after;

    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (winner_record.user_id, 'game_win', v_winner_payout, v_balance_after, 'WTA Winner: ' || config_id_param, NOW());

    -- Mark completed
    UPDATE winner_takes_all_sessions
    SET status = 'completed', winner_user_id = winner_record.user_id, winner_prize = v_winner_payout,
        platform_fee_amount = v_platform_fee, completed_at = NOW(), updated_at = NOW()
    WHERE id = session_record.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.username,
        'winner_score', winner_record.score,
        'payout_amount', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION 
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payout in progress');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;

SELECT '✅ Step 9: Payout function created' as status;

-- ============================================================================
-- STEP 10: AUTO-RESET FUNCTION
-- ============================================================================
DROP FUNCTION IF EXISTS public.reset_wta_session(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.reset_wta_session(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    SELECT id INTO v_session_id
    FROM winner_takes_all_sessions
    WHERE config_id = config_id_param
    AND status = 'completed';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No completed session');
    END IF;
    
    DELETE FROM winner_takes_all_participants WHERE session_id = v_session_id;
    
    UPDATE winner_takes_all_sessions
    SET status = 'waiting', participants_count = 0, prize_pool = 0,
        timer_started_at = NULL, winner_user_id = NULL, winner_prize = 0,
        platform_fee_amount = 0, completed_at = NULL, 
        rng_seed = floor(random() * 99999 + 1)::integer, updated_at = NOW()
    WHERE id = v_session_id;
    
    RETURN json_build_object('success', true, 'message', 'Session reset');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_wta_session(TEXT) TO authenticated, anon, service_role;

SELECT '✅ Step 10: Reset function created' as status;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT '📊 SESSIONS:' as info, config_id, status, participants_count, prize_pool, base_price, timer_duration
FROM winner_takes_all_sessions ORDER BY config_id LIMIT 10;

SELECT '
✅ WTA SCALED SOLUTION COMPLETE!
═══════════════════════════════════════════════════════════════════
Features:
- Timer starts when prize_pool >= base_price
- 60 second countdown
- Username saved with each participant
- Scalable indexes for millions of users
- Race condition protection with FOR UPDATE NOWAIT
- Auto-reset after payout

Functions:
- wta_join_v2(session, user, fee) → Join a session
- update_winner_takes_all_score(session, user, score, accuracy) → Save score
- get_all_winner_takes_all_sessions() → List all sessions
- process_payout_by_config(config_id) → Pay winner
- reset_wta_session(config_id) → Reset for new round
═══════════════════════════════════════════════════════════════════
' as summary;

