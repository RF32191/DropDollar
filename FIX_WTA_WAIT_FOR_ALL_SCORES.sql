-- ============================================================================
-- FIX WTA PAYOUT TO WAIT FOR ALL SCORES BEFORE DETERMINING WINNER
-- ============================================================================
-- This updates the payout function to ensure all participants have completed
-- their games before determining a winner and paying out
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing payout functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.process_wta_payout(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.process_payout_by_config(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.process_winner_takes_all_payout(TEXT) CASCADE;

-- ============================================================================
-- STEP 2: Create new payout function that waits for all scores
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_wta_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
    v_total_participants INTEGER;
    v_completed_count INTEGER;
    v_pending_count INTEGER;
    v_total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_balance NUMERIC;
BEGIN
    RAISE NOTICE '🏆 [WTA PAYOUT] Starting payout for config: %', config_id_param;
    
    -- Get active session - try multiple ways to match config_id
    SELECT * INTO v_session
    FROM public.winner_takes_all_sessions
    WHERE (
        config_id::TEXT = config_id_param::TEXT
        OR config_id = config_id_param::UUID
        OR config_id::TEXT = config_id_param
    )
    AND status IN ('active', 'waiting', 'completed')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
    
    -- If still not found, try without status filter
    IF NOT FOUND THEN
        SELECT * INTO v_session
        FROM public.winner_takes_all_sessions
        WHERE (
            config_id::TEXT = config_id_param::TEXT
            OR config_id = config_id_param::UUID
            OR config_id::TEXT = config_id_param
        )
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;
    END IF;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No session found for config: %', config_id_param;
        -- Return more detailed error for debugging
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Session not found for config: %s. Please refresh the page.', config_id_param),
            'config_id', config_id_param,
            'error_type', 'session_not_found'
        );
    END IF;
    
    RAISE NOTICE '✅ Found session: % (status: %, participants: %)', 
        v_session.id, v_session.status, v_session.participants_count;
    
    -- Check if already paid out
    IF v_session.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Already paid out';
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Session already paid out',
            'already_paid', true
        );
    END IF;
    
    -- Count total participants
    SELECT COUNT(*) INTO v_total_participants
    FROM public.winner_takes_all_participants
    WHERE session_id = v_session.id;
    
    -- Count completed games (have score and completed_at)
    SELECT COUNT(*) INTO v_completed_count
    FROM public.winner_takes_all_participants
    WHERE session_id = v_session.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;
    
    -- Count pending games (joined but not completed)
    SELECT COUNT(*) INTO v_pending_count
    FROM public.winner_takes_all_participants
    WHERE session_id = v_session.id
    AND (score IS NULL OR completed_at IS NULL);
    
    RAISE NOTICE '📊 [WTA PAYOUT] Participants: Total=%, Completed=%, Pending=%', 
        v_total_participants, v_completed_count, v_pending_count;
    
    -- CRITICAL: Wait for ALL participants to complete their games
    IF v_total_participants = 0 THEN
        RAISE NOTICE '⏸️ No participants yet';
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No participants have joined yet',
            'total_participants', 0,
            'completed_count', 0
        );
    END IF;
    
    IF v_pending_count > 0 THEN
        RAISE NOTICE '⏸️ Waiting for % players to complete their games', v_pending_count;
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Waiting for %s player(s) to complete their games', v_pending_count),
            'total_participants', v_total_participants,
            'completed_count', v_completed_count,
            'pending_count', v_pending_count,
            'waiting_for_scores', true
        );
    END IF;
    
    -- All participants have completed - now determine winner
    IF v_completed_count = 0 THEN
        RAISE NOTICE '❌ No completed games (should not happen if pending_count = 0)';
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No completed games found'
        );
    END IF;
    
    -- Get winner (highest score, earliest completion time as tiebreaker)
    SELECT p.*, COALESCE(u.username, u.email, 'Player') as username
    INTO v_winner
    FROM public.winner_takes_all_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No winner found';
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No winner found'
        );
    END IF;
    
    -- Calculate payout (85% winner, 15% platform fee)
    v_total_pot := COALESCE(v_session.prize_pool, v_session.current_pot, 0);
    
    IF v_total_pot <= 0 THEN
        RAISE NOTICE '❌ Empty prize pool';
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Prize pool is empty'
        );
    END IF;
    
    v_platform_fee := v_total_pot * 0.15;
    v_winner_payout := v_total_pot - v_platform_fee;
    
    RAISE NOTICE '💰 [WTA PAYOUT] Pot: %, Winner: % (score: %), Payout: %, Fee: %', 
        v_total_pot, v_winner.username, v_winner.score, v_winner_payout, v_platform_fee;
    
    -- Pay winner
    UPDATE public.users
    SET 
        won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        total_earned = COALESCE(total_earned, 0) + v_winner_payout,
        games_won = COALESCE(games_won, 0) + 1,
        games_played = COALESCE(games_played, 0) + 1,
        updated_at = NOW()
    WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance;
    
    -- Record transaction
    BEGIN
        INSERT INTO public.token_transactions (
            user_id, 
            transaction_type, 
            amount, 
            balance_before, 
            balance_after, 
            description, 
            created_at
        )
        VALUES (
            v_winner.user_id,
            'game_win',
            v_winner_payout,
            v_balance - v_winner_payout,
            v_balance,
            'Winner Takes All - Winner',
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not save transaction: %', SQLERRM;
    END;
    
    -- Save to game_history
    BEGIN
        INSERT INTO public.game_history (
            user_id, 
            game_type, 
            score, 
            tokens_won, 
            tournament_type, 
            created_at
        )
        VALUES (
            v_winner.user_id,
            v_session.game_type,
            v_winner.score,
            v_winner_payout,
            'winner_takes_all',
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not save to game_history: %', SQLERRM;
    END;
    
    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        winner_prize = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RAISE NOTICE '✅ [WTA PAYOUT] Winner paid and session marked completed';
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Winner paid successfully',
        'winner_username', v_winner.username,
        'winner_score', v_winner.score,
        'payout_amount', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_participants', v_total_participants,
        'completed_count', v_completed_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [WTA PAYOUT] Error: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Error processing payout: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.process_wta_payout(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 4: Create alias function for backward compatibility
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.process_wta_payout(config_id_param);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ WTA PAYOUT FUNCTION UPDATED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Function: process_wta_payout(config_id)';
    RAISE NOTICE '✅ Now waits for ALL participants to complete before payout';
    RAISE NOTICE '✅ Checks:';
    RAISE NOTICE '✅   - All participants must have score IS NOT NULL';
    RAISE NOTICE '✅   - All participants must have completed_at IS NOT NULL';
    RAISE NOTICE '✅   - Only then determines winner and pays out';
    RAISE NOTICE '✅ Payout: 85%% to winner, 15%% platform fee';
    RAISE NOTICE '✅ ============================================================';
END $$;

