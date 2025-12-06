-- ============================================================================
-- FIX WINNER TAKES ALL: 2 MINUTE TIMER + NO SCORES PAYOUT ISSUE
-- ============================================================================
-- Changes:
-- 1. Timer reduced to 2 minutes (120 seconds) for testing
-- 2. Fix payout function to handle "no scores yet" gracefully
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING WTA TIMER & PAYOUT';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: CHANGE TIMER TO 2 MINUTES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⏱️ Changing timer to 2 minutes (120 seconds)...';
END $$;

-- Update all existing sessions
UPDATE public.winner_takes_all_sessions
SET 
    timer_duration = 120, -- 2 minutes in seconds
    updated_at = NOW()
WHERE config_id LIKE 'wta-%';

-- Update default for new sessions
ALTER TABLE public.winner_takes_all_sessions 
ALTER COLUMN timer_duration SET DEFAULT 120;

DO $$
BEGIN
    RAISE NOTICE '✅ Timer updated to 2 minutes!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 2: FIX PAYOUT FUNCTION - HANDLE "NO SCORES YET"
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Fixing payout function to handle no scores gracefully...';
END $$;

CREATE OR REPLACE FUNCTION public.trigger_winner_takes_all_payout(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_session RECORD;
    v_winner RECORD;
    v_winner_prize NUMERIC;
    v_platform_fee NUMERIC;
    v_participants_with_scores INTEGER;
    v_total_participants INTEGER;
BEGIN
    -- Get config
    SELECT * INTO v_config FROM public.winner_takes_all_configs WHERE id = config_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Configuration not found',
            'code', 'CONFIG_NOT_FOUND'
        );
    END IF;

    -- Get active session
    SELECT * INTO v_session FROM public.winner_takes_all_sessions 
    WHERE config_id = config_id_param AND status = 'active';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'No active session found',
            'code', 'NO_ACTIVE_SESSION'
        );
    END IF;

    -- Check if already paid out
    IF v_session.winner_user_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session already paid out',
            'code', 'ALREADY_PAID'
        );
    END IF;

    -- Check if timer started
    IF v_session.timer_started_at IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Timer not started yet',
            'code', 'TIMER_NOT_STARTED'
        );
    END IF;

    -- Check if timer expired
    IF EXTRACT(EPOCH FROM (NOW() - v_session.timer_started_at)) < v_session.timer_duration THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Timer not expired yet',
            'code', 'TIMER_NOT_EXPIRED',
            'seconds_remaining', v_session.timer_duration - EXTRACT(EPOCH FROM (NOW() - v_session.timer_started_at))::INTEGER
        );
    END IF;

    -- Count total participants
    SELECT COUNT(*) INTO v_total_participants
    FROM public.winner_takes_all_participants
    WHERE session_id = v_session.id;

    IF v_total_participants = 0 THEN
        -- No participants at all - just complete the session
        UPDATE public.winner_takes_all_sessions
        SET 
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = v_session.id;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Session completed with no participants',
            'code', 'NO_PARTICIPANTS'
        );
    END IF;

    -- Count participants with scores
    SELECT COUNT(*) INTO v_participants_with_scores
    FROM public.winner_takes_all_participants
    WHERE session_id = v_session.id AND score IS NOT NULL;

    IF v_participants_with_scores = 0 THEN
        -- 🔧 FIX: Handle "no scores yet" - refund all participants
        RAISE NOTICE '⚠️ No scores submitted. Refunding all participants...';
        
        -- Refund entry fees to all participants
        UPDATE public.users u
        SET 
            gameplay_tokens = gameplay_tokens + v_config.entry_fee,
            updated_at = NOW()
        FROM public.winner_takes_all_participants p
        WHERE p.session_id = v_session.id 
          AND p.user_id = u.id;
        
        -- Mark session as completed (no winner)
        UPDATE public.winner_takes_all_sessions
        SET 
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = v_session.id;
        
        RETURN json_build_object(
            'success', true, 
            'message', format('No scores submitted. Refunded %s tokens to %s participants.', v_config.entry_fee, v_total_participants),
            'code', 'NO_SCORES_REFUNDED',
            'participants_refunded', v_total_participants,
            'tokens_refunded_per_user', v_config.entry_fee
        );
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.gameplay_tokens
    INTO v_winner
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'No winner found despite scores existing',
            'code', 'NO_WINNER'
        );
    END IF;

    -- Calculate prizes (85% to winner, 15% platform fee)
    v_winner_prize := v_session.prize_pool * 0.85;
    v_platform_fee := v_session.prize_pool * 0.15;

    -- Pay winner
    UPDATE public.users
    SET 
        won_tokens = won_tokens + v_winner_prize,
        total_winnings = total_winnings + v_winner_prize,
        updated_at = NOW()
    WHERE id = v_winner.user_id;

    -- Update session with winner
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = v_winner.user_id,
        winner_prize = v_winner_prize,
        platform_fee = v_platform_fee,
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;

    -- Update winner participant record
    UPDATE public.winner_takes_all_participants
    SET 
        prize_amount = v_winner_prize,
        updated_at = NOW()
    WHERE id = v_winner.id;

    RAISE NOTICE '✅ Winner Takes All payout successful: User % won % tokens', v_winner.user_id, v_winner_prize;

    RETURN json_build_object(
        'success', true,
        'message', 'Payout completed successfully',
        'winner_user_id', v_winner.user_id,
        'winner_username', v_winner.username,
        'winner_score', v_winner.score,
        'winner_prize', v_winner_prize,
        'platform_fee', v_platform_fee,
        'total_prize_pool', v_session.prize_pool
    );
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Payout function fixed!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 3: VERIFY CHANGES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Show current timer settings
SELECT 
    config_id,
    timer_duration,
    timer_duration / 60 as duration_minutes,
    status,
    participants_count,
    prize_pool,
    timer_started_at,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN 
            GREATEST(0, timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)
        ELSE timer_duration 
    END as seconds_remaining
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ FIXES COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Changes made:';
    RAISE NOTICE '   ✅ Timer changed to 2 minutes (120 seconds)';
    RAISE NOTICE '   ✅ Payout handles "no scores yet" gracefully';
    RAISE NOTICE '   ✅ Refunds all participants if no scores submitted';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test the fixes:';
    RAISE NOTICE '   1. Create a WTA session';
    RAISE NOTICE '   2. Join with 2+ players';
    RAISE NOTICE '   3. Wait 2 minutes WITHOUT playing';
    RAISE NOTICE '   4. Payout should trigger and refund everyone';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

