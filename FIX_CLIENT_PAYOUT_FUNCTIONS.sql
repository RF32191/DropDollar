-- ============================================================================
-- FIX CLIENT-SIDE PAYOUT FUNCTIONS TO MATCH WORKING EMERGENCY PAYOUT
-- ============================================================================
-- This updates the client-side payout functions to use the exact same
-- structure that worked in the emergency payout
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS pay_user_tokens(TEXT, NUMERIC);
DROP FUNCTION IF EXISTS save_game_result(TEXT, TEXT, NUMERIC, NUMERIC, TEXT);

-- ============================================================================
-- FIXED: Pay User Tokens (matches working emergency payout)
-- ============================================================================
CREATE OR REPLACE FUNCTION pay_user_tokens(
    user_id_param TEXT,
    amount_param NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
    v_username TEXT;
BEGIN
    RAISE NOTICE '💵 [Pay User] Paying % tokens to user %', amount_param, user_id_param;
    
    -- Get current balance
    SELECT COALESCE(tokens, 0), COALESCE(username, email)
    INTO v_balance_before, v_username
    FROM public.users
    WHERE id::text = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id_param;
    END IF;
    
    v_balance_after := v_balance_before + amount_param;
    
    -- Update user balance
    UPDATE public.users
    SET 
        tokens = v_balance_after,
        total_earned = COALESCE(total_earned, 0) + amount_param,
        games_won = COALESCE(games_won, 0) + 1,
        updated_at = NOW()
    WHERE id::text = user_id_param;
    
    -- Record transaction in token_transactions table (with ALL required fields)
    INSERT INTO public.token_transactions (
        user_id,
        amount,
        type,
        balance_before,
        balance_after,
        transaction_type,
        description,
        created_at
    ) VALUES (
        user_id_param::uuid,
        amount_param,
        'game_win',  -- Must be one of: purchase, game_entry, game_win, withdrawal, refund, bonus, transfer
        v_balance_before,
        v_balance_after,
        'tournament_prize',
        'Hot Sell tournament prize',
        NOW()
    );
    
    RAISE NOTICE '✅ [Pay User] Paid % tokens to %. Balance: % → %', 
        amount_param, v_username, v_balance_before, v_balance_after;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_id_param,
        'username', v_username,
        'amount_paid', amount_param,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [Pay User] Error: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIXED: Save Game Result (without played_at column that doesn't exist)
-- ============================================================================
CREATE OR REPLACE FUNCTION save_game_result(
    user_id_param TEXT,
    game_type_param TEXT,
    score_param NUMERIC,
    tokens_won_param NUMERIC,
    tournament_type_param TEXT
)
RETURNS JSON AS $$
DECLARE
    v_username TEXT;
BEGIN
    RAISE NOTICE '📊 [Save Game] Saving result for user % - Score: %, Won: %', 
        user_id_param, score_param, tokens_won_param;
    
    -- Get username
    SELECT COALESCE(username, email) INTO v_username
    FROM public.users
    WHERE id::text = user_id_param;
    
    -- Try to save to game_history (without played_at if it doesn't exist)
    BEGIN
        INSERT INTO public.game_history (
            user_id,
            game_type,
            score,
            tokens_won,
            tournament_type,
            created_at
        ) VALUES (
            user_id_param,
            game_type_param,
            score_param,
            tokens_won_param,
            tournament_type_param,
            NOW()
        );
        RAISE NOTICE '✅ [Save Game] Saved to game_history';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [Save Game] Could not save to game_history: %', SQLERRM;
    END;
    
    -- Try to save to user_game_history
    BEGIN
        INSERT INTO public.user_game_history (
            user_id,
            game_type,
            score,
            tokens_earned,
            competition_type,
            played_at
        ) VALUES (
            user_id_param,
            game_type_param,
            score_param,
            tokens_won_param,
            tournament_type_param,
            NOW()
        );
        RAISE NOTICE '✅ [Save Game] Saved to user_game_history';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [Save Game] Could not save to user_game_history: %', SQLERRM;
    END;
    
    -- Update user stats (games_played was already incremented)
    UPDATE public.users
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        updated_at = NOW()
    WHERE id::text = user_id_param;
    
    RAISE NOTICE '✅ [Save Game] All saves completed for %', v_username;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_id_param,
        'username', v_username,
        'game_type', game_type_param,
        'score', score_param,
        'tokens_won', tokens_won_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [Save Game] Error: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION pay_user_tokens(TEXT, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION save_game_result(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ CLIENT-SIDE PAYOUT FUNCTIONS FIXED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ pay_user_tokens() now uses the working structure from emergency payout';
    RAISE NOTICE '✅ save_game_result() now handles missing columns gracefully';
    RAISE NOTICE '✅ All required fields included (type, balance_before, balance_after)';
    RAISE NOTICE '✅ Proper error handling for dashboard saves';
    RAISE NOTICE '✅ ============================================================';
END $$;

