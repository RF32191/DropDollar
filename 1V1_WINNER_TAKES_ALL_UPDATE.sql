-- ============================================================================
-- 1V1 WINNER TAKES ALL PAYOUT UPDATE
-- ============================================================================
-- Changes payout from 50%/35%/15% to 85%/0%/15%
-- Winner takes all minus platform fee!
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);
DROP FUNCTION IF EXISTS public.process_1v1_payout(UUID);
DROP FUNCTION IF EXISTS public.process_1v1_payout;

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    loser_record RECORD;
    total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_loser_payout NUMERIC;
BEGIN
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id::TEXT = config_id_param::TEXT
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;

    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid out', 'already_paid', true);
    END IF;

    SELECT p.*, u.username
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner found');
    END IF;

    SELECT p.*, u.username
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id::TEXT = session_record.id::TEXT
    AND p.score IS NOT NULL
    AND p.user_id != winner_record.user_id
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    -- WINNER TAKES ALL minus platform fee (85% winner, 15% platform, 0% loser)
    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;  -- Winner gets 85%
    v_loser_payout := 0;  -- Loser gets nothing

    -- Pay winner
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout WHERE id = winner_record.user_id;
    INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
    VALUES (winner_record.user_id, 'credit', 'game_win', v_winner_payout, '1v1 Winner Takes All');

    -- No payout to loser (loser_payout = 0)

    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL),
        winner_prize = v_winner_payout,
        loser_prize = 0,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id::TEXT = session_record.id::TEXT;

    RAISE NOTICE '✅ [1V1 PAYOUT] Winner Takes All: % gets $% (Loser: % gets $0)', 
        winner_record.username, v_winner_payout,
        COALESCE(loser_record.username, 'N/A');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Winner Takes All payout successful',
        'winner_username', winner_record.username,
        'loser_username', COALESCE(loser_record.username, 'None'),
        'winner_payout', v_winner_payout,
        'loser_payout', 0,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

SELECT '
✅ 1V1 WINNER TAKES ALL UPDATE COMPLETE!

New Payout Structure:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Winner: 85% of total pot
❌ Loser: 0% (nothing)
🏦 Platform: 15% fee

Example ($2 pot):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Winner: $1.70 (85%)
Loser: $0.00 (0%)
Platform: $0.30 (15%)

Example ($10 pot):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Winner: $8.50 (85%)
Loser: $0.00 (0%)
Platform: $1.50 (15%)

Ready! 🚀
' as summary;

