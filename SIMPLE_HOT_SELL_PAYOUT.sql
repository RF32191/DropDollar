-- ============================================================================
-- SIMPLE HOT SELL PAYOUT - Mimics Winner Takes All Pattern
-- ============================================================================
-- This is a complete replacement for the complex payout function
-- It works exactly like Winner Takes All but handles 3 winners

DROP FUNCTION IF EXISTS public.process_hot_sell_payout(TEXT);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  config_record RECORD;
  first_place_record RECORD;
  second_place_record RECORD;
  third_place_record RECORD;
  total_pot NUMERIC;
  platform_fee_amount NUMERIC;
  distributable_pot NUMERIC;
  first_prize NUMERIC;
  second_prize NUMERIC;
  third_prize NUMERIC;
BEGIN
  RAISE NOTICE '🔍 [Hot Sell Payout] Starting for config: %', config_id_param;

  -- Get the most recent session for this config
  SELECT * INTO session_record
  FROM public.hot_sell_sessions
  WHERE config_id = config_id_param
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No session found for config');
  END IF;

  RAISE NOTICE '📊 [Hot Sell Payout] Session ID: %, Status: %, Pot: %', 
    session_record.id, session_record.status, session_record.current_pot;

  -- Check if already paid out
  IF session_record.first_place_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Session already paid out',
      'already_paid', true
    );
  END IF;

  -- Get config for prize percentages
  SELECT * INTO config_record
  FROM public.hot_sell_configs
  WHERE id = config_id_param;

  -- Check if pot is valid
  total_pot := COALESCE(session_record.current_pot, 0);
  IF total_pot <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pot amount is 0');
  END IF;

  -- Calculate platform fee and distributable pot
  platform_fee_amount := total_pot * (config_record.platform_fee_percent / 100);
  distributable_pot := total_pot - platform_fee_amount;

  RAISE NOTICE '💰 [Hot Sell Payout] Total pot: %, Platform fee: %, Distributable: %', 
    total_pot, platform_fee_amount, distributable_pot;

  -- Find 1st place winner (highest score)
  SELECT p.*, u.email as username
  INTO first_place_record
  FROM public.hot_sell_participants p
  JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No participants with scores found'
    );
  END IF;

  -- Calculate 1st place prize
  first_prize := distributable_pot * (config_record.first_place_percent / 100);

  -- Pay 1st place
  UPDATE public.users
  SET tokens = COALESCE(tokens, 0) + first_prize,
      updated_at = NOW()
  WHERE id = first_place_record.user_id;

  RAISE NOTICE '🥇 [Hot Sell Payout] 1st place: % (score: %) won %', 
    first_place_record.username, first_place_record.score, first_prize;

  -- Find 2nd place winner (second highest score)
  SELECT p.*, u.email as username
  INTO second_place_record
  FROM public.hot_sell_participants p
  JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    AND p.user_id != first_place_record.user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  IF FOUND THEN
    second_prize := distributable_pot * (config_record.second_place_percent / 100);
    
    -- Pay 2nd place
    UPDATE public.users
    SET tokens = COALESCE(tokens, 0) + second_prize,
        updated_at = NOW()
    WHERE id = second_place_record.user_id;

    RAISE NOTICE '🥈 [Hot Sell Payout] 2nd place: % (score: %) won %', 
      second_place_record.username, second_place_record.score, second_prize;
  END IF;

  -- Find 3rd place winner (only if third_place_percent > 0)
  IF config_record.third_place_percent > 0 THEN
    SELECT p.*, u.email as username
    INTO third_place_record
    FROM public.hot_sell_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
      AND p.score IS NOT NULL
      AND p.user_id != first_place_record.user_id
      AND p.user_id != COALESCE(second_place_record.user_id, '00000000-0000-0000-0000-000000000000'::UUID)
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF FOUND THEN
      third_prize := distributable_pot * (config_record.third_place_percent / 100);
      
      -- Pay 3rd place
      UPDATE public.users
      SET tokens = COALESCE(tokens, 0) + third_prize,
          updated_at = NOW()
      WHERE id = third_place_record.user_id;

      RAISE NOTICE '🥉 [Hot Sell Payout] 3rd place: % (score: %) won %', 
        third_place_record.username, third_place_record.score, third_prize;
    END IF;
  END IF;

  -- Mark session as completed
  UPDATE public.hot_sell_sessions
  SET 
    status = 'completed',
    first_place_user_id = first_place_record.user_id,
    second_place_user_id = second_place_record.user_id,
    third_place_user_id = third_place_record.user_id,
    first_place_prize = first_prize,
    second_place_prize = COALESCE(second_prize, 0),
    third_place_prize = COALESCE(third_prize, 0),
    platform_fee = platform_fee_amount,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = session_record.id;

  -- Create NEW waiting session (auto-reset)
  INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
  SELECT 
    config_id_param,
    0,
    base_price,
    max_participants,
    'waiting'
  FROM public.hot_sell_configs
  WHERE id = config_id_param;

  RAISE NOTICE '✅ [Hot Sell Payout] Complete! New session created.';

  -- Return success with winner info
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payout successful',
    'first_place_winner', first_place_record.username,
    'first_place_amount', first_prize,
    'second_place_winner', COALESCE(second_place_record.username, 'N/A'),
    'second_place_amount', COALESCE(second_prize, 0),
    'third_place_winner', COALESCE(third_place_record.username, 'N/A'),
    'third_place_amount', COALESCE(third_prize, 0),
    'total_pot', total_pot,
    'platform_fee', platform_fee_amount
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Simple Hot Sell payout function created!';
  RAISE NOTICE '📝 Mimics Winner Takes All pattern';
  RAISE NOTICE '🏆 Handles 1st, 2nd, 3rd place dynamically';
  RAISE NOTICE '🔄 Auto-resets session after payout';
END $$;

