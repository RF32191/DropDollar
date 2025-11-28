-- ============================================================================
-- 🔧 WTA FINAL FIX: Drop triggers, fix functions, reset everything
-- ============================================================================

-- Step 1: Drop ALL triggers on WTA tables (they're causing issues)
DROP TRIGGER IF EXISTS auto_start_wta_timer ON winner_takes_all_sessions;
DROP TRIGGER IF EXISTS wta_timer_trigger ON winner_takes_all_sessions;
DROP TRIGGER IF EXISTS wta_payout_trigger ON winner_takes_all_sessions;
DROP TRIGGER IF EXISTS auto_wta_payout ON winner_takes_all_sessions;

DROP FUNCTION IF EXISTS auto_start_wta_timer() CASCADE;
DROP FUNCTION IF EXISTS wta_timer_trigger() CASCADE;
DROP FUNCTION IF EXISTS wta_payout_trigger() CASCADE;

SELECT '✅ Step 1: Triggers dropped' as status;

-- Step 2: Drop all WTA functions
DROP FUNCTION IF EXISTS public.wta_join_v2(TEXT, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.process_payout_by_config(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reset_wta_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.process_wta_payout(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(TEXT, UUID, NUMERIC) CASCADE;

SELECT '✅ Step 2: Functions dropped' as status;

-- Step 3: Recreate participants table with UUID
DROP TABLE IF EXISTS winner_takes_all_participants CASCADE;

CREATE TABLE winner_takes_all_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    username TEXT DEFAULT 'Player',
    score NUMERIC,
    accuracy NUMERIC,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

CREATE INDEX idx_wta_p_session ON winner_takes_all_participants(session_id);
CREATE INDEX idx_wta_p_user ON winner_takes_all_participants(user_id);
ALTER TABLE winner_takes_all_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wta_p_all" ON winner_takes_all_participants FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON winner_takes_all_participants TO authenticated, anon, service_role;

SELECT '✅ Step 3: Participants table recreated' as status;

-- Step 4: Reset all sessions with 1 minute timer
DELETE FROM winner_takes_all_sessions;

INSERT INTO winner_takes_all_sessions (
    id, config_id, status, participants_count, prize_pool, base_price,
    timer_duration, rng_seed, created_at, updated_at
)
SELECT gen_random_uuid(), c.id, 'waiting', 0, 0, 
    COALESCE(c.base_price, c.entry_fee, 2), 60,
    floor(random() * 99999 + 1)::integer, NOW(), NOW()
FROM winner_takes_all_configs c;

SELECT '✅ Step 4: Sessions reset with 1 min timer' as status;

-- Step 5: Create JOIN function
CREATE OR REPLACE FUNCTION public.wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sid UUID; v_p NUMERIC; v_w NUMERIC; v_s RECORD; v_name TEXT; v_bal NUMERIC;
BEGIN
    v_sid := p_session::UUID;
    
    IF EXISTS (SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_sid AND user_id = p_user) THEN
        RETURN '{"success":false,"message":"Already joined"}'::jsonb;
    END IF;

    SELECT * INTO v_s FROM winner_takes_all_sessions WHERE id = v_sid FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"Session not found"}'::jsonb; END IF;

    SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0), COALESCE(username, email, 'Player')
    INTO v_p, v_w, v_name FROM users WHERE id = p_user FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"User not found"}'::jsonb; END IF;
    IF (v_p + v_w) < p_fee THEN RETURN '{"success":false,"message":"Insufficient tokens"}'::jsonb; END IF;

    v_bal := (v_p + v_w) - p_fee;
    IF v_p >= p_fee THEN UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_p) WHERE id = p_user; END IF;

    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, v_bal, 'WTA Entry', NOW());

    INSERT INTO winner_takes_all_participants (session_id, user_id, username) VALUES (v_sid, p_user, v_name);

    -- Update session - check if prize pool meets base price to start timer
    UPDATE winner_takes_all_sessions SET
        participants_count = COALESCE(participants_count,0) + 1,
        prize_pool = COALESCE(prize_pool,0) + p_fee,
        status = CASE WHEN COALESCE(prize_pool,0) + p_fee >= base_price THEN 'active' ELSE status END,
        timer_started_at = CASE WHEN COALESCE(prize_pool,0) + p_fee >= base_price AND timer_started_at IS NULL THEN NOW() ELSE timer_started_at END,
        updated_at = NOW()
    WHERE id = v_sid;

    RETURN jsonb_build_object('success', true, 'rng_seed', v_s.rng_seed, 'username', v_name);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

SELECT '✅ Step 5: Join function created' as status;

