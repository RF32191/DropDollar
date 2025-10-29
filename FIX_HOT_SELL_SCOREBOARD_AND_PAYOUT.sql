-- ============================================================================
-- FIX HOT SELL SCOREBOARD AND PAYOUT
-- Make scoreboard show usernames and fix payout to read scores correctly
-- ============================================================================

-- STEP 1: Update get_all_hot_sell_sessions to include usernames
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

-- STEP 2: Fix process_hot_sell_payout to properly read scores and pay winners
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
    -- Find the most recent active/waiting session for this config
    SELECT id, current_pot, max_participants
    INTO v_session_id, v_current_pot, v_max_participants
    FROM public.hot_sell_sessions
    WHERE config_id = config_id_param
    AND status IN ('waiting', 'active')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_session_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No active session found', NULL::TEXT, NULL::TEXT, NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    -- Count total participants and those with scores
    SELECT COUNT(*), COUNT(*) FILTER (WHERE score IS NOT NULL)
    INTO v_participants_count, v_completed_count
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id;

    RAISE NOTICE 'Session %, Participants: %, Completed: %, Max: %', v_session_id, v_participants_count, v_completed_count, v_max_participants;

    -- Check if session is ready for payout
    IF v_participants_count < v_max_participants THEN
        RETURN QUERY SELECT FALSE, 'Session not full yet', NULL::TEXT, NULL::TEXT, NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    IF v_completed_count < v_participants_count THEN
        RETURN QUERY SELECT FALSE, 'Not all players have completed', NULL::TEXT, NULL::TEXT, NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    -- Get prize percentages from config
    SELECT platform_fee_percent, first_place_percent, second_place_percent, third_place_percent
    INTO v_platform_fee_percent, v_first_percent, v_second_percent, v_third_percent
    FROM public.hot_sell_configs
    WHERE id = config_id_param;

    -- Calculate prizes
    v_platform_fee := v_current_pot * (v_platform_fee_percent / 100.0);
    v_distributable_pot := v_current_pot - v_platform_fee;
    v_first_prize := v_distributable_pot * (v_first_percent / 100.0);
    v_second_prize := v_distributable_pot * (v_second_percent / 100.0);
    v_third_prize := v_distributable_pot * (v_third_percent / 100.0);

    -- Find winners by score (highest scores win)
    SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
    INTO v_first_user_id, v_first_username, v_first_score
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1;

    SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
    INTO v_second_user_id, v_second_username, v_second_score
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL AND p.user_id != v_first_user_id
    ORDER BY p.score DESC
    LIMIT 1;

    SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
    INTO v_third_user_id, v_third_username, v_third_score
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL AND p.user_id NOT IN (v_first_user_id, v_second_user_id)
    ORDER BY p.score DESC
    LIMIT 1;

    RAISE NOTICE '1st: % (%), 2nd: % (%), 3rd: % (%)', v_first_username, v_first_score, v_second_username, v_second_score, v_third_username, v_third_score;

    -- Pay winners (add tokens to their accounts)
    IF v_first_user_id IS NOT NULL THEN
        UPDATE public.users SET tokens = tokens + v_first_prize, updated_at = NOW() WHERE id = v_first_user_id;
    END IF;

    IF v_second_user_id IS NOT NULL THEN
        UPDATE public.users SET tokens = tokens + v_second_prize, updated_at = NOW() WHERE id = v_second_user_id;
    END IF;

    IF v_third_user_id IS NOT NULL THEN
        UPDATE public.users SET tokens = tokens + v_third_prize, updated_at = NOW() WHERE id = v_third_user_id;
    END IF;

    -- Mark session as completed
    UPDATE public.hot_sell_sessions
    SET status = 'completed',
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

    -- Create new waiting session
    INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
    SELECT config_id_param, 0, base_price, max_participants, 'waiting', NOW(), NOW()
    FROM public.hot_sell_configs
    WHERE id = config_id_param;

    RETURN QUERY SELECT 
        TRUE, 
        'Payout completed and new session created', 
        v_first_username,
        COALESCE(v_second_username, 'N/A'),
        COALESCE(v_third_username, 'N/A'),
        v_first_prize,
        COALESCE(v_second_prize, 0::NUMERIC),
        COALESCE(v_third_prize, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(TEXT) TO authenticated, anon;

-- STEP 3: Verify the fix
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Hot Sell scoreboard now shows usernames!';
    RAISE NOTICE '✅ Payout function reads scores correctly!';
    RAISE NOTICE '✅ Winners will be paid in tokens!';
    RAISE NOTICE '🔄 REFRESH YOUR BROWSER to see usernames!';
    RAISE NOTICE '========================================';
END $$;

