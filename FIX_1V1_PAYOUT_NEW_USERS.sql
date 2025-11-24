-- ============================================================================
-- FIX: 1v1 Payout for New Users
-- ============================================================================
-- This fixes issues with:
-- 1. Payout failing for new users who have NULL won_tokens
-- 2. Transaction logging errors for new users
-- ============================================================================

-- Ensure all users have won_tokens initialized (not NULL)
UPDATE users
SET won_tokens = 0
WHERE won_tokens IS NULL;

-- Ensure all users have purchased_tokens initialized (not NULL)
UPDATE users
SET purchased_tokens = 0
WHERE purchased_tokens IS NULL;

-- Add default constraints to prevent NULL in future
ALTER TABLE users
ALTER COLUMN won_tokens SET DEFAULT 0;

ALTER TABLE users
ALTER COLUMN purchased_tokens SET DEFAULT 0;

-- Update the payout function to handle edge cases better
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
    v_winner_payout NUMERIC;
    v_loser_payout NUMERIC;
    v_platform_fee NUMERIC;
BEGIN
    RAISE NOTICE '💰 [1V1 PAYOUT] Starting for config: %', config_id_param;
    
    -- Find the active/completed session
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session found for config: %', config_id_param;
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Check if already paid out
    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Session already paid out';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Check we have 2 participants
    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '⏸️ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No winner found - no completed games';
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;

    -- Get loser
    SELECT p.*, u.username, u.email
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.user_id != winner_record.user_id
    LIMIT 1;

    -- Calculate payouts
    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Prize pool is empty or zero';
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 Winner: % gets % tokens', winner_record.username, v_winner_payout;
    RAISE NOTICE '🥈 Loser: % gets % tokens', COALESCE(loser_record.username, 'None'), v_loser_payout;

    -- Ensure winner has won_tokens column initialized
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0)
    WHERE id = winner_record.user_id AND won_tokens IS NULL;

    -- Pay winner
    BEGIN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
            updated_at = NOW()
        WHERE id = winner_record.user_id;
        
        RAISE NOTICE '✅ Winner paid successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to pay winner: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'message', 'Failed to pay winner: ' || SQLERRM);
    END;

    -- Record winner transaction (with error handling)
    BEGIN
        INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
        VALUES (
            winner_record.user_id,
            'credit',
            'game_win',
            v_winner_payout,
            format('1v1 Winner Prize - Config: %s', config_id_param)
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to log winner transaction: %', SQLERRM;
        -- Don't fail the payout if logging fails
    END;

    -- Pay loser if exists
    IF loser_record IS NOT NULL THEN
        -- Ensure loser has won_tokens column initialized
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0)
        WHERE id = loser_record.user_id AND won_tokens IS NULL;

        BEGIN
            UPDATE public.users
            SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
                updated_at = NOW()
            WHERE id = loser_record.user_id;
            
            RAISE NOTICE '✅ Loser paid successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed to pay loser: %', SQLERRM;
            -- Continue even if loser payment fails
        END;

        -- Record loser transaction (with error handling)
        BEGIN
            INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
            VALUES (
                loser_record.user_id,
                'credit',
                'game_participation',
                v_loser_payout,
                format('1v1 Participation Prize - Config: %s', config_id_param)
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed to log loser transaction: %', SQLERRM;
            -- Don't fail the payout if logging fails
        END;
    END IF;

    -- Mark session as completed
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL),
        winner_prize = v_winner_payout,
        loser_prize = COALESCE(v_loser_payout, 0),
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    -- Reset the session for the next game (after a brief delay)
    PERFORM pg_sleep(2);
    
    BEGIN
        PERFORM reset_1v1_session(config_id_param);
        RAISE NOTICE '✅ Session reset successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to reset session: %', SQLERRM;
        -- Don't fail the payout if reset fails
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.username,
        'loser_username', COALESCE(loser_record.username, 'None'),
        'winner_payout', v_winner_payout,
        'loser_payout', v_loser_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Fatal error in payout: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Payout failed: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 1v1 payout system fixed for new users!';
  RAISE NOTICE '- All user token columns initialized to 0';
  RAISE NOTICE '- Added better error handling';
  RAISE NOTICE '- Transaction logging failures won''t block payouts';
END $$;

