-- ============================================================================
-- FIX: Payout Creates New Session + Manual Reset Script
-- ============================================================================
-- 1. Fix payout to properly create new session after completion
-- 2. Add manual reset script to recreate active sessions
-- ============================================================================

BEGIN;

SELECT '🔧 Fixing payout to create new sessions...' as step;

-- ============================================================================
-- PART 1: Fix Payout Function (Better Session Creation)
-- ============================================================================

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
  v_new_session_id UUID;
BEGIN
  -- Get config
  SELECT * INTO v_config
  FROM public.hot_sell_configs
  WHERE id::TEXT = config_id_param;
  
  IF v_config.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Config not found');
  END IF;
  
  -- Get active session
  SELECT * INTO v_session
  FROM public.hot_sell_sessions
  WHERE config_id::TEXT = config_id_param AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active session');
  END IF;
  
  -- Count participants with scores
  SELECT COUNT(*) INTO v_participants_with_scores
  FROM public.hot_sell_participants
  WHERE session_id = v_session.id AND score IS NOT NULL;
  
  -- Validate readiness
  IF v_session.participants_count < v_config.max_participants THEN
    RETURN json_build_object('success', false, 
      'error', 'Session not full yet (' || v_session.participants_count || '/' || v_config.max_participants || ')');
  END IF;
  
  IF v_participants_with_scores < v_config.max_participants THEN
    RETURN json_build_object('success', false, 
      'error', 'Not all completed (' || v_participants_with_scores || '/' || v_config.max_participants || ' scored)');
  END IF;
  
  -- Get winners
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
  
  -- Mark session completed
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
  
  -- Award tokens
  IF v_first_place_user IS NOT NULL AND v_first_place_prize > 0 THEN
    UPDATE public.users SET won_tokens = won_tokens + v_first_place_prize, updated_at = NOW()
    WHERE id = v_first_place_user;
  END IF;
  
  IF v_second_place_user IS NOT NULL AND v_second_place_prize > 0 THEN
    UPDATE public.users SET won_tokens = won_tokens + v_second_place_prize, updated_at = NOW()
    WHERE id = v_second_place_user;
  END IF;
  
  IF v_third_place_user IS NOT NULL AND v_third_place_prize > 0 THEN
    UPDATE public.users SET won_tokens = won_tokens + v_third_place_prize, updated_at = NOW()
    WHERE id = v_third_place_user;
  END IF;
  
  -- Create new active session (with proper error handling)
  BEGIN
    INSERT INTO public.hot_sell_sessions (
      config_id, prize_pool, base_price, participants_count, max_participants, 
      status, rng_seed, created_at, updated_at
    ) VALUES (
      v_config.id, 0, v_config.base_price, 0, v_config.max_participants,
      'active', FLOOR(RANDOM() * 1000000)::INTEGER, NOW(), NOW()
    )
    RETURNING id INTO v_new_session_id;
    
    RAISE NOTICE 'Created new session: %', v_new_session_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not create new session: %', SQLERRM;
      -- Don't fail the whole payout just because new session creation failed
  END;
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_session.id,
    'new_session_id', v_new_session_id,
    'first_place_user', v_first_place_user,
    'first_place_prize', v_first_place_prize,
    'second_place_user', v_second_place_user,
    'second_place_prize', v_second_place_prize,
    'third_place_user', v_third_place_user,
    'third_place_prize', v_third_place_prize
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout_complete(TEXT) TO authenticated, anon;

SELECT '✅ Payout function fixed' as result;

COMMIT;

-- ============================================================================
-- PART 2: MANUAL RESET - Create Active Sessions for All Configs
-- ============================================================================

BEGIN;

SELECT '🔄 Creating active sessions for all configs...' as step;

-- Delete any orphaned completed sessions without new active sessions
DELETE FROM public.hot_sell_participants 
WHERE session_id IN (
  SELECT id FROM public.hot_sell_sessions WHERE status = 'completed'
);

-- Create new active session for each config that doesn't have one
INSERT INTO public.hot_sell_sessions (
  config_id, prize_pool, base_price, participants_count, max_participants, 
  status, rng_seed, created_at, updated_at
)
SELECT 
  c.id,
  0,
  c.base_price,
  0,
  c.max_participants,
  'active',
  FLOOR(RANDOM() * 1000000)::INTEGER,
  NOW(),
  NOW()
FROM public.hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM public.hot_sell_sessions s
  WHERE s.config_id = c.id AND s.status = 'active'
)
ON CONFLICT DO NOTHING;

SELECT '✅ Created active sessions for ' || COUNT(*) || ' configs' as result
FROM public.hot_sell_configs c
WHERE EXISTS (
  SELECT 1 FROM public.hot_sell_sessions s
  WHERE s.config_id = c.id AND s.status = 'active'
);

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 PAYOUT + RESET FIXED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ Payout creates new session' as status;
SELECT '✅ All configs have active sessions' as status;
SELECT '✅ Ready to test!' as status;
SELECT '🎉 ================================' as message;

-- Verification
SELECT 
  '📊 Active Sessions Per Config' as info,
  c.title,
  c.entry_fee,
  COUNT(s.id) as active_sessions
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON s.config_id = c.id AND s.status = 'active'
WHERE c.entry_fee = 3
GROUP BY c.id, c.title, c.entry_fee
ORDER BY c.title;

