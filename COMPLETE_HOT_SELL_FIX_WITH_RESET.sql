-- ============================================================================
-- COMPLETE HOT SELL FIX WITH RESET
-- 1. Reset all listings
-- 2. Fix scoreboard to show usernames
-- 3. Ensure proper payout
-- ============================================================================

-- STEP 1: Clear all existing Hot Sell sessions and participants
DELETE FROM public.hot_sell_participants;
DELETE FROM public.hot_sell_sessions;

-- STEP 2: Recreate fresh sessions for all configs
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

-- STEP 3: Update get_all_hot_sell_sessions to include usernames
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
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
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

-- STEP 4: Fix payout function to use usernames and pay properly
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
  v_first_username TEXT;
  v_second_username TEXT;
  v_third_username TEXT;
  v_first_score NUMERIC;
  v_second_score NUMERIC;
  v_third_score NUMERIC;
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

  RAISE NOTICE '📊 Session %, Participants: %/%', v_session_id, v_participants_count, v_max_participants;

  -- Check if session is full
  IF v_participants_count < v_max_participants THEN
    RETURN QUERY SELECT FALSE, 'Session not full yet (' || v_participants_count || '/' || v_max_participants || ')', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if all participants have scores
  SELECT COUNT(*) INTO v_completed_count
  FROM public.hot_sell_participants
  WHERE session_id = v_session_id AND score IS NOT NULL;

  RAISE NOTICE '✅ Completed: %/%', v_completed_count, v_max_participants;

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

  RAISE NOTICE '💰 Pot: %, Fee: %, Distributable: %', v_current_pot, v_platform_fee, v_distributable_pot;
  RAISE NOTICE '🏆 Prizes - 1st: %, 2nd: %, 3rd: %', v_first_prize, v_second_prize, v_third_prize;

  -- Get 1st place winner (highest score) with username
  SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
  INTO v_first_user_id, v_first_username, v_first_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_id AND p.score IS NOT NULL
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  -- Get 2nd place winner (second highest score, excluding 1st) with username
  SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
  INTO v_second_user_id, v_second_username, v_second_score
  FROM public.hot_sell_participants p
  LEFT JOIN public.users u ON p.user_id = u.id
  WHERE p.session_id = v_session_id 
    AND p.score IS NOT NULL 
    AND p.user_id != v_first_user_id
  ORDER BY p.score DESC, p.completed_at ASC
  LIMIT 1;

  -- Get 3rd place winner (third highest score, excluding 1st and 2nd) with username
  IF v_third_percent > 0 THEN
    SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
    INTO v_third_user_id, v_third_username, v_third_score
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id 
      AND p.score IS NOT NULL 
      AND p.user_id NOT IN (v_first_user_id, COALESCE(v_second_user_id, '00000000-0000-0000-0000-000000000000'::UUID))
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
  END IF;

  IF v_first_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No winners found', ''::TEXT, ''::TEXT, ''::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RAISE NOTICE '🥇 1st: % (Score: %)', v_first_username, v_first_score;
  RAISE NOTICE '🥈 2nd: % (Score: %)', v_second_username, v_second_score;
  RAISE NOTICE '🥉 3rd: % (Score: %)', v_third_username, v_third_score;

  -- Award prizes to winners (ADD tokens to their accounts)
  UPDATE public.users SET tokens = tokens + v_first_prize, updated_at = NOW() 
  WHERE id = v_first_user_id;
  RAISE NOTICE '💸 Paid % to %', v_first_prize, v_first_username;
  
  IF v_second_user_id IS NOT NULL AND v_second_prize > 0 THEN
    UPDATE public.users SET tokens = tokens + v_second_prize, updated_at = NOW() 
    WHERE id = v_second_user_id;
    RAISE NOTICE '💸 Paid % to %', v_second_prize, v_second_username;
  END IF;
  
  IF v_third_user_id IS NOT NULL AND v_third_prize > 0 THEN
    UPDATE public.users SET tokens = tokens + v_third_prize, updated_at = NOW() 
    WHERE id = v_third_user_id;
    RAISE NOTICE '💸 Paid % to %', v_third_prize, v_third_username;
  END IF;

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

  RAISE NOTICE '✅ Session marked as completed';

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

  RAISE NOTICE '🔄 New session created';

  RETURN QUERY SELECT 
    TRUE, 
    'Payout completed! 🎉 Winners: ' || v_first_username || ', ' || COALESCE(v_second_username, 'N/A') || ', ' || COALESCE(v_third_username, 'N/A'), 
    v_first_username,
    COALESCE(v_second_username, 'N/A'),
    COALESCE(v_third_username, 'N/A'),
    v_first_prize,
    COALESCE(v_second_prize, 0::NUMERIC),
    COALESCE(v_third_prize, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(TEXT) TO authenticated, anon;

-- STEP 5: Verify the reset
DO $$
DECLARE
    session_count INTEGER;
    config_count INTEGER;
    participant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO session_count FROM public.hot_sell_sessions;
    SELECT COUNT(*) INTO config_count FROM public.hot_sell_configs;
    SELECT COUNT(*) INTO participant_count FROM public.hot_sell_participants;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOT SELL COMPLETE RESET!';
    RAISE NOTICE '📊 Configs: %', config_count;
    RAISE NOTICE '📊 New sessions: %', session_count;
    RAISE NOTICE '📊 Participants: %', participant_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Scoreboard now shows usernames!';
    RAISE NOTICE '✅ Payout uses usernames and pays correctly!';
    RAISE NOTICE '🔄 REFRESH YOUR BROWSER!';
    RAISE NOTICE '========================================';
END $$;

-- STEP 6: Show the new sessions
SELECT 
    config_id,
    current_pot,
    base_price,
    max_participants,
    status,
    created_at
FROM public.hot_sell_sessions
ORDER BY base_price
LIMIT 10;

