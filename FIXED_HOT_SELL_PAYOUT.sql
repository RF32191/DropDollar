-- ============================================================================
-- COMPLETE HOT SELL PAYOUT FIX
-- Fix payout to actually transfer tokens to winners
-- ============================================================================

-- Clear and reset all sessions
DELETE FROM public.hot_sell_participants;
DELETE FROM public.hot_sell_sessions;

INSERT INTO public.hot_sell_sessions (
    config_id,
    current_pot,
    base_price,
    max_participants,
    status,
    created_at,
    updated_at
)
SELECT 
    id,
    0,
    base_price,
    max_participants,
    'waiting',
    NOW(),
    NOW()
FROM public.hot_sell_configs
ORDER BY base_price;

-- Recreate the payout function with proper token transfer
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_current_pot NUMERIC;
  v_max_participants INTEGER;
  v_participants_count INTEGER;
  v_completed_count INTEGER;
  v_platform_fee_percent NUMERIC;
  v_first_percent NUMERIC;
  v_second_percent NUMERIC;
  v_third_percent NUMERIC;
  v_platform_fee NUMERIC;
  v_distributable_pot NUMERIC;
  v_first_prize NUMERIC;
  v_second_prize NUMERIC;
  v_third_prize NUMERIC;
  v_first_user_id UUID;
  v_second_user_id UUID;
  v_third_user_id UUID;
  v_first_username TEXT;
  v_second_username TEXT;
  v_third_username TEXT;
  v_first_score NUMERIC;
  v_second_score NUMERIC;
  v_third_score NUMERIC;
  v_new_session_id UUID;
  v_first_old_balance NUMERIC;
  v_first_new_balance NUMERIC;
  v_second_old_balance NUMERIC;
  v_second_new_balance NUMERIC;
  v_third_old_balance NUMERIC;
  v_third_new_balance NUMERIC;
