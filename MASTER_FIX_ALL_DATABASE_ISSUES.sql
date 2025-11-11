-- ============================================================================
-- MASTER FIX - Complete Database Setup for All Games
-- ============================================================================
-- This script creates/fixes EVERYTHING needed for all game modes
-- Run this ONCE in Supabase SQL Editor
-- ============================================================================

BEGIN;

SELECT '🚀 Starting Master Fix...' as status;

-- ============================================================================
-- PART 1: TABLES
-- ============================================================================

SELECT '📊 Creating/fixing tables...' as step;

-- game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  listing_id TEXT,
  entry_number INTEGER,
  rng_seed INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'invalid', 'expired')),
  client_score DECIMAL(10,2),
  server_score DECIMAL(10,2),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  input_count INTEGER,
  duration_ms INTEGER,
  suspicion_score INTEGER DEFAULT 0,
  invalid_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

-- user_rate_limits table
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  games_last_hour INTEGER DEFAULT 0,
  games_last_day INTEGER DEFAULT 0,
  last_game_at TIMESTAMPTZ,
  hourly_reset_at TIMESTAMPTZ DEFAULT NOW(),
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status) WHERE status = 'active';

SELECT '✅ Tables created/verified' as result;

-- ============================================================================
-- PART 2: HELPER FUNCTIONS
-- ============================================================================

SELECT '🔧 Creating helper functions...' as step;

