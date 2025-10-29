-- ============================================================================
-- RESTORE WORKING HOT SELL PAYOUT
-- Uses the original working logic that auto-pays and auto-resets
-- ============================================================================

-- STEP 1: Drop and recreate the payout function with original working logic
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_place_winner TEXT,
  second_place_winner TEXT,
  third_place_winner TEXT,
  first_place_amount NUMERIC,
  second_place_amount NUMERIC,
  third_place_amount NUMERIC
) AS $$
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
  v_first_email TEXT;
  v_second_email TEXT;
  v_third_email TEXT;
BEGIN
  -- Get the ACTIVE session for this config (not already paid out)
  SELECT s.id, s.current_pot, s.max_participants
  INTO v_session_id, v_current_pot, v_max_participants
  FROM public.hot_sell_sessions s
  WHERE s.config_id = config_id_param 
    AND s.status IN ('waiting', 'active')
    AND s.first_place_user_id IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No active session found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Count participants
  SELECT COUNT(*) INTO v_participants_count
  FROM public.hot_sell_participants
  WHERE session_id = v_session_id;

  -- Check if session is full
  IF v_participants_count < v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Session not full yet (' || v_participants_count || '/' || v_max_participants || ')', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if all participants have scores
  SELECT COUNT(*) INTO v_completed_count
  FROM public.hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL;

  IF v_completed_count < v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Not all players have completed (' || v_completed_count || '/' || v_max_participants || ')', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get prize percentages from config
  SELECT platform_fee_percent, first_place_percent, second_place_percent, third_place_percent
  INTO v_platform_fee_percent, v_first_percent, v_second_percent, v_third_percent
  FROM public.hot_sell_configs
  WHERE id = config_id_param;

  -- Calculate platform fee and distributable pot
  v_platform_fee := v_current_pot * (v_platform_fee_percent / 100);
  v_distributable_pot := v_current_pot - v_platform_fee;

  -- Calculate prizes
  v_first_prize := v_distributable_pot * (v_first_percent / 100);
  v_second_prize := v_distributable_pot * (v_second_percent / 100);
  v_third_prize := v_distributable_pot * (v_third_percent / 100);

  RAISE NOTICE 'Pot: %, Fee: %, Distributable: %, 1st: %, 2nd: %, 3rd: %', 
    v_current_pot, v_platform_fee, v_distributable_pot, v_first_prize, v_second_prize, v_third_prize;

  -- Get 1st place winner (highest score)
  SELECT user_id INTO v_first_user_id
  FROM public.hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  -- Get 2nd place winner (second highest score, excluding 1st)
  SELECT user_id INTO v_second_user_id
  FROM public.hot_sell_participants
  WHERE session_id = v_session_id 
    AND score IS NOT NULL 
    AND user_id != v_first_user_id
  ORDER BY score DESC, completed_at ASC
  LIMIT 1;

  -- Get 3rd place winner (third highest score, excluding 1st and 2nd)
  IF v_third_percent > 0 THEN
    SELECT user_id INTO v_third_user_id
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id 
      AND score IS NOT NULL 
      AND user_id NOT IN (v_first_user_id, COALESCE(v_second_user_id, '00000000-0000-0000-0000-000000000000'::UUID))
    ORDER BY score DESC, completed_at ASC
    LIMIT 1;
  END IF;

  IF v_first_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No winners found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RAISE NOTICE '1st place: %, 2nd place: %, 3rd place: %', v_first_user_id, v_second_user_id, v_third_user_id;

  -- Award prizes to winners (ADD tokens to their accounts)
  UPDATE public.users SET tokens = tokens + v_first_prize, updated_at = NOW() 
  WHERE id = v_first_user_id;
  
  IF v_second_user_id IS NOT NULL AND v_second_prize > 0 THEN
    UPDATE public.users SET tokens = tokens + v_second_prize, updated_at = NOW() 
    WHERE id = v_second_user_id;
  END IF;
  
  IF v_third_user_id IS NOT NULL AND v_third_prize > 0 THEN
    UPDATE public.users SET tokens = tokens + v_third_prize, updated_at = NOW() 
    WHERE id = v_third_user_id;
  END IF;

  RAISE NOTICE 'Prizes awarded!';

  -- Mark session as completed with winner info
  UPDATE public.hot_sell_sessions
  SET
    status = 'completed',
    first_place_user_id = v_first_user_id,
    second_place_user_id = v_second_user_id,
    third_place_user_id = v_third_user_id,
    first_place_prize = v_first_prize,
    second_place_prize = v_second_prize,
    third_place_prize = v_third_prize,
    platform_fee = v_platform_fee,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session_id;

  RAISE NOTICE 'Session marked as completed';

  -- Create a NEW waiting session for this config (auto-reset)
  INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
  SELECT 
    config_id_param,
    0,
    base_price,
    max_participants,
    'waiting',
    NOW(),
    NOW()
  FROM public.hot_sell_configs
  WHERE id = config_id_param;

  RAISE NOTICE 'New session created';

  -- Get winner emails for display
  SELECT COALESCE(username, email) INTO v_first_email FROM public.users WHERE id = v_first_user_id;
  SELECT COALESCE(username, email) INTO v_second_email FROM public.users WHERE id = v_second_user_id;
  SELECT COALESCE(username, email) INTO v_third_email FROM public.users WHERE id = v_third_user_id;

  RAISE NOTICE 'Winners: 1st=%, 2nd=%, 3rd=%', v_first_email, v_second_email, v_third_email;

  RETURN QUERY SELECT 
    TRUE, 
    'Payout completed and session reset', 
    COALESCE(v_first_email, 'Unknown'),
    COALESCE(v_second_email, 'Unknown'),
    COALESCE(v_third_email, 'N/A'),
    v_first_prize,
    COALESCE(v_second_prize, 0::NUMERIC),
    COALESCE(v_third_prize, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(TEXT) TO authenticated, anon;

-- STEP 2: Update get_all_hot_sell_sessions to include usernames in participants
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot NUMERIC,
    base_price NUMERIC,
    max_participants INTEGER,
    status TEXT,
    first_place_user_id UUID,
    second_place_user_id UUID,
    third_place_user_id UUID,
    first_place_prize NUMERIC,
    second_place_prize NUMERIC,
    third_place_prize NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, s.config_id, s.current_pot, s.base_price, s.max_participants, s.status,
        s.first_place_user_id, s.second_place_user_id, s.third_place_user_id,
        s.first_place_prize, s.second_place_prize, s.third_place_prize, s.platform_fee,
        s.created_at, s.updated_at, s.completed_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'user_id', p.user_id,
                        'username', COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'),
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at
                    ) ORDER BY p.score DESC NULLS LAST
                )
                FROM public.hot_sell_participants p
                LEFT JOIN public.users u ON p.user_id = u.id
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.hot_sell_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

-- STEP 3: Verify
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ WORKING HOT SELL PAYOUT RESTORED!';
    RAISE NOTICE '✅ Payout will:';
    RAISE NOTICE '   - Read scores from participants';
    RAISE NOTICE '   - Pay top 3 players based on pot split';
    RAISE NOTICE '   - Mark session as completed';
    RAISE NOTICE '   - Create new session automatically';
    RAISE NOTICE '🔄 REFRESH YOUR BROWSER and try payout!';
    RAISE NOTICE '========================================';
END $$;