BEGIN
  RAISE NOTICE '🔍 Starting payout for config: %', config_id_param;

  -- Get the ACTIVE session
  SELECT s.id, s.current_pot, s.max_participants
  INTO v_session_id, v_current_pot, v_max_participants
  FROM public.hot_sell_sessions s
  WHERE s.config_id = config_id_param 
    AND s.status IN ('waiting', 'active')
    AND s.first_place_user_id IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE NOTICE '❌ No active session found';
    RETURN json_build_object('success', false, 'message', 'No active session found or already paid out');
  END IF;

  -- Count participants
  SELECT COUNT(*) INTO v_participants_count FROM public.hot_sell_participants WHERE session_id = v_session_id;
  RAISE NOTICE '📊 Participants: %/%', v_participants_count, v_max_participants;

  IF v_participants_count < v_max_participants THEN
    RETURN json_build_object('success', false, 'message', 'Session not full yet');
  END IF;

  -- Check scores
  SELECT COUNT(*) INTO v_completed_count FROM public.hot_sell_participants WHERE session_id = v_session_id AND score IS NOT NULL;
  RAISE NOTICE '✅ Completed: %/%', v_completed_count, v_max_participants;

  IF v_completed_count < v_max_participants THEN
    RETURN json_build_object('success', false, 'message', 'Not all players have completed');
  END IF;

  -- Get config
  SELECT platform_fee_percent, first_place_percent, second_place_percent, third_place_percent
  INTO v_platform_fee_percent, v_first_percent, v_second_percent, v_third_percent
  FROM public.hot_sell_configs WHERE id = config_id_param;

  -- Calculate prizes
  v_platform_fee := v_current_pot * (v_platform_fee_percent / 100);
  v_distributable_pot := v_current_pot - v_platform_fee;
  v_first_prize := v_distributable_pot * (v_first_percent / 100);
  v_second_prize := v_distributable_pot * (v_second_percent / 100);
  v_third_prize := v_distributable_pot * (v_third_percent / 100);

  RAISE NOTICE '💰 Pot: %, Fee: %, Prizes: %, %, %', v_current_pot, v_platform_fee, v_first_prize, v_second_prize, v_third_prize;

  -- Get winners with usernames
  SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
  INTO v_first_user_id, v_first_username, v_first_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
  INTO v_second_user_id, v_second_username, v_second_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL AND p.user_id != v_first_user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  IF v_third_percent > 0 THEN
    SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
    INTO v_third_user_id, v_third_username, v_third_score
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL 
      AND p.user_id NOT IN (v_first_user_id, COALESCE(v_second_user_id, '00000000-0000-0000-0000-000000000000'::UUID))
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
  END IF;

  IF v_first_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No winners found');
  END IF;

  RAISE NOTICE '🥇 1st: % (Score: %)', v_first_username, v_first_score;
  RAISE NOTICE '🥈 2nd: % (Score: %)', v_second_username, v_second_score;
  RAISE NOTICE '🥉 3rd: % (Score: %)', v_third_username, v_third_score;

  -- AWARD PRIZES WITH VERIFICATION
  -- 1st Place
  SELECT tokens INTO v_first_old_balance FROM public.users WHERE id = v_first_user_id;
  UPDATE public.users SET tokens = tokens + v_first_prize, updated_at = NOW() WHERE id = v_first_user_id;
  SELECT tokens INTO v_first_new_balance FROM public.users WHERE id = v_first_user_id;
  RAISE NOTICE '💸 1st: % tokens: % -> % (added %)', v_first_username, v_first_old_balance, v_first_new_balance, v_first_prize;

  -- 2nd Place
  IF v_second_user_id IS NOT NULL AND v_second_prize > 0 THEN
    SELECT tokens INTO v_second_old_balance FROM public.users WHERE id = v_second_user_id;
    UPDATE public.users SET tokens = tokens + v_second_prize, updated_at = NOW() WHERE id = v_second_user_id;
    SELECT tokens INTO v_second_new_balance FROM public.users WHERE id = v_second_user_id;
    RAISE NOTICE '💸 2nd: % tokens: % -> % (added %)', v_second_username, v_second_old_balance, v_second_new_balance, v_second_prize;
  END IF;

  -- 3rd Place
  IF v_third_user_id IS NOT NULL AND v_third_prize > 0 THEN
    SELECT tokens INTO v_third_old_balance FROM public.users WHERE id = v_third_user_id;
    UPDATE public.users SET tokens = tokens + v_third_prize, updated_at = NOW() WHERE id = v_third_user_id;
    SELECT tokens INTO v_third_new_balance FROM public.users WHERE id = v_third_user_id;
    RAISE NOTICE '💸 3rd: % tokens: % -> % (added %)', v_third_username, v_third_old_balance, v_third_new_balance, v_third_prize;
  END IF;

  -- Mark session completed
  UPDATE public.hot_sell_sessions
  SET status = 'completed', first_place_user_id = v_first_user_id, second_place_user_id = v_second_user_id,
      third_place_user_id = v_third_user_id, first_place_prize = v_first_prize, second_place_prize = v_second_prize,
      third_place_prize = v_third_prize, platform_fee = v_platform_fee, completed_at = NOW(), updated_at = NOW()
  WHERE id = v_session_id;

  RAISE NOTICE '✅ Session marked completed';

  -- Create new session
  INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
  SELECT config_id_param, 0, base_price, max_participants, 'waiting', NOW(), NOW()
  FROM public.hot_sell_configs WHERE id = config_id_param
  RETURNING id INTO v_new_session_id;

  RAISE NOTICE '🔄 New session created: %', v_new_session_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PAYOUT COMPLETE!';
  RAISE NOTICE '🎉 Winners: %, %, %', v_first_username, COALESCE(v_second_username, 'N/A'), COALESCE(v_third_username, 'N/A');
  RAISE NOTICE '💰 Prizes: %, %, %', v_first_prize, COALESCE(v_second_prize, 0), COALESCE(v_third_prize, 0);
  RAISE NOTICE '========================================';

  RETURN json_build_object(
    'success', true,
    'message', 'Payout completed successfully',
    'first_place_winner', v_first_username,
    'first_place_amount', v_first_prize,
    'second_place_winner', COALESCE(v_second_username, 'N/A'),
    'second_place_amount', COALESCE(v_second_prize, 0),
    'third_place_winner', COALESCE(v_third_username, 'N/A'),
    'third_place_amount', COALESCE(v_third_prize, 0),
    'new_session_id', v_new_session_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(TEXT) TO authenticated, anon;

-- Verification message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Hot Sell payout function recreated!';
    RAISE NOTICE '✅ Now includes token verification logging';
    RAISE NOTICE '✅ All sessions reset and ready';
    RAISE NOTICE '========================================';
END $$;

