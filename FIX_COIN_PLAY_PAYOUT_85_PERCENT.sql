-- ============================================================================
-- FIX COIN PLAY PAYOUT TO GIVE 85% TO WINNER (15% PLATFORM FEE)
-- ============================================================================
-- Updates the process_coin_play_payout function to distribute:
-- - 85% to winner (highest score)
-- - 15% platform fee
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '💰 FIXING COIN PLAY PAYOUT (85%% WINNER)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- UPDATE PAYOUT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_coin_play_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_session_status TEXT;
    v_timer_started_at TIMESTAMPTZ;
    v_timer_duration INTEGER;
    v_winner_id UUID;
    v_winner_username TEXT;
    v_winner_score NUMERIC;
    v_prize_pool NUMERIC;
    v_winner_payout NUMERIC;
    v_platform_fee NUMERIC;
    v_participants_count INTEGER;
    v_min_participants INTEGER;
BEGIN
    -- Get active session for this config
    SELECT id, status, timer_started_at, timer_duration, prize_pool, participants_count
    INTO v_session_id, v_session_status, v_timer_started_at, v_timer_duration, v_prize_pool, v_participants_count
    FROM public.coin_play_sessions
    WHERE config_id = config_id_param AND status = 'active'
    LIMIT 1;

    -- Check if session exists
    IF v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if timer has expired
    IF v_timer_started_at IS NULL OR (NOW() - v_timer_started_at) < (v_timer_duration || ' seconds')::INTERVAL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer has not expired yet');
    END IF;

    -- Check if already paid out
    IF v_session_status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session already paid out');
    END IF;

    -- Get minimum participants requirement
    SELECT min_participants INTO v_min_participants
    FROM public.coin_play_configs
    WHERE id = config_id_param;

    -- If no scores submitted, refund all participants
    IF NOT EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = v_session_id AND score IS NOT NULL
    ) THEN
        -- Refund all participants
        UPDATE public.users u
        SET won_tokens = COALESCE(won_tokens, 0) + 0.25 -- Entry fee refund
        FROM public.coin_play_participants p
        WHERE p.session_id = v_session_id AND p.user_id = u.id;

        -- Mark session as completed
        UPDATE public.coin_play_sessions
        SET status = 'completed'
        WHERE id = v_session_id;

        -- Create new waiting session
        INSERT INTO public.coin_play_sessions (config_id, status, prize_pool, timer_duration)
        VALUES (config_id_param, 'waiting', 0, 120);

        RETURN jsonb_build_object(
            'success', true,
            'message', 'No scores submitted - all participants refunded',
            'refunded', v_participants_count
        );
    END IF;

    -- Get winner (highest score)
    SELECT p.user_id, u.username, p.score
    INTO v_winner_id, v_winner_username, v_winner_score
    FROM public.coin_play_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    -- Calculate payout: 85% to winner, 15% platform fee
    v_platform_fee := v_prize_pool * 0.15;
    v_winner_payout := v_prize_pool * 0.85;

    -- Award prize to winner (85% of pool)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout
    WHERE id = v_winner_id;

    -- Mark session as completed
    UPDATE public.coin_play_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner_id,
        winner_prize = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW()
    WHERE id = v_session_id;

    -- Create new waiting session
    INSERT INTO public.coin_play_sessions (config_id, status, prize_pool, timer_duration)
    VALUES (config_id_param, 'waiting', 0, 120);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_id', v_winner_id,
        'winner_username', v_winner_username,
        'winner_score', v_winner_score,
        'prize_pool', v_prize_pool,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee
    );
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Payout function updated';
    RAISE NOTICE '   Winner gets: 85%% of pool';
    RAISE NOTICE '   Platform fee: 15%% of pool';
END $$;

-- ============================================================================
-- VERIFY FUNCTION
-- ============================================================================

SELECT 
    '=== Coin Play Payout Function Updated ===' as info;

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'process_coin_play_payout'
AND routine_schema = 'public';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT FUNCTION UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Payout Structure:';
    RAISE NOTICE '   - Winner (highest score): 85%% of pool';
    RAISE NOTICE '   - Platform fee: 15%% of pool';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Example:';
    RAISE NOTICE '   $100 pool → Winner gets $85, Platform gets $15';
    RAISE NOTICE '';
END $$;

SELECT '✅ PAYOUT FUNCTION UPDATED - Winner gets 85% of pool!' as status;

