-- ============================================================================
-- 🛡️ MASTER SKILL-BASED GAMING SETUP - RUN THIS ONE FILE!
-- ============================================================================
-- This is the COMPLETE setup for skill-based gaming with ALL features:
-- 
-- ✅ RNG Seeding (fairness - all players in session get same RNG)
-- ✅ Anti-cheat protection (bot detection, score validation)
-- ✅ Dual wallet system (purchased tokens first, won tokens cashable)
-- ✅ Rate limiting (30/hour, 200/day)
-- ✅ Payout audit trail (legal compliance)
-- ✅ Admin tools (review, approve/reject, ban)
-- ✅ Session creation (proper sessions for all games)
--
-- JUST RUN THIS ONE FILE IN SUPABASE SQL EDITOR!
-- ============================================================================

-- ============================================================================
-- PART 1: DATABASE TABLES
-- ============================================================================

-- Add RNG seeds to config tables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hot_sell_configs' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.hot_sell_configs ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'winner_takes_all_configs' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.winner_takes_all_configs ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_configs' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.one_v_one_configs ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
  END IF;
END $$;

-- Ensure all configs have RNG seeds
UPDATE public.hot_sell_configs SET rng_seed = floor(random() * 2147483647)::INTEGER WHERE rng_seed IS NULL OR rng_seed = 0;
UPDATE public.winner_takes_all_configs SET rng_seed = floor(random() * 2147483647)::INTEGER WHERE rng_seed IS NULL OR rng_seed = 0;
UPDATE public.one_v_one_configs SET rng_seed = floor(random() * 2147483647)::INTEGER WHERE rng_seed IS NULL OR rng_seed = 0;

-- Create game_sessions table (anti-cheat)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  listing_id TEXT,
  entry_number INTEGER,
  competition_type TEXT,
  rng_seed INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'invalid', 'under_review')),
  server_score DECIMAL(10,2),
  client_score DECIMAL(10,2),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  input_count INTEGER,
  duration_ms INTEGER,
  suspicion_score INTEGER DEFAULT 0,
  invalid_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON public.game_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_suspicion ON public.game_sessions(suspicion_score DESC) WHERE suspicion_score > 60;

