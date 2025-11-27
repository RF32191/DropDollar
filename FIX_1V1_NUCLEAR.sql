-- ============================================================================
-- ☢️ NUCLEAR FIX - DROP EVERYTHING AND REBUILD
-- ============================================================================

-- STEP 1: Show ALL versions of update_1v1_score (might be multiple!)
SELECT '🔍 ALL VERSIONS OF update_1v1_score:' as step1;
SELECT 
    p.proname,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_1v1_score';

-- STEP 2: Check if one_v_one_participants is a VIEW or TABLE
SELECT '🔍 TABLE OR VIEW?:' as step2;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'one_v_one_participants';

-- STEP 3: Check for table inheritance
SELECT '🔍 TABLE INHERITANCE:' as step3;
SELECT 
    c.relname as child,
    p.relname as parent
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
JOIN pg_class p ON p.oid = i.inhparent
WHERE c.relname = 'one_v_one_participants' OR p.relname = 'one_v_one_participants';

-- STEP 4: DROP ALL functions with this name (any signature)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname LIKE '%1v1%' AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.proname || '(' || func_record.args || ') CASCADE';
        RAISE NOTICE 'Dropped: %(%)', func_record.proname, func_record.args;
    END LOOP;
END $$;

-- STEP 5: Drop and recreate the participants table with username column
-- First backup any data (there shouldn't be any after resets)
CREATE TABLE IF NOT EXISTS one_v_one_participants_backup AS 
SELECT * FROM one_v_one_participants;

-- Drop and recreate
DROP TABLE IF EXISTS one_v_one_participants CASCADE;

CREATE TABLE one_v_one_participants (
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

-- Enable RLS with simple policies
ALTER TABLE one_v_one_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON one_v_one_participants FOR ALL USING (true) WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_participants_session ON one_v_one_participants(session_id);
CREATE INDEX idx_participants_user ON one_v_one_participants(user_id);

-- STEP 6: Create fresh functions
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
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "message": "Not found"}'::jsonb;
    END IF;
    
    RETURN '{"success": true}'::jsonb;
END;
$$;

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
    v_p NUMERIC; v_w NUMERIC; v_rng INT; v_cnt INT; v_name TEXT; v_bal NUMERIC;
BEGIN
    IF EXISTS (SELECT 1 FROM one_v_one_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN '{"success": false, "message": "Already joined"}'::jsonb;
    END IF;

    SELECT COALESCE(participants_count,0), rng_seed INTO v_cnt, v_rng
    FROM one_v_one_sessions WHERE id::TEXT = session_id_param AND status IN ('waiting','active') FOR UPDATE;
    
    IF NOT FOUND THEN RETURN '{"success": false, "message": "No session"}'::jsonb; END IF;
    IF v_cnt >= 2 THEN RETURN '{"success": false, "message": "Full"}'::jsonb; END IF;
    
    SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0), COALESCE(username,email,'Player')
    INTO v_p, v_w, v_name FROM users WHERE id = user_id_param FOR UPDATE;
    
    IF NOT FOUND THEN RETURN '{"success": false, "message": "No user"}'::jsonb; END IF;
    IF (v_p + v_w) < entry_fee_param THEN RETURN '{"success": false, "message": "No tokens"}'::jsonb; END IF;
    
    v_bal := (v_p + v_w) - entry_fee_param;
    
    IF v_p >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_p) WHERE id = user_id_param;
    END IF;
    
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (user_id_param, 'game_entry', -entry_fee_param, v_bal, '1v1', NOW());
    
    INSERT INTO one_v_one_participants (session_id, user_id, username)
    VALUES (session_id_param, user_id_param, v_name);
    
    UPDATE one_v_one_sessions SET participants_count = v_cnt + 1, current_pot = COALESCE(current_pot,0) + entry_fee_param, updated_at = NOW()
    WHERE id::TEXT = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'rng_seed', v_rng);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_1v1_sessions()
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
        COALESCE(s.participants_count,0)::INTEGER, 2::INTEGER, s.status::TEXT, s.timer_started_at,
        COALESCE(s.timer_duration,7200)::INTEGER, s.winner_user_id::TEXT, COALESCE(s.winner_prize,0)::NUMERIC,
        COALESCE(s.platform_fee,0)::NUMERIC, s.created_at, s.updated_at, s.completed_at, COALESCE(s.rng_seed,1)::INTEGER,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'user_id',p.user_id::TEXT,'username',p.username,'score',p.score,'accuracy',p.accuracy,'joined_at',p.joined_at,'completed_at',p.completed_at) ORDER BY COALESCE(p.score,0) DESC) FROM one_v_one_participants p WHERE p.session_id = s.id::TEXT),'[]'::jsonb)
    FROM one_v_one_sessions s WHERE s.status IN ('waiting','active') ORDER BY s.created_at DESC LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_s RECORD; v_win RECORD; v_lose RECORD; v_pot NUMERIC; v_fee NUMERIC; v_pay NUMERIC; v_bal NUMERIC;