-- Step 6: Create SCORE function
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param TEXT, user_id_param UUID, score_param NUMERIC, accuracy_param NUMERIC
)
RETURNS TABLE (success BOOLEAN, message TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sid UUID;
BEGIN
    IF session_id_param IS NULL THEN RETURN QUERY SELECT false, 'No session ID'::TEXT; RETURN; END IF;
    IF user_id_param IS NULL THEN RETURN QUERY SELECT false, 'No user ID'::TEXT; RETURN; END IF;
    
    v_sid := session_id_param::UUID;
    
    UPDATE winner_takes_all_participants SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = v_sid AND user_id = user_id_param;
    
    IF NOT FOUND THEN RETURN QUERY SELECT false, 'Participant not found'::TEXT; RETURN; END IF;
    RETURN QUERY SELECT true, 'Score saved'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$;

SELECT '✅ Step 6: Score function created' as status;

-- Step 7: Create GET SESSIONS function
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
    SELECT s.id::TEXT, s.config_id::TEXT, COALESCE(s.prize_pool, 0)::NUMERIC,
        COALESCE(s.base_price, 1)::NUMERIC, COALESCE(s.participants_count, 0)::INTEGER, 
        1000::INTEGER, s.status::TEXT, s.timer_started_at, 
        COALESCE(s.timer_duration, 60)::INTEGER, s.winner_user_id::TEXT, 
        COALESCE(s.winner_prize, 0)::NUMERIC, COALESCE(s.platform_fee_amount, 0)::NUMERIC,
        s.created_at, s.updated_at, s.completed_at, COALESCE(s.rng_seed, 1)::INTEGER,
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id::TEXT, 'user_id', p.user_id::TEXT, 'username', COALESCE(p.username, 'Player'),
                'score', p.score, 'accuracy', p.accuracy, 'joined_at', p.joined_at, 'completed_at', p.completed_at
            ) ORDER BY COALESCE(p.score, 0) DESC)
            FROM winner_takes_all_participants p WHERE p.session_id = s.id
        ), '[]'::jsonb)
    FROM winner_takes_all_sessions s ORDER BY s.created_at DESC;
END;
$$;

SELECT '✅ Step 7: Get sessions function created' as status;

-- Step 8: Create PAYOUT function (NO triggers, NO winner_score field)
CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_s RECORD; v_win RECORD; v_pot NUMERIC; v_fee NUMERIC; v_pay NUMERIC; v_bal NUMERIC; v_rng INT;
BEGIN
    SELECT * INTO v_s FROM winner_takes_all_sessions WHERE config_id = config_id_param ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No session"}'::jsonb; END IF;
    
    IF v_s.status = 'completed' AND v_s.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'already_paid', true, 'payout_amount', v_s.winner_prize);
    END IF;
    
    SELECT p.user_id, p.score, COALESCE(p.username, 'Player') as username INTO v_win
    FROM winner_takes_all_participants p WHERE p.session_id = v_s.id AND p.score IS NOT NULL ORDER BY p.score DESC LIMIT 1;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No scores yet"}'::jsonb; END IF;
    
    v_pot := COALESCE(v_s.prize_pool, 0); 
    IF v_pot <= 0 THEN RETURN '{"success":false,"message":"Empty pot"}'::jsonb; END IF;
    
    v_fee := v_pot * 0.15; v_pay := v_pot - v_fee;
    
    UPDATE users SET won_tokens = COALESCE(won_tokens,0) + v_pay WHERE id = v_win.user_id
    RETURNING (COALESCE(purchased_tokens,0) + COALESCE(won_tokens,0)) INTO v_bal;
    
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_win.user_id, 'game_win', v_pay, v_bal, 'WTA Winner', NOW());
    
    -- Mark completed (no trigger will fire)
    UPDATE winner_takes_all_sessions SET 
        status = 'completed', 
        winner_user_id = v_win.user_id, 
        winner_prize = v_pay,
        platform_fee_amount = v_fee, 
        completed_at = NOW() 
    WHERE id = v_s.id;
    
    -- Auto reset
    v_rng := floor(random() * 99999 + 1)::integer;
    DELETE FROM winner_takes_all_participants WHERE session_id = v_s.id;
    UPDATE winner_takes_all_sessions SET 
        status = 'waiting', 
        participants_count = 0, 
        prize_pool = 0,
        timer_started_at = NULL, 
        winner_user_id = NULL, 
        winner_prize = 0, 
        platform_fee_amount = 0, 
        completed_at = NULL, 
        rng_seed = v_rng, 
        updated_at = NOW() 
    WHERE id = v_s.id;
    
    RETURN jsonb_build_object('success', true, 'winner_username', v_win.username, 'payout_amount', v_pay, 'winner_score', v_win.score);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

SELECT '✅ Step 8: Payout function created' as status;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;

SELECT '✅ Step 9: Permissions granted' as status;

-- Verify
SELECT '✅ SESSIONS:' as info;
SELECT id::TEXT, config_id, status, timer_duration FROM winner_takes_all_sessions;

SELECT '✅ FUNCTION TEST:' as info;
SELECT id, config_id, status FROM get_all_winner_takes_all_sessions() LIMIT 3;

SELECT '
============================================
✅ WTA FINAL FIX COMPLETE!
============================================
- All triggers REMOVED (they were causing issues)
- Participants table recreated with UUID
- All functions recreated fresh
- All sessions reset with 1 minute timer
- Timer logic built into join function
============================================
' as done;