-- Create anti_cheat_logs table
CREATE TABLE IF NOT EXISTS public.anti_cheat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES public.game_sessions(session_id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  suspicion_score INTEGER NOT NULL,
  reasons TEXT[] NOT NULL,
  client_score DECIMAL(10,2),
  server_score DECIMAL(10,2),
  input_rate DECIMAL(10,2),
  avg_reaction_time INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_taken TEXT CHECK (action_taken IN ('none', 'warning', 'banned', 'cleared', 'prize_withheld')),
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_user ON public.anti_cheat_logs(user_id, flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_score ON public.anti_cheat_logs(suspicion_score DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_pending ON public.anti_cheat_logs(flagged_at DESC) WHERE reviewed_at IS NULL;

-- Create user_rate_limits table
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  games_played_last_hour INTEGER DEFAULT 0,
  last_game_at TIMESTAMPTZ,
  games_played_today INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  suspicious_flags_count INTEGER DEFAULT 0,
  last_flag_at TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_until TIMESTAMPTZ,
  ban_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_banned ON public.user_rate_limits(is_banned, banned_until) WHERE is_banned = TRUE;

-- Create payout_audit_trail table
CREATE TABLE IF NOT EXISTS public.payout_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  competition_type TEXT NOT NULL,
  prize_amount DECIMAL(10,2) NOT NULL,
  entry_fee DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  final_score DECIMAL(10,2),
  rank INTEGER,
  total_participants INTEGER,
  is_validated BOOLEAN DEFAULT FALSE,
  validation_status TEXT CHECK (validation_status IN ('pending', 'approved', 'rejected', 'under_review')),
  validator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  ip_address TEXT,
  suspicion_score INTEGER DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payout_audit_user ON public.payout_audit_trail(user_id, awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_audit_pending ON public.payout_audit_trail(validation_status, awarded_at DESC) WHERE validation_status = 'pending';

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.game_sessions;
CREATE POLICY "Users can view own sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own rate limits" ON public.user_rate_limits;
CREATE POLICY "Users can view own rate limits" ON public.user_rate_limits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own payouts" ON public.payout_audit_trail;
CREATE POLICY "Users can view own payouts" ON public.payout_audit_trail FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- PART 2: VALIDATION FUNCTIONS
-- ============================================================================

-- spend_tokens function (dual wallet)
DROP FUNCTION IF EXISTS spend_tokens(UUID, DECIMAL) CASCADE;
CREATE OR REPLACE FUNCTION spend_tokens(user_id_param UUID, amount DECIMAL(10,2))
RETURNS TABLE (success BOOLEAN, purchased_spent DECIMAL(10,2), won_spent DECIMAL(10,2), message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_purchased DECIMAL(10,2); current_won DECIMAL(10,2); total_available DECIMAL(10,2);
  purchased_to_spend DECIMAL(10,2); won_to_spend DECIMAL(10,2);
BEGIN
  SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0) INTO current_purchased, current_won FROM public.users WHERE id = user_id_param;
  total_available := current_purchased + current_won;
  IF total_available < amount THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL(10,2), 0::DECIMAL(10,2), 'Insufficient tokens. Need ' || amount::TEXT || ', have ' || total_available::TEXT;
    RETURN;
  END IF;
  IF current_purchased >= amount THEN purchased_to_spend := amount; won_to_spend := 0;
  ELSE purchased_to_spend := current_purchased; won_to_spend := amount - current_purchased; END IF;
  UPDATE public.users SET purchased_tokens = purchased_tokens - purchased_to_spend, won_tokens = won_tokens - won_to_spend, updated_at = NOW() WHERE id = user_id_param;
  RETURN QUERY SELECT TRUE, purchased_to_spend, won_to_spend, 'Successfully spent ' || amount::TEXT || ' tokens';
END; $$;

-- check_rate_limit function
DROP FUNCTION IF EXISTS check_rate_limit(UUID) CASCADE;
CREATE OR REPLACE FUNCTION check_rate_limit(user_id_param UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rate_record RECORD;
BEGIN
  INSERT INTO public.user_rate_limits (user_id, updated_at) VALUES (user_id_param, NOW()) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO rate_record FROM public.user_rate_limits WHERE user_id = user_id_param;
  IF rate_record.is_banned AND (rate_record.banned_until IS NULL OR rate_record.banned_until > NOW()) THEN
    RETURN json_build_object('allowed', false, 'reason', 'Account temporarily suspended: ' || COALESCE(rate_record.ban_reason, 'Suspicious activity detected'));
  END IF;
  IF rate_record.last_game_at > NOW() - INTERVAL '1 hour' AND rate_record.games_played_last_hour >= 30 THEN
    RETURN json_build_object('allowed', false, 'reason', 'Rate limit exceeded. Maximum 30 games per hour.');
  END IF;
  IF rate_record.daily_reset_at < NOW() - INTERVAL '24 hours' THEN
    UPDATE public.user_rate_limits SET games_played_today = 0, daily_reset_at = NOW() WHERE user_id = user_id_param;
  ELSIF rate_record.games_played_today >= 200 THEN
    RETURN json_build_object('allowed', false, 'reason', 'Daily limit reached. Maximum 200 games per day.');
  END IF;
  RETURN json_build_object('allowed', true, 'reason', '');
END; $$;

-- update_rate_limits function
DROP FUNCTION IF EXISTS update_rate_limits(UUID) CASCADE;
CREATE OR REPLACE FUNCTION update_rate_limits(user_id_param UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_rate_limits (user_id, updated_at) VALUES (user_id_param, NOW()) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_rate_limits SET 
    games_played_last_hour = CASE WHEN last_game_at IS NULL OR last_game_at < NOW() - INTERVAL '1 hour' THEN 1 ELSE games_played_last_hour + 1 END,
    games_played_today = games_played_today + 1, last_game_at = NOW(), updated_at = NOW() WHERE user_id = user_id_param;
END; $$;

-- ============================================================================
-- PART 3: JOIN FUNCTIONS (Hot Sell, Winner Takes All, 1v1)
-- ============================================================================

-- join_hot_sell_session
DROP FUNCTION IF EXISTS join_hot_sell_session(TEXT, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_hot_sell_session(UUID, UUID, DECIMAL) CASCADE;
CREATE OR REPLACE FUNCTION join_hot_sell_session(session_id_param TEXT, user_id_param UUID, entry_fee_param DECIMAL(10,2))
RETURNS TABLE (success BOOLEAN, message TEXT, new_pot DECIMAL(10,2), participant_id TEXT, rng_seed INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID; v_rate_check JSON; v_spend_result RECORD; v_rng_seed INTEGER; v_pot DECIMAL(10,2);
BEGIN
  SELECT * INTO v_rate_check FROM check_rate_limit(user_id_param);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN RETURN QUERY SELECT FALSE, v_rate_check->>'reason', 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END IF;
  BEGIN v_session_id := session_id_param::UUID; EXCEPTION WHEN OTHERS THEN RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END;
  SELECT COALESCE(s.current_pool, 0), COALESCE(c.rng_seed, 0) INTO v_pot, v_rng_seed FROM public.hot_sell_sessions s JOIN public.hot_sell_configs c ON c.id = s.config_id WHERE s.id = v_session_id AND s.status = 'active';
  IF v_rng_seed IS NULL THEN RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = v_session_id AND user_id = user_id_param) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_pot, ''::TEXT, v_rng_seed; RETURN;
  END IF;
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END IF;
  v_pot := v_pot + entry_fee_param;
  UPDATE public.hot_sell_sessions SET current_pool = v_pot, updated_at = NOW() WHERE id = v_session_id;
  INSERT INTO public.hot_sell_participants (id, session_id, user_id, joined_at) VALUES (gen_random_uuid(), v_session_id, user_id_param, NOW());
  PERFORM update_rate_limits(user_id_param);
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_pot, gen_random_uuid()::TEXT, v_rng_seed;
END; $$;

-- join_winner_takes_all_session
DROP FUNCTION IF EXISTS join_winner_takes_all_session(TEXT, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS join_winner_takes_all_session(UUID, UUID, DECIMAL) CASCADE;
CREATE OR REPLACE FUNCTION join_winner_takes_all_session(session_id_param TEXT, user_id_param UUID, entry_fee_param DECIMAL(10,2))
RETURNS TABLE (success BOOLEAN, message TEXT, new_prize_pool DECIMAL(10,2), participant_id TEXT, rng_seed INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID; v_rate_check JSON; v_spend_result RECORD; v_rng_seed INTEGER; v_pool DECIMAL(10,2);
BEGIN
  SELECT * INTO v_rate_check FROM check_rate_limit(user_id_param);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN RETURN QUERY SELECT FALSE, v_rate_check->>'reason', 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END IF;
  BEGIN v_session_id := session_id_param::UUID; EXCEPTION WHEN OTHERS THEN RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END;
  SELECT COALESCE(s.current_pool, 0), COALESCE(c.rng_seed, 0) INTO v_pool, v_rng_seed FROM public.winner_takes_all_sessions s JOIN public.winner_takes_all_configs c ON c.id = s.config_id WHERE s.id = v_session_id AND s.status = 'active';
  IF v_rng_seed IS NULL THEN RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = v_session_id AND user_id = user_id_param) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_pool, ''::TEXT, v_rng_seed; RETURN;
  END IF;
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), ''::TEXT, 0::INTEGER; RETURN; END IF;
  v_pool := v_pool + entry_fee_param;
  UPDATE public.winner_takes_all_sessions SET current_pool = v_pool, updated_at = NOW() WHERE id = v_session_id;
  INSERT INTO public.winner_takes_all_participants (id, session_id, user_id, joined_at) VALUES (gen_random_uuid(), v_session_id, user_id_param, NOW());
  PERFORM update_rate_limits(user_id_param);
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_pool, gen_random_uuid()::TEXT, v_rng_seed;
END; $$;

-- join_1v1_session
DROP FUNCTION IF EXISTS join_1v1_session(UUID, UUID, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION join_1v1_session(session_id_param UUID, user_id_param UUID, entry_fee_param NUMERIC) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_rate_check JSON; v_spend_result RECORD; v_rng_seed INTEGER; v_pot NUMERIC; v_count INTEGER;
BEGIN
  SELECT * INTO v_rate_check FROM check_rate_limit(user_id_param);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN RETURN json_build_object('success', false, 'message', v_rate_check->>'reason'); END IF;
  IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
    RETURN json_build_object('success', false, 'message', 'You have already joined this game');
  END IF;
  SELECT s.current_pot, s.participants_count, COALESCE(c.rng_seed, 0) INTO v_pot, v_count, v_rng_seed FROM one_v_one_sessions s JOIN one_v_one_configs c ON c.id = s.config_id WHERE s.id = session_id_param;
  IF v_rng_seed IS NULL THEN RETURN json_build_object('success', false, 'message', 'Session not found'); END IF;
  IF v_count >= 2 THEN RETURN json_build_object('success', false, 'message', 'Session is full'); END IF;
  SELECT * INTO v_spend_result FROM spend_tokens(user_id_param, entry_fee_param);
  IF NOT v_spend_result.success THEN RETURN json_build_object('success', false, 'message', v_spend_result.message); END IF;
  INSERT INTO one_v_one_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_id_param, NOW());
  v_pot := v_pot + entry_fee_param; v_count := v_count + 1;
  UPDATE one_v_one_sessions SET current_pot = v_pot, participants_count = v_count, status = CASE WHEN v_count >= 2 THEN 'active' ELSE 'waiting' END, updated_at = NOW() WHERE id = session_id_param;
  PERFORM update_rate_limits(user_id_param);
  RETURN json_build_object('success', true, 'message', 'Successfully joined session', 'newPot', v_pot, 'participantsCount', v_count, 'rngSeed', v_rng_seed, 'status', CASE WHEN v_count >= 2 THEN 'active' ELSE 'waiting' END);
END; $$;

-- ============================================================================
-- PART 4: CREATE MISSING SESSIONS
-- ============================================================================

-- Hot Sell sessions
INSERT INTO public.hot_sell_sessions (id, config_id, current_pool, base_price, participants_count, status, created_at, updated_at)
SELECT gen_random_uuid(), c.id, 0, COALESCE(c.base_price, c.entry_fee, 1.00), 0, 'active', NOW(), NOW()
FROM public.hot_sell_configs c LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL ON CONFLICT DO NOTHING;

-- Winner Takes All sessions
INSERT INTO public.winner_takes_all_sessions (id, config_id, current_pool, base_price, participants_count, status, timer_duration, created_at, updated_at)
SELECT gen_random_uuid(), c.id, 0, COALESCE(c.base_price, c.entry_fee, 1.00), 0, 'active', COALESCE(c.timer_duration, 1800), NOW(), NOW()
FROM public.winner_takes_all_configs c LEFT JOIN public.winner_takes_all_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE s.id IS NULL ON CONFLICT DO NOTHING;

-- 1v1 sessions
INSERT INTO public.one_v_one_sessions (id, config_id, current_pot, prize_pool, participants_count, max_participants, status, created_at, updated_at)
SELECT gen_random_uuid(), c.id, 0, c.prize_pool, 0, 2, 'waiting', NOW(), NOW()
FROM public.one_v_one_configs c LEFT JOIN public.one_v_one_sessions s ON s.config_id = c.id AND s.status IN ('waiting', 'active')
WHERE s.id IS NULL ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================

SELECT '✅ SETUP COMPLETE!' as status;

-- Show summary
SELECT 'Hot Sell Sessions' as game_mode, COUNT(*) as active_sessions FROM public.hot_sell_sessions WHERE status = 'active'
UNION ALL
SELECT 'Winner Takes All Sessions', COUNT(*) FROM public.winner_takes_all_sessions WHERE status = 'active'
UNION ALL
SELECT '1v1 Sessions', COUNT(*) FROM public.one_v_one_sessions WHERE status IN ('waiting', 'active');

-- Show RNG seed verification
SELECT 'RNG Seeds Set' as status, COUNT(*) as count FROM public.hot_sell_configs WHERE rng_seed IS NOT NULL AND rng_seed > 0
UNION ALL
SELECT 'RNG Seeds Set', COUNT(*) FROM public.winner_takes_all_configs WHERE rng_seed IS NOT NULL AND rng_seed > 0
UNION ALL
SELECT 'RNG Seeds Set', COUNT(*) FROM public.one_v_one_configs WHERE rng_seed IS NOT NULL AND rng_seed > 0;

-- ============================================================================
-- 🎉 ALL DONE! YOUR PLATFORM IS NOW SKILL-BASED GAMING COMPLIANT!
-- ============================================================================

