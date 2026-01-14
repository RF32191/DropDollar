-- ============================================================================
-- FIX COIN PLAY PAYOUT AND RESET - ENSURE ALL GAMES RESET POST PAYOUT
-- ============================================================================
-- Ensures payout is announced and listings reset properly after payout
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '💰 FIXING COIN PLAY PAYOUT & RESET';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- UPDATE PAYOUT FUNCTION TO ENSURE PROPER RESET
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
    v_new_session_id UUID;
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
    IF v_timer_started_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer has not started yet');
    END IF;
    
    -- Calculate elapsed time in seconds
    IF EXTRACT(EPOCH FROM (NOW() - v_timer_started_at)) < v_timer_duration THEN
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
        SET status = 'completed', completed_at = NOW()
        WHERE id = v_session_id;

        -- Clear participants
        DELETE FROM public.coin_play_participants WHERE session_id = v_session_id;

        -- Delete any existing waiting session for this config
        DELETE FROM public.coin_play_sessions
        WHERE config_id = config_id_param AND status = 'waiting';
        
        -- Create fresh waiting session
        INSERT INTO public.coin_play_sessions (
            config_id, 
            status, 
            prize_pool, 
            participants_count,
            timer_duration
        )
        VALUES (
            config_id_param, 
            'waiting', 
            0, 
            0,
            120
        )
        RETURNING id INTO v_new_session_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'No scores submitted - all participants refunded',
            'refunded', v_participants_count,
            'new_session_id', v_new_session_id
        );
    END IF;

    -- Get winner (highest score)
    SELECT p.user_id, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'), p.score
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

    RAISE NOTICE '💰 [PAYOUT] Winner % paid % tokens (85%% of % pool)', v_winner_username, v_winner_payout, v_prize_pool;

    -- Mark session as completed with winner info
    UPDATE public.coin_play_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner_id,
        winner_prize = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW()
    WHERE id = v_session_id;

    RAISE NOTICE '✅ [PAYOUT] Session % marked as completed', v_session_id;

    -- Clear participants from completed session (cleanup)
    DELETE FROM public.coin_play_participants
    WHERE session_id = v_session_id;

    RAISE NOTICE '🧹 [RESET] Cleared participants from completed session';

    -- CRITICAL: Delete any existing waiting session for this config BEFORE creating new one
    DELETE FROM public.coin_play_sessions
    WHERE config_id = config_id_param AND status = 'waiting';
    
    RAISE NOTICE '🗑️ [RESET] Deleted any existing waiting sessions for config %', config_id_param;
    
    -- Create fresh waiting session IMMEDIATELY (frontend will filter out completed sessions)
    INSERT INTO public.coin_play_sessions (
        config_id, 
        status, 
        prize_pool, 
        participants_count,
        timer_duration
    )
    VALUES (
        config_id_param, 
        'waiting', 
        0, 
        0,
        120
    )
    RETURNING id INTO v_new_session_id;

    RAISE NOTICE '🆕 [RESET] New waiting session created: % for config: %', v_new_session_id, config_id_param;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT COMPLETE & LISTING RESET!';
    RAISE NOTICE '🎉 Winner: % (score: %)', v_winner_username, v_winner_score;
    RAISE NOTICE '💰 Payout: % tokens (85%% of % pool)', v_winner_payout, v_prize_pool;
    RAISE NOTICE '🆕 New session ready: %', v_new_session_id;
    RAISE NOTICE '========================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', '🎉 Payout complete! Winner: ' || v_winner_username || ' received ' || v_winner_payout::TEXT || ' tokens. Listing reset!',
        'winner_id', v_winner_id,
        'winner_username', v_winner_username,
        'winner_score', v_winner_score,
        'prize_pool', v_prize_pool,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee,
        'new_session_id', v_new_session_id,
        'payout_announced', true
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [PAYOUT ERROR] %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Payout failed: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.process_coin_play_payout(TEXT) TO authenticated;

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
    RAISE NOTICE '🔄 Reset Process:';
    RAISE NOTICE '   1. Mark session as completed';
    RAISE NOTICE '   2. Clear all participants';
    RAISE NOTICE '   3. Delete any existing waiting sessions';
    RAISE NOTICE '   4. Create fresh waiting session';
    RAISE NOTICE '';
    RAISE NOTICE '📢 Payout Announcement:';
    RAISE NOTICE '   - Returns winner username and payout amount';
    RAISE NOTICE '   - Frontend will display announcement';
    RAISE NOTICE '';
END $$;

SELECT '✅ PAYOUT FUNCTION UPDATED - All games will reset post payout!' as status;

