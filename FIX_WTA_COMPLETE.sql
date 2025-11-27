-- ============================================================================
-- 🔧 FIX WTA COMPLETE - Check and Create Tables
-- ============================================================================

-- Step 1: Check what WTA tables exist
SELECT '📋 CHECKING WTA TABLES:' as step;
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%wta%' OR table_name LIKE '%winner%';

-- Step 2: Check for fixed_game tables (might be using these instead)
SELECT '📋 CHECKING FIXED GAME TABLES:' as step;
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%fixed%' OR table_name LIKE '%hot_sell%';

-- Step 3: Create WTA tables if they don't exist
CREATE TABLE IF NOT EXISTS wta_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    game_type TEXT NOT NULL,
    entry_fee NUMERIC NOT NULL DEFAULT 1,
    max_participants INTEGER NOT NULL DEFAULT 10,
    prize_distribution JSONB DEFAULT '{"1": 85}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wta_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    config_id TEXT REFERENCES wta_configs(id),
    status TEXT DEFAULT 'waiting',
    participants_count INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 10,
    current_pot NUMERIC DEFAULT 0,
    prize_pool NUMERIC DEFAULT 0,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER DEFAULT 7200,
    winner_user_id UUID,
    winner_prize NUMERIC DEFAULT 0,
    platform_fee NUMERIC DEFAULT 0,
    rng_seed INTEGER DEFAULT floor(random() * 99999 + 1)::integer,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wta_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    username TEXT DEFAULT 'Player',
    score NUMERIC,
    accuracy NUMERIC,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_wta_sessions_status ON wta_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wta_sessions_config ON wta_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_wta_participants_session ON wta_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_wta_participants_user ON wta_participants(user_id);

-- Step 5: Enable RLS
ALTER TABLE wta_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wta_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wta_participants ENABLE ROW LEVEL SECURITY;

-- Simple policies
DROP POLICY IF EXISTS "wta_configs_all" ON wta_configs;
DROP POLICY IF EXISTS "wta_sessions_all" ON wta_sessions;
DROP POLICY IF EXISTS "wta_participants_all" ON wta_participants;

CREATE POLICY "wta_configs_all" ON wta_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "wta_sessions_all" ON wta_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "wta_participants_all" ON wta_participants FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Create/update functions
DROP FUNCTION IF EXISTS public.join_wta_session CASCADE;
DROP FUNCTION IF EXISTS public.process_wta_payout CASCADE;
DROP FUNCTION IF EXISTS public.get_all_wta_sessions CASCADE;

CREATE OR REPLACE FUNCTION public.join_wta_session(
    session_id_param TEXT,
    user_id_param UUID,
    entry_fee_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_p NUMERIC; v_w NUMERIC; v_rng INT; v_cnt INT; v_max INT; v_name TEXT; v_bal NUMERIC;
BEGIN
    IF EXISTS (SELECT 1 FROM wta_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN '{"success":false,"message":"Already joined"}'::jsonb;
    END IF;

    SELECT COALESCE(participants_count,0), COALESCE(max_participants,10), rng_seed INTO v_cnt, v_max, v_rng
    FROM wta_sessions WHERE id::TEXT = session_id_param AND status IN ('waiting','active') FOR UPDATE;
    
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No session"}'::jsonb; END IF;
    IF v_cnt >= v_max THEN RETURN '{"success":false,"message":"Full"}'::jsonb; END IF;
    
    SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0), COALESCE(username,email,'Player')
    INTO v_p, v_w, v_name FROM users WHERE id = user_id_param FOR UPDATE;
    
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No user"}'::jsonb; END IF;
    IF (v_p + v_w) < entry_fee_param THEN RETURN '{"success":false,"message":"No tokens"}'::jsonb; END IF;
    
    v_bal := (v_p + v_w) - entry_fee_param;
    
    IF v_p >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_p) WHERE id = user_id_param;
    END IF;
    
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (user_id_param, 'game_entry', -entry_fee_param, v_bal, 'WTA Entry', NOW());
    
    INSERT INTO wta_participants (session_id, user_id, username) VALUES (session_id_param, user_id_param, v_name);
    
    UPDATE wta_sessions SET participants_count = v_cnt + 1, current_pot = COALESCE(current_pot,0) + entry_fee_param, updated_at = NOW()
    WHERE id::TEXT = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'rng_seed', v_rng);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wta_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE wta_participants SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"Not found"}'::jsonb; END IF;
    RETURN '{"success":true}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_wta_sessions()
