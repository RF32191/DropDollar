-- ============================================================================
-- FIX WINNER TAKES ALL PAYOUT AND RESET - ENSURE ALL GAMES RESET POST PAYOUT
-- ============================================================================
-- Ensures payout is announced and listings reset properly after payout
-- Similar to Coin Play fix - ensures completed listings reset and new waiting sessions appear
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '💰 FIXING WTA PAYOUT & RESET';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- UPDATE PAYOUT FUNCTION TO ENSURE PROPER RESET
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_time_elapsed NUMERIC;
    v_winner_username TEXT;
    v_new_session_id UUID;
BEGIN
    RAISE NOTICE '💰 [PAYOUT] Starting payout for config: %', config_id_param;
    
    -- Find active session for this config
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if already paid out
    IF session_record.winner_user_id IS NOT NULL OR session_record.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Session already paid out',
            'already_paid', true
        );
    END IF;

    -- Check if timer has expired
    IF session_record.timer_started_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer not started yet');
    END IF;

    v_time_elapsed := EXTRACT(EPOCH FROM (NOW() - session_record.timer_started_at));
    
    -- Check if timer has expired (at least timer_duration seconds elapsed)
    IF v_time_elapsed < COALESCE(session_record.timer_duration, 10) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Timer has not expired yet. Time elapsed: ' || ROUND(v_time_elapsed, 1) || 's'
        );
    END IF;

    -- Find winner (highest score, earliest completion as tiebreaker)
    SELECT p.*, COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        -- No scores submitted - refund all participants
        UPDATE public.users u
        SET won_tokens = COALESCE(won_tokens, 0) + session_record.base_price
        FROM public.winner_takes_all_participants p
        WHERE p.session_id = session_record.id AND p.user_id = u.id;

        -- Mark session as completed
        UPDATE public.winner_takes_all_sessions
        SET 
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = session_record.id;

        -- Clear participants
        DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;

        -- Reset session to waiting state
        UPDATE public.winner_takes_all_sessions
        SET 
            status = 'waiting',
            participants_count = 0,
            current_pot = 0,
            prize_pool = 0,
            timer_started_at = NULL,
            winner_user_id = NULL,
            winner_prize = NULL,
            prize_amount = NULL,
            platform_fee = NULL,
            completed_at = NULL,
            rng_seed = floor(random() * 99999 + 1)::integer,
            updated_at = NOW()
        WHERE id = session_record.id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'No scores submitted - all participants refunded. Listing reset.',
            'refunded', true
        );
    END IF;

    v_winner_username := winner_record.username;

    -- Calculate payout (85% winner, 15% platform fee)
    total_pot := COALESCE(session_record.prize_pool, session_record.current_pot, session_record.base_price, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;

    RAISE NOTICE '🏆 [PAYOUT] Winner: % (score: %) = % tokens', v_winner_username, winner_record.score, v_winner_payout;

    -- Pay winner to won_tokens wallet
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    RAISE NOTICE '✅ [PAYOUT] Winner paid % tokens', v_winner_payout;

    -- Record transaction
    BEGIN
        INSERT INTO public.token_transactions (
            user_id, 
            transaction_type, 
            amount, 
            balance_after, 
            description, 
            created_at
        )
        VALUES (
            winner_record.user_id,
            'game_win',
            v_winner_payout,
            (SELECT COALESCE(won_tokens, 0) FROM public.users WHERE id = winner_record.user_id),
            'Winner Takes All - ' || config_id_param || ' (Score: ' || winner_record.score || ')',
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [PAYOUT] Transaction log failed (non-fatal): %', SQLERRM;
    END;

    -- Mark session as completed with winner info
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        winner_prize = v_winner_payout,
        prize_amount = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    RAISE NOTICE '✅ [PAYOUT] Session % marked as completed', session_record.id;

    -- Clear participants from completed session
    DELETE FROM public.winner_takes_all_participants
    WHERE session_id = session_record.id;

    RAISE NOTICE '🧹 [RESET] Cleared participants from completed session';

    -- CRITICAL: Reset session to waiting state IMMEDIATELY (frontend will filter out completed sessions)
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_prize = NULL,
        prize_amount = NULL,
        platform_fee = NULL,
        completed_at = NULL,
        rng_seed = floor(random() * 99999 + 1)::integer,
        updated_at = NOW()
    WHERE id = session_record.id;

    RAISE NOTICE '🔄 [RESET] Session % reset to waiting state', session_record.id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT COMPLETE & LISTING RESET!';
    RAISE NOTICE '🎉 Winner: % (score: %)', v_winner_username, winner_record.score;
    RAISE NOTICE '💰 Payout: % tokens (85%% of % pool)', v_winner_payout, total_pot;
    RAISE NOTICE '🆕 Session reset and ready for new game';
    RAISE NOTICE '========================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', '🎉 Payout complete! Winner: ' || v_winner_username || ' received ' || v_winner_payout::TEXT || ' tokens. Listing reset!',
        'winner_username', v_winner_username,
        'winner_user_id', winner_record.user_id::TEXT,
        'winner_score', winner_record.score,
        'payout_amount', v_winner_payout,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot,
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

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;

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
    RAISE NOTICE '   3. Reset session to waiting state';
    RAISE NOTICE '   4. Generate new RNG seed';
    RAISE NOTICE '';
    RAISE NOTICE '📢 Payout Announcement:';
    RAISE NOTICE '   - Returns winner username and payout amount';
    RAISE NOTICE '   - Frontend will display announcement';
    RAISE NOTICE '';
END $$;

SELECT '✅ PAYOUT FUNCTION UPDATED - All WTA games will reset post payout!' as status;

