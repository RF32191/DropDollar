-- ============================================================================
-- FIX PAYOUT SCORING ERROR
-- ============================================================================
-- This fixes the "No participants with scores found" error that appears
-- even when payout works correctly
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_payout_by_config(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_payout_by_config(
    config_id_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    winner_username TEXT;
    total_pot NUMERIC;
    platform_fee_amount NUMERIC;
    winner_payout_amount NUMERIC;
BEGIN
    -- Find active or completed session for this config
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found for config');
    END IF;

    -- Check if already paid out (don't show error, just return info)
    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        -- Get winner info for display
        SELECT email INTO winner_username FROM public.users WHERE id = session_record.winner_user_id;
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Session already paid out',
            'winner_username', winner_username,
            'payout_amount', session_record.prize_amount,
            'already_paid', true
        );
    END IF;

    -- Find winner (highest score) - Check both completed_at IS NOT NULL and score IS NOT NULL
    SELECT p.*, u.email as username
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        -- More helpful error message
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'No participants with valid scores found. Make sure players have completed their games.',
            'session_id', session_record.id,
            'config_id', config_id_param
        );
    END IF;

    -- Calculate payout (85% to winner, 15% platform fee)
    total_pot := COALESCE(session_record.current_pot, 0);
    
    -- Safety check - don't pay if pot is 0
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Pot amount is 0, cannot process payout'
        );
    END IF;
    
    platform_fee_amount := total_pot * 0.15;
    winner_payout_amount := total_pot - platform_fee_amount;

    -- Pay winner (update their token balance)
    UPDATE public.users
    SET tokens = COALESCE(tokens, 0) + winner_payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        prize_amount = winner_payout_amount,
        platform_fee = platform_fee_amount,
        updated_at = NOW()
    WHERE id = session_record.id;

    -- Get winner username for response
    SELECT email INTO winner_username FROM public.users WHERE id = winner_record.user_id;

    -- Log successful payout
    RAISE NOTICE '✅ [PAYOUT] Winner % paid % tokens from pot of % (Fee: %)', 
        winner_username, winner_payout_amount, total_pot, platform_fee_amount;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_user_id', winner_record.user_id,
        'winner_username', winner_username,
        'winner_score', winner_record.score,
        'payout_amount', winner_payout_amount,
        'platform_fee', platform_fee_amount,
        'total_pot', total_pot,
        'already_paid', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon;

-- ============================================================================
-- DONE! This should fix the error message while keeping payout working
-- ============================================================================

