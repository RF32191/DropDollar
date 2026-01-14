-- ============================================================================
-- FIX WINNER TAKES ALL PAYOUT AND RESET V2 - KEEP COMPLETED FOR 30 SECONDS
-- ============================================================================
-- Ensures payout happens, announcement shows for 30 seconds, then reset
-- Fixes "joined" status issue by properly clearing participants
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '💰 FIXING WTA PAYOUT & RESET V2';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- UPDATE PAYOUT FUNCTION - KEEP COMPLETED FOR 30 SECONDS
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
BEGIN
    RAISE NOTICE '💰 [PAYOUT] Starting payout for config: %', config_id_param;
    
    -- Find active OR completed session for this config (allow payout if just completed)
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    AND (status = 'active' OR (status = 'completed' AND completed_at > NOW() - INTERVAL '1 minute'))
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if already paid out (and more than 30 seconds ago)
    IF session_record.winner_user_id IS NOT NULL THEN
        -- If completed more than 30 seconds ago, allow reset
        IF session_record.completed_at IS NOT NULL AND 
           EXTRACT(EPOCH FROM (NOW() - session_record.completed_at)) > 30 THEN
            -- Reset the session now (30 seconds have passed)
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
            
            -- Clear participants to fix "joined" status
            DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;
            
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Session reset after 30-second announcement period',
                'reset', true
            );
        ELSE
            RETURN jsonb_build_object(
                'success', true, 
                'message', 'Session already paid out - showing announcement',
                'already_paid', true,
                'winner_username', (SELECT username FROM public.users WHERE id = session_record.winner_user_id LIMIT 1),
                'winner_payout', session_record.winner_prize
            );
        END IF;
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

        -- Clear participants to fix "joined" status
        DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;

        -- Reset after 30 seconds (frontend will handle this)
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No scores submitted - all participants refunded. Listing will reset in 30 seconds.',
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

    -- Mark session as completed with winner info (KEEP AS COMPLETED FOR 30 SECONDS)
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

    RAISE NOTICE '✅ [PAYOUT] Session % marked as completed (will reset after 30 seconds)', session_record.id;

    -- CRITICAL: Clear participants IMMEDIATELY to fix "joined" status
    -- But keep session as "completed" for 30 seconds for announcement
    DELETE FROM public.winner_takes_all_participants
    WHERE session_id = session_record.id;

    RAISE NOTICE '🧹 [RESET] Cleared participants to fix "joined" status';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT COMPLETE!';
    RAISE NOTICE '🎉 Winner: % (score: %)', v_winner_username, winner_record.score;
    RAISE NOTICE '💰 Payout: % tokens (85%% of % pool)', v_winner_payout, total_pot;
    RAISE NOTICE '⏰ Session will reset after 30-second announcement';
    RAISE NOTICE '========================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', '🎉 Payout complete! Winner: ' || v_winner_username || ' received ' || v_winner_payout::TEXT || ' tokens. Announcement will show for 30 seconds.',
        'winner_username', v_winner_username,
        'winner_user_id', winner_record.user_id::TEXT,
        'winner_score', winner_record.score,
        'payout_amount', v_winner_payout,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot,
        'payout_announced', true,
        'completed_at', NOW()
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
-- CREATE FUNCTION TO AUTO-RESET AFTER 30 SECONDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_reset_completed_wta_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reset_count INTEGER := 0;
BEGIN
    -- Reset sessions that have been completed for more than 30 seconds
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
    WHERE status = 'completed'
    AND completed_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - completed_at)) > 30;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.auto_reset_completed_wta_sessions() TO authenticated, anon, service_role;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT FUNCTION UPDATED V2';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Payout Structure:';
    RAISE NOTICE '   - Winner (highest score): 85%% of pool';
    RAISE NOTICE '   - Platform fee: 15%% of pool';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Reset Process:';
    RAISE NOTICE '   1. Pay winner immediately';
    RAISE NOTICE '   2. Mark session as completed';
    RAISE NOTICE '   3. Clear participants (fixes "joined" status)';
    RAISE NOTICE '   4. Keep session as "completed" for 30 seconds';
    RAISE NOTICE '   5. Frontend shows announcement for 30 seconds';
    RAISE NOTICE '   6. Auto-reset after 30 seconds';
    RAISE NOTICE '';
    RAISE NOTICE '📢 Payout Announcement:';
    RAISE NOTICE '   - Shows for 30 seconds';
    RAISE NOTICE '   - Returns winner username and payout amount';
    RAISE NOTICE '';
END $$;

SELECT '✅ PAYOUT FUNCTION UPDATED V2 - 30 second announcement period!' as status;

