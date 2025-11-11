-- ============================================================================
-- FIX PAYOUT FUNCTION AND RESET LISTINGS
-- ============================================================================
-- 1. Creates process_hot_sell_payout_complete function
-- 2. Resets all listings for testing
-- ============================================================================

BEGIN;

SELECT '🔧 ================================' as message;
SELECT '🔧 FIX PAYOUT + RESET LISTINGS' as message;
SELECT '🔧 ================================' as message;

-- ============================================================================
-- PART 1: Create process_hot_sell_payout_complete Function
-- ============================================================================

SELECT '💰 PART 1: Creating payout function...' as step;

DROP FUNCTION IF EXISTS public.process_hot_sell_payout_complete(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout_complete(
  config_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_config RECORD;
  v_participants RECORD[];
  v_first_place_user UUID;
  v_second_place_user UUID;
  v_third_place_user UUID;
  v_first_place_prize NUMERIC;
  v_second_place_prize NUMERIC;
  v_third_place_prize NUMERIC;
  v_platform_fee NUMERIC;
BEGIN
  -- Get the active session for this config
  SELECT * INTO v_session
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active session found for this config'
    );
  END IF;
  
  -- Get config details
  SELECT * INTO v_config
  FROM public.hot_sell_configs
  WHERE id = config_id_param;
  
  -- Check if session is full and all have scores
  IF v_session.participants_count < v_config.max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not full yet'
    );
  END IF;
  
  -- Get top 3 participants by score
  SELECT 
    ARRAY_AGG(user_id ORDER BY score DESC) as user_ids
  INTO v_participants
  FROM public.hot_sell_participants
  WHERE session_id = v_session.id
    AND score IS NOT NULL
  LIMIT 3;
  
  -- Extract top 3 users
  v_first_place_user := v_participants[1];
  v_second_place_user := v_participants[2];
  v_third_place_user := v_participants[3];
  
  -- Calculate prizes
  v_first_place_prize := v_session.prize_pool * (v_config.first_place_percent / 100.0);
  v_second_place_prize := v_session.prize_pool * (v_config.second_place_percent / 100.0);
  v_third_place_prize := v_session.prize_pool * (v_config.third_place_percent / 100.0);
  v_platform_fee := v_session.prize_pool * (v_config.platform_fee_percent / 100.0);
  
  -- Update session with winners and prizes
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
  
  -- Award tokens to winners (add to won_tokens = cashable)
  IF v_first_place_user IS NOT NULL THEN
    UPDATE public.users
    SET won_tokens = won_tokens + v_first_place_prize,
        updated_at = NOW()
    WHERE id = v_first_place_user;
  END IF;
  
  IF v_second_place_user IS NOT NULL THEN
    UPDATE public.users
    SET won_tokens = won_tokens + v_second_place_prize,
        updated_at = NOW()
    WHERE id = v_second_place_user;
  END IF;
  
  IF v_third_place_user IS NOT NULL THEN
    UPDATE public.users
    SET won_tokens = won_tokens + v_third_place_prize,
        updated_at = NOW()
    WHERE id = v_third_place_user;
  END IF;
  
  -- Create a new active session for this config
  INSERT INTO public.hot_sell_sessions (
    config_id,
    prize_pool,
    base_price,
    participants_count,
    max_participants,
    status,
    rng_seed,
    created_at,
    updated_at
  ) VALUES (
    config_id_param,
    0,
    v_config.base_price,
    0,
    v_config.max_participants,
    'active',
    FLOOR(RANDOM() * 1000000)::INTEGER,
    NOW(),
    NOW()
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

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(UUID) TO authenticated, anon;

SELECT '✅ Payout function created' as result;

-- ============================================================================
-- PART 2: Reset All Listings for Testing
-- ============================================================================

SELECT '🔄 PART 2: Resetting all listings...' as step;

-- Delete all participants
DELETE FROM public.hot_sell_participants;

SELECT '✅ Cleared all participants' as result;

-- Reset all sessions
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

SELECT '✅ Reset all sessions to active' as result;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 PAYOUT FIXED + LISTINGS RESET!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ process_hot_sell_payout_complete created' as status;
SELECT '✅ All participants cleared' as status;
SELECT '✅ All sessions reset to $0' as status;
SELECT '✅ Ready to test payouts!' as status;
SELECT '🎉 ================================' as message;

-- Verification
SELECT 
  '📊 Active Sessions' as info,
  COUNT(*) as total_sessions,
  SUM(prize_pool) as total_prize_pool,
  SUM(participants_count) as total_participants
FROM public.hot_sell_sessions
WHERE status = 'active';

SELECT 
  '📊 Payout Function' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'process_hot_sell_payout_complete'
      AND routine_schema = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

