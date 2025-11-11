-- ============================================================================
-- ULTIMATE FIX: Payout Logic + Game Loading + RNG Seeds + Reset
-- ============================================================================
-- 1. Fix payout to check if ALL participants have scores
-- 2. Create game_sessions table (required for games to start)
-- 3. Fix RNG seeds on ALL configs and sessions
-- 4. Reset all listings
-- ============================================================================

BEGIN;

SELECT '🔧 ================================' as message;
SELECT '🔧 ULTIMATE FIX' as message;
SELECT '🔧 ================================' as message;

-- ============================================================================
-- PART 1: Create game_sessions Table (REQUIRED for games to start)
-- ============================================================================

SELECT '🎮 PART 1: Creating game_sessions table...' as step;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  listing_id TEXT,
  entry_number INTEGER,
  rng_seed INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  score NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_listing_id ON public.game_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can insert their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update their own game sessions" ON public.game_sessions;

CREATE POLICY "Users can view their own game sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

SELECT '✅ game_sessions table created' as result;

-- ============================================================================
-- PART 2: Fix Payout Function (Better Logic)
-- ============================================================================

SELECT '💰 PART 2: Fixing payout function with better logic...' as step;

DROP FUNCTION IF EXISTS public.process_hot_sell_payout_complete(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout_complete(
  config_id_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_config RECORD;
  v_first_place_user UUID;
  v_second_place_user UUID;
  v_third_place_user UUID;
  v_first_place_prize NUMERIC;
  v_second_place_prize NUMERIC;
  v_third_place_prize NUMERIC;
  v_platform_fee NUMERIC;
  v_participants_with_scores INTEGER;
BEGIN
  -- Get config details
  SELECT * INTO v_config
  FROM public.hot_sell_configs
  WHERE id::TEXT = config_id_param;
  
  IF v_config.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Config not found: ' || config_id_param
    );
  END IF;
  
  -- Get the active session for this config
  SELECT * INTO v_session
  FROM public.hot_sell_sessions
  WHERE config_id::TEXT = config_id_param
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active session found'
    );
  END IF;
  
  -- Count how many participants have completed (have scores)
  SELECT COUNT(*) INTO v_participants_with_scores
  FROM public.hot_sell_participants
  WHERE session_id = v_session.id
    AND score IS NOT NULL;
  
  -- Check if we have enough participants AND all have scores
  IF v_session.participants_count < v_config.max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not full yet (' || v_session.participants_count || '/' || v_config.max_participants || ')'
    );
  END IF;
  
  IF v_participants_with_scores < v_config.max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not all participants have completed (' || v_participants_with_scores || '/' || v_config.max_participants || ' scored)'
    );
  END IF;
  
  -- Get top 3 users by score
  SELECT user_id INTO v_first_place_user
  FROM public.hot_sell_participants
  WHERE session_id = v_session.id AND score IS NOT NULL
  ORDER BY score DESC LIMIT 1;
  
  SELECT user_id INTO v_second_place_user
  FROM public.hot_sell_participants
  WHERE session_id = v_session.id AND score IS NOT NULL
  ORDER BY score DESC LIMIT 1 OFFSET 1;
  
  SELECT user_id INTO v_third_place_user
  FROM public.hot_sell_participants
  WHERE session_id = v_session.id AND score IS NOT NULL
  ORDER BY score DESC LIMIT 1 OFFSET 2;
  
  -- Calculate prizes
  v_first_place_prize := v_session.prize_pool * (v_config.first_place_percent / 100.0);
  v_second_place_prize := v_session.prize_pool * (v_config.second_place_percent / 100.0);
  v_third_place_prize := v_session.prize_pool * (v_config.third_place_percent / 100.0);
  v_platform_fee := v_session.prize_pool * (v_config.platform_fee_percent / 100.0);
  
  -- Update session with winners
  UPDATE public.hot_sell_sessions
  SET
    status = 'completed',
    first_place_user_id = v_first_place_user,
    second_place_user_id = v_second_place_user,
    third_place_user_id = v_third_place_user,
    first_place_prize = v_first_place_prize,
    second_place_prize = v_second_place_prize,
    third_place_prize = v_third_place_prize,
    platform_fee = v_platform_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session.id;
  
  -- Award cashable tokens to winners
  IF v_first_place_user IS NOT NULL AND v_first_place_prize > 0 THEN
    UPDATE public.users
    SET won_tokens = won_tokens + v_first_place_prize,
        updated_at = NOW()
    WHERE id = v_first_place_user;
  END IF;
  
  IF v_second_place_user IS NOT NULL AND v_second_place_prize > 0 THEN
    UPDATE public.users
    SET won_tokens = won_tokens + v_second_place_prize,
        updated_at = NOW()
    WHERE id = v_second_place_user;
  END IF;
  
  IF v_third_place_user IS NOT NULL AND v_third_place_prize > 0 THEN
    UPDATE public.users
    SET won_tokens = won_tokens + v_third_place_prize,
        updated_at = NOW()
    WHERE id = v_third_place_user;
  END IF;
  
  -- Create new active session
  INSERT INTO public.hot_sell_sessions (
    config_id, prize_pool, base_price, participants_count, max_participants, 
    status, rng_seed, created_at, updated_at
  ) VALUES (
    v_config.id, 0, v_config.base_price, 0, v_config.max_participants,
    'active', FLOOR(RANDOM() * 1000000)::INTEGER, NOW(), NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_session.id,
    'first_place_user', v_first_place_user,
    'first_place_prize', v_first_place_prize,
    'second_place_user', v_second_place_user,
    'second_place_prize', v_second_place_prize,
    'third_place_user', v_third_place_user,
    'third_place_prize', v_third_place_prize,
    'platform_fee', v_platform_fee
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon;

SELECT '✅ Payout function fixed' as result;

-- ============================================================================
-- PART 3: Fix ALL RNG Seeds
-- ============================================================================

SELECT '🎲 PART 3: Fixing ALL RNG seeds...' as step;

-- Fix configs
UPDATE public.hot_sell_configs
SET rng_seed = FLOOR(RANDOM() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

-- Fix sessions
UPDATE public.hot_sell_sessions
SET rng_seed = FLOOR(RANDOM() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

SELECT '✅ All RNG seeds fixed' as result;

-- ============================================================================
-- PART 4: Reset All Listings
-- ============================================================================

SELECT '🔄 PART 4: Resetting all listings...' as step;

DELETE FROM public.hot_sell_participants;

UPDATE public.hot_sell_sessions
SET 
  prize_pool = 0,
  participants_count = 0,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = NULL,
  second_place_prize = NULL,
  third_place_prize = NULL,
  platform_fee = NULL,
  completed_at = NULL,
  status = 'active',
  updated_at = NOW()
WHERE TRUE;

SELECT '✅ All listings reset' as result;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 ULTIMATE FIX COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ game_sessions table created' as status;
SELECT '✅ Payout checks ALL scores' as status;
SELECT '✅ All RNG seeds fixed' as status;
SELECT '✅ All listings reset' as status;
SELECT '✅ Games should start now!' as status;
SELECT '🎉 ================================' as message;

-- Verification
SELECT 
  '📊 game_sessions table' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_sessions')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT 
  '📊 Configs with RNG' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN rng_seed > 0 THEN 1 END) as with_rng
FROM public.hot_sell_configs;

SELECT 
  '📊 Sessions with RNG' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN rng_seed > 0 THEN 1 END) as with_rng
FROM public.hot_sell_sessions;

SELECT 
  '📊 Active Sessions' as info,
  COUNT(*) as count
FROM public.hot_sell_sessions
WHERE status = 'active';