BEGIN
    SELECT * INTO v_s FROM one_v_one_sessions WHERE config_id::TEXT = config_id_param AND status IN ('waiting','active') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No session"}'::jsonb; END IF;
    SELECT user_id, score, username INTO v_win FROM one_v_one_participants WHERE session_id = v_s.id::TEXT AND score IS NOT NULL ORDER BY score DESC LIMIT 1;
    IF NOT FOUND THEN RETURN '{"success":false,"message":"No scores"}'::jsonb; END IF;
    SELECT user_id, username INTO v_lose FROM one_v_one_participants WHERE session_id = v_s.id::TEXT AND user_id != v_win.user_id LIMIT 1;
    v_pot := COALESCE(v_s.current_pot,0); IF v_pot <= 0 THEN RETURN '{"success":false,"message":"Empty"}'::jsonb; END IF;
    v_fee := v_pot * 0.15; v_pay := v_pot - v_fee;
    UPDATE users SET won_tokens = COALESCE(won_tokens,0) + v_pay WHERE id = v_win.user_id RETURNING (COALESCE(purchased_tokens,0)+COALESCE(won_tokens,0)) INTO v_bal;
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at) VALUES (v_win.user_id, 'game_win', v_pay, v_bal, '1v1 Win', NOW());
    UPDATE one_v_one_sessions SET status='completed', winner_user_id=v_win.user_id, loser_user_id=v_lose.user_id, winner_prize=v_pay, platform_fee=v_fee, completed_at=NOW(), updated_at=NOW() WHERE id::TEXT = v_s.id::TEXT;
    RETURN jsonb_build_object('success',true,'winner',v_win.username,'payout',v_pay);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sid TEXT; v_fee NUMERIC;
BEGIN
    SELECT id::TEXT INTO v_sid FROM one_v_one_sessions WHERE config_id::TEXT = config_id_param LIMIT 1;
    SELECT entry_fee INTO v_fee FROM one_v_one_configs WHERE id::TEXT = config_id_param;
    IF v_sid IS NOT NULL THEN
        DELETE FROM one_v_one_participants WHERE session_id = v_sid;
        UPDATE one_v_one_sessions SET status='waiting', participants_count=0, current_pot=0, timer_started_at=NULL, winner_user_id=NULL, loser_user_id=NULL, winner_prize=0, platform_fee=0, completed_at=NULL, prize_pool=COALESCE(v_fee,0)*2, rng_seed=floor(random()*99999+1)::integer, updated_at=NOW() WHERE id::TEXT = v_sid;
    END IF;
    RETURN '{"success":true}'::jsonb;
END;
$$;

-- STEP 7: Grant permissions
GRANT ALL ON one_v_one_participants TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_1v1_sessions() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon, service_role;

-- STEP 8: Reset sessions
UPDATE one_v_one_sessions SET
    status = 'waiting', participants_count = 0, current_pot = 0, timer_started_at = NULL,
    winner_user_id = NULL, loser_user_id = NULL, winner_prize = 0, loser_prize = 0,
    platform_fee = 0, completed_at = NULL, rng_seed = floor(random()*99999+1)::integer, updated_at = NOW();

-- STEP 9: Timer trigger
DROP TRIGGER IF EXISTS auto_start_1v1_timer ON one_v_one_sessions;
CREATE OR REPLACE FUNCTION auto_start_1v1_timer() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_pot >= NEW.prize_pool AND NEW.timer_started_at IS NULL AND NEW.status != 'completed' THEN
        NEW.status := 'active'; NEW.timer_started_at := NOW(); NEW.timer_duration := 7200;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER auto_start_1v1_timer BEFORE UPDATE ON one_v_one_sessions FOR EACH ROW EXECUTE FUNCTION auto_start_1v1_timer();

-- VERIFY
SELECT '✅ TABLE COLUMNS:' as verify;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'one_v_one_participants';

SELECT '✅ FUNCTIONS:' as verify;
SELECT proname FROM pg_proc WHERE proname LIKE '%1v1%' AND pronamespace = 'public'::regnamespace;

SELECT '✅ SESSIONS:' as verify;
SELECT id::TEXT, status, participants_count FROM one_v_one_sessions LIMIT 3;

SELECT '
☢️ NUCLEAR FIX COMPLETE!
- Dropped and recreated participants table WITH username column
- All functions recreated from scratch
- All sessions reset
REFRESH AND TEST!
' as done;