RETURNS TABLE (
    id TEXT, config_id TEXT, current_pool NUMERIC, prize_pool NUMERIC,
    participants_count INTEGER, max_participants INTEGER, status TEXT,
    timer_started_at TIMESTAMPTZ, timer_duration INTEGER, winner_user_id TEXT,
    prize_amount NUMERIC, platform_fee NUMERIC, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, rng_seed INTEGER, participants JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT s.id::TEXT, s.config_id::TEXT, COALESCE(s.current_pot,0)::NUMERIC, COALESCE(s.prize_pool,0)::NUMERIC,
        COALESCE(s.participants_count,0)::INTEGER, COALESCE(s.max_participants,10)::INTEGER, s.status::TEXT,
        s.timer_started_at, COALESCE(s.timer_duration,7200)::INTEGER, s.winner_user_id::TEXT,
        COALESCE(s.winner_prize,0)::NUMERIC, COALESCE(s.platform_fee,0)::NUMERIC,
        s.created_at, s.updated_at, s.completed_at, COALESCE(s.rng_seed,1)::INTEGER,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'user_id',p.user_id::TEXT,'username',p.username,'score',p.score,'accuracy',p.accuracy,'joined_at',p.joined_at,'completed_at',p.completed_at) ORDER BY COALESCE(p.score,0) DESC) FROM wta_participants p WHERE p.session_id = s.id::TEXT),'[]'::jsonb)
    FROM wta_sessions s WHERE s.status IN ('waiting','active') ORDER BY s.created_at DESC LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_wta_payout(config_id_param TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_s RECORD; v_win RECORD; v_pot NUMERIC; v_fee NUMERIC; v_pay NUMERIC; v_bal NUMERIC; v_rng INT;
BEGIN
    SELECT * INTO v_s FROM wta_sessions WHERE config_id::TEXT = config_id_param AND status IN ('waiting','active') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No session"}'::jsonb; END IF;
    SELECT user_id, score, username INTO v_win FROM wta_participants WHERE session_id = v_s.id::TEXT AND score IS NOT NULL ORDER BY score DESC LIMIT 1;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No scores"}'::jsonb; END IF;
    v_pot := COALESCE(v_s.current_pot,0); IF v_pot <= 0 THEN RETURN '{"success":false,"message":"Empty"}'::jsonb; END IF;
    v_fee := v_pot * 0.15; v_pay := v_pot - v_fee;
    UPDATE users SET won_tokens = COALESCE(won_tokens,0) + v_pay WHERE id = v_win.user_id RETURNING (COALESCE(purchased_tokens,0)+COALESCE(won_tokens,0)) INTO v_bal;
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at) VALUES (v_win.user_id, 'game_win', v_pay, v_bal, 'WTA Win', NOW());
    UPDATE wta_sessions SET status='completed', winner_user_id=v_win.user_id, winner_prize=v_pay, platform_fee=v_fee, completed_at=NOW(), updated_at=NOW() WHERE id::TEXT = v_s.id::TEXT;
    -- Auto reset
    v_rng := floor(random()*99999+1)::integer;
    DELETE FROM wta_participants WHERE session_id = v_s.id::TEXT;
    UPDATE wta_sessions SET status='waiting', participants_count=0, current_pot=0, timer_started_at=NULL, winner_user_id=NULL, winner_prize=0, platform_fee=0, completed_at=NULL, rng_seed=v_rng, updated_at=NOW() WHERE id::TEXT = v_s.id::TEXT;
    RETURN jsonb_build_object('success',true,'winner',v_win.username,'payout',v_pay);
END;
$$;

-- Grant permissions
GRANT ALL ON wta_configs TO authenticated, anon, service_role;
GRANT ALL ON wta_sessions TO authenticated, anon, service_role;
GRANT ALL ON wta_participants TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.join_wta_session(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_wta_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_wta_sessions() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_wta_payout(TEXT) TO authenticated, anon, service_role;

-- Step 7: Create default configs if none exist
INSERT INTO wta_configs (id, game_type, entry_fee, max_participants)
SELECT gen_random_uuid()::TEXT, 'quick_click', 1, 10
WHERE NOT EXISTS (SELECT 1 FROM wta_configs WHERE game_type = 'quick_click');

INSERT INTO wta_configs (id, game_type, entry_fee, max_participants)
SELECT gen_random_uuid()::TEXT, 'laser_dodge', 1, 10
WHERE NOT EXISTS (SELECT 1 FROM wta_configs WHERE game_type = 'laser_dodge');

-- Step 8: Create sessions for each config
INSERT INTO wta_sessions (id, config_id, prize_pool, max_participants)
SELECT gen_random_uuid()::TEXT, c.id, c.entry_fee * c.max_participants, c.max_participants
FROM wta_configs c
WHERE NOT EXISTS (SELECT 1 FROM wta_sessions s WHERE s.config_id = c.id);

-- Verify
SELECT '✅ WTA TABLES:' as check;
SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%wta%';

SELECT '✅ WTA SESSIONS:' as check;
SELECT id::TEXT, status, participants_count, max_participants FROM wta_sessions;

SELECT '
============================================
✅ WTA COMPLETE SETUP DONE!
============================================
- Created wta_configs, wta_sessions, wta_participants
- All functions created
- Default configs and sessions created
============================================
' as done;