-- check_rate_limit function
CREATE OR REPLACE FUNCTION check_rate_limit(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate_record RECORD;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.user_rate_limits (user_id, updated_at)
  VALUES (user_id_param, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO rate_record
  FROM public.user_rate_limits
  WHERE user_id = user_id_param;
  
  -- Check hourly limit (30 games/hour)
  IF rate_record.last_game_at IS NOT NULL AND 
     rate_record.last_game_at > NOW() - INTERVAL '1 hour' THEN
    IF rate_record.games_last_hour >= 30 THEN
      RETURN json_build_object(
        'allowed', false,
        'reason', 'Rate limit exceeded. Maximum 30 games per hour.'
      );
    END IF;
  END IF;
  
  -- Check daily limit (200 games/day)
  IF rate_record.daily_reset_at < NOW() - INTERVAL '24 hours' THEN
    UPDATE public.user_rate_limits
    SET games_last_day = 0, daily_reset_at = NOW()
    WHERE user_id = user_id_param;
  ELSIF rate_record.games_last_day >= 200 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Daily limit reached. Maximum 200 games per day.'
    );
  END IF;
  
  RETURN json_build_object('allowed', true, 'reason', '');
END;
$$;

-- update_rate_limits function
CREATE OR REPLACE FUNCTION update_rate_limits(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_rate_limits (user_id, updated_at)
  VALUES (user_id_param, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  UPDATE public.user_rate_limits
  SET 
    games_last_hour = CASE 
      WHEN last_game_at IS NULL OR last_game_at < NOW() - INTERVAL '1 hour' 
      THEN 1 
      ELSE games_last_hour + 1 
    END,
    games_last_day = games_last_day + 1,
    last_game_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$$;

-- spend_tokens function
CREATE OR REPLACE FUNCTION spend_tokens(user_id_param UUID, amount_param DECIMAL(10,2))
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchased DECIMAL(10,2);
  v_won DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Get user tokens
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO v_purchased, v_won
  FROM public.users
  WHERE id = user_id_param;
  
  v_total := v_purchased + v_won;
  
  IF v_total < amount_param THEN
    RETURN QUERY SELECT FALSE, 'Insufficient tokens'::TEXT;
    RETURN;
  END IF;
  
  -- Deduct from purchased first, then won
  IF v_purchased >= amount_param THEN
    UPDATE public.users 
    SET purchased_tokens = purchased_tokens - amount_param,
        updated_at = NOW()
    WHERE id = user_id_param;
  ELSE
    UPDATE public.users 
    SET purchased_tokens = 0,
        won_tokens = won_tokens - (amount_param - v_purchased),
        updated_at = NOW()
    WHERE id = user_id_param;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Tokens spent successfully'::TEXT;
END;
$$;

SELECT '✅ Helper functions created' as result;

-- ============================================================================
-- PART 3: HOT SELL FUNCTIONS
-- ============================================================================

SELECT '🔥 Creating Hot Sell functions...' as step;

-- hs_join_v2 function
DROP FUNCTION IF EXISTS hs_join_v2(TEXT, UUID, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION hs_join_v2(
  p_session TEXT,
  p_user UUID,
  p_fee DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_pot DECIMAL(10,2),
  rng_seed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_rate_check JSON;
  v_spend_result RECORD;
  v_pot DECIMAL(10,2);
  v_rng_seed INTEGER;
BEGIN
  -- Convert session ID
  BEGIN
    v_session_id := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END;
  
  -- Check rate limit
  SELECT * INTO v_rate_check FROM check_rate_limit(p_user);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN QUERY SELECT FALSE, (v_rate_check->>'reason')::TEXT, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END IF;
  
  -- Get session details
  SELECT 
    COALESCE(prize_pool, 0),
    COALESCE(c.rng_seed, 1)
  INTO v_pot, v_rng_seed
  FROM public.hot_sell_sessions s
  JOIN public.hot_sell_configs c ON c.id = s.config_id
  WHERE s.id = v_session_id AND s.status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found or inactive'::TEXT, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END IF;
  
  -- Check if already joined
  IF EXISTS(
    SELECT 1 FROM public.hot_sell_participants 
    WHERE session_id = v_session_id AND user_id = p_user
  ) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_pot, v_rng_seed;
    RETURN;
  END IF;
  
  -- Spend tokens
  SELECT * INTO v_spend_result FROM spend_tokens(p_user, p_fee);
  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END IF;
  
  -- Update pot
  v_pot := v_pot + p_fee;
  UPDATE public.hot_sell_sessions 
  SET prize_pool = v_pot, participants_count = participants_count + 1, updated_at = NOW()
  WHERE id = v_session_id;
  
  -- Add participant
  INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at)
  VALUES (v_session_id, p_user, NOW());
  
  -- Update rate limits
  PERFORM update_rate_limits(p_user);
  
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_pot, v_rng_seed;
END;
$$;

GRANT EXECUTE ON FUNCTION hs_join_v2(TEXT, UUID, DECIMAL) TO authenticated, anon;

SELECT '✅ Hot Sell functions created' as result;

-- ============================================================================
-- PART 4: WINNER TAKES ALL FUNCTIONS
-- ============================================================================

SELECT '🏆 Creating Winner Takes All functions...' as step;

-- wta_join_v2 function
DROP FUNCTION IF EXISTS wta_join_v2(TEXT, UUID, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION wta_join_v2(
  p_session TEXT,
  p_user UUID,
  p_fee DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_pot DECIMAL(10,2),
  rng_seed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_rate_check JSON;
  v_spend_result RECORD;
  v_pot DECIMAL(10,2);
  v_rng_seed INTEGER;
BEGIN
  -- Convert session ID
  BEGIN
    v_session_id := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Invalid session ID'::TEXT, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END;
  
  -- Check rate limit
  SELECT * INTO v_rate_check FROM check_rate_limit(p_user);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN QUERY SELECT FALSE, (v_rate_check->>'reason')::TEXT, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END IF;
  
  -- Get session details
  SELECT 
    COALESCE(prize_pool, 0),
    COALESCE(c.rng_seed, 1)
  INTO v_pot, v_rng_seed
  FROM public.winner_takes_all_sessions s
  JOIN public.winner_takes_all_configs c ON c.id = s.config_id
  WHERE s.id = v_session_id AND s.status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found or inactive'::TEXT, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END IF;
  
  -- Check if already joined
  IF EXISTS(
    SELECT 1 FROM public.winner_takes_all_participants 
    WHERE session_id = v_session_id AND user_id = p_user
  ) THEN
    RETURN QUERY SELECT FALSE, 'Already joined'::TEXT, v_pot, v_rng_seed;
    RETURN;
  END IF;
  
  -- Spend tokens
  SELECT * INTO v_spend_result FROM spend_tokens(p_user, p_fee);
  IF NOT v_spend_result.success THEN
    RETURN QUERY SELECT FALSE, v_spend_result.message, 0::DECIMAL(10,2), 0::INTEGER;
    RETURN;
  END IF;
  
  -- Update pot
  v_pot := v_pot + p_fee;
  UPDATE public.winner_takes_all_sessions 
  SET prize_pool = v_pot, participants_count = participants_count + 1, updated_at = NOW()
  WHERE id = v_session_id;
  
  -- Add participant
  INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at)
  VALUES (v_session_id, p_user, NOW());
  
  -- Update rate limits
  PERFORM update_rate_limits(p_user);
  
  RETURN QUERY SELECT TRUE, 'Successfully joined'::TEXT, v_pot, v_rng_seed;
END;
$$;

GRANT EXECUTE ON FUNCTION wta_join_v2(TEXT, UUID, DECIMAL) TO authenticated, anon;

SELECT '✅ Winner Takes All functions created' as result;

-- ============================================================================
-- PART 5: 1V1 FUNCTIONS  
-- ============================================================================

SELECT '⚔️ Creating 1v1 functions...' as step;

-- update_1v1_score function
DROP FUNCTION IF EXISTS update_1v1_score(TEXT, UUID, DECIMAL, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION update_1v1_score(
  session_id_param TEXT,
  user_id_param UUID,
  score_param DECIMAL(10,2),
  accuracy_param DECIMAL(5,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_updated_rows INTEGER;
BEGIN
  -- Convert session ID
  BEGIN
    v_session_id := session_id_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Invalid session ID');
  END;
  
  -- Update participant score
  UPDATE public.one_v_one_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE session_id = v_session_id 
    AND user_id = user_id_param
    AND completed_at IS NULL;
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  
  IF v_updated_rows = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Participant not found or already completed');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Score updated');
END;
$$;

GRANT EXECUTE ON FUNCTION update_1v1_score(TEXT, UUID, DECIMAL, DECIMAL) TO authenticated, anon;

SELECT '✅ 1v1 functions created' as result;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

SELECT '🔒 Setting up Row Level Security...' as step;

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for game_sessions
DROP POLICY IF EXISTS "Users can view own game sessions" ON public.game_sessions;
CREATE POLICY "Users can view own game sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create game sessions" ON public.game_sessions;
CREATE POLICY "Users can create game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own game sessions" ON public.game_sessions;
CREATE POLICY "Users can update own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for user_rate_limits
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.user_rate_limits;
CREATE POLICY "Users can view own rate limits"
  ON public.user_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rate limits" ON public.user_rate_limits;
CREATE POLICY "Users can update own rate limits"
  ON public.user_rate_limits FOR ALL
  USING (auth.uid() = user_id);

SELECT '✅ RLS policies created' as result;

-- ============================================================================
-- PART 7: VERIFICATION
-- ============================================================================

SELECT '📋 Verifying setup...' as step;

-- Check tables exist
DO $$
DECLARE
  v_game_sessions_exists BOOLEAN;
  v_rate_limits_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'game_sessions'
  ) INTO v_game_sessions_exists;
  
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_rate_limits'
  ) INTO v_rate_limits_exists;
  
  IF v_game_sessions_exists THEN
    RAISE NOTICE '✅ game_sessions table exists';
  ELSE
    RAISE EXCEPTION '❌ game_sessions table missing';
  END IF;
  
  IF v_rate_limits_exists THEN
    RAISE NOTICE '✅ user_rate_limits table exists';
  ELSE
    RAISE EXCEPTION '❌ user_rate_limits table missing';
  END IF;
END $$;

-- Check functions exist
DO $$
DECLARE
  v_functions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'check_rate_limit',
      'update_rate_limits',
      'spend_tokens',
      'hs_join_v2',
      'wta_join_v2',
      'update_1v1_score'
    );
  
  RAISE NOTICE '✅ Found % functions', v_functions_count;
  
  IF v_functions_count < 6 THEN
    RAISE WARNING '⚠️ Expected 6 functions, found %', v_functions_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '🎉 ================================' as message;
SELECT '🎉 MASTER FIX COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ All tables created' as status;
SELECT '✅ All functions created' as status;
SELECT '✅ All policies set' as status;
SELECT '✅ Database ready!' as status;
SELECT '🎉 ================================' as message;

-- Show summary
SELECT 
  '📊 Summary' as info,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('game_sessions', 'user_rate_limits')) as tables_created,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN ('hs_join_v2', 'wta_join_v2', 'check_rate_limit', 'update_rate_limits', 'spend_tokens', 'update_1v1_score')) as functions_created;

