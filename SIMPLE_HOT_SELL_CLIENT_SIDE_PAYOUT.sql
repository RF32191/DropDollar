-- ============================================================================
-- SIMPLE HOT SELL CLIENT-SIDE PAYOUT WITH FULL SUPABASE BACKUP
-- ============================================================================
-- This script creates all the necessary functions for a client-side payout system
-- that properly tracks and backs up all token transactions to Supabase.
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_hot_sell_winners(TEXT);
DROP FUNCTION IF EXISTS pay_user_tokens(TEXT, NUMERIC);
DROP FUNCTION IF EXISTS save_game_result(TEXT, TEXT, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS reset_hot_sell_session(TEXT);

-- ============================================================================
-- FUNCTION 1: Get Winners from a Hot Sell Session
-- ============================================================================
-- Returns the top 3 participants sorted by score
-- ============================================================================
CREATE OR REPLACE FUNCTION get_hot_sell_winners(session_id_param TEXT)
RETURNS TABLE (
    user_id TEXT,
    username TEXT,
    score NUMERIC,
    prize NUMERIC,
    rank INTEGER
) AS $$
DECLARE
    v_config_id TEXT;
    v_current_pot NUMERIC;
    v_first_percent NUMERIC;
    v_second_percent NUMERIC;
    v_third_percent NUMERIC;
    v_platform_fee_percent NUMERIC;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_max_participants INTEGER;
BEGIN
    -- Get session details
    SELECT 
        s.config_id,
        s.current_pot,
        c.max_participants
    INTO 
        v_config_id,
        v_current_pot,
        v_max_participants
    FROM public.hot_sell_sessions s
    LEFT JOIN public.hot_sell_configs c ON s.config_id = c.id
    WHERE s.id::text = session_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', session_id_param;
    END IF;
    
    -- Get prize percentages from config
    SELECT 
        COALESCE(first_place_percent, 50),
        COALESCE(second_place_percent, 20),
        COALESCE(third_place_percent, 15),
        COALESCE(platform_fee_percent, 15)
    INTO 
        v_first_percent,
        v_second_percent,
        v_third_percent,
        v_platform_fee_percent
    FROM public.hot_sell_configs
    WHERE id = v_config_id;
    
    -- Calculate prizes
    v_first_prize := v_current_pot * (v_first_percent / 100.0);
    v_second_prize := v_current_pot * (v_second_percent / 100.0);
    v_third_prize := v_current_pot * (v_third_percent / 100.0);
    
    -- Special case for 2-player games (no 3rd place)
    IF v_max_participants = 2 THEN
        v_third_prize := 0;
    END IF;
    
    RAISE NOTICE '💰 [Hot Sell Winners] Pot: %, Prizes: 1st=%, 2nd=%, 3rd=%', 
        v_current_pot, v_first_prize, v_second_prize, v_third_prize;
    
    -- Return top 3 participants with their prizes
    RETURN QUERY
    SELECT 
        p.user_id::text,
        COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
        COALESCE(p.score, 0) as score,
        CASE 
            WHEN ROW_NUMBER() OVER (ORDER BY p.score DESC) = 1 THEN v_first_prize
            WHEN ROW_NUMBER() OVER (ORDER BY p.score DESC) = 2 THEN v_second_prize
            WHEN ROW_NUMBER() OVER (ORDER BY p.score DESC) = 3 THEN v_third_prize
            ELSE 0
        END as prize,
        ROW_NUMBER() OVER (ORDER BY p.score DESC)::INTEGER as rank
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON p.user_id::text = u.id::text
    WHERE p.session_id::text = session_id_param
        AND p.score IS NOT NULL
        AND p.score > 0
    ORDER BY p.score DESC
    LIMIT 3;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 2: Pay User Tokens (WITH FULL TRANSACTION BACKUP)
-- ============================================================================
-- Adds tokens to a user's balance and records the transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION pay_user_tokens(
    user_id_param TEXT,
    amount_param NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_new_balance NUMERIC;
    v_username TEXT;
BEGIN
    RAISE NOTICE '💵 [Pay User] Paying % tokens to user %', amount_param, user_id_param;
    
    -- Update user balance
    UPDATE public.users
    SET 
        tokens = COALESCE(tokens, 0) + amount_param,
        total_earned = COALESCE(total_earned, 0) + amount_param,
        updated_at = NOW()
    WHERE id::text = user_id_param
    RETURNING tokens, COALESCE(username, email) INTO v_new_balance, v_username;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id_param;
    END IF;
    
    -- Record transaction in token_transactions table (BACKUP)
    INSERT INTO public.token_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        created_at
    ) VALUES (
        user_id_param,
        amount_param,
        'tournament_prize',
        'Hot Sell tournament prize',
        v_new_balance,
        NOW()
    );
    
    -- Record in purchase_history as earnings (BACKUP)
    INSERT INTO public.purchase_history (
        user_id,
        transaction_type,
        amount,
        description,
        created_at
    ) VALUES (
        user_id_param,
        'earnings',
        amount_param,
        'Hot Sell tournament prize',
        NOW()
    );
    
    RAISE NOTICE '✅ [Pay User] Paid % tokens to %. New balance: %', 
        amount_param, v_username, v_new_balance;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_id_param,
        'username', v_username,
        'amount_paid', amount_param,
        'new_balance', v_new_balance
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
-- FUNCTION 3: Save Game Result (WITH FULL HISTORY BACKUP)
-- ============================================================================
-- Records game result to game_history and user_game_history
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
    
    -- Save to game_history (BACKUP)
    INSERT INTO public.game_history (
        user_id,
        game_type,
        score,
        tokens_won,
        tournament_type,
        played_at,
        created_at
    ) VALUES (
        user_id_param,
        game_type_param,
        score_param,
        tokens_won_param,
        tournament_type_param,
        NOW(),
        NOW()
    );
    
    -- Save to user_game_history (BACKUP)
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
    
    -- Update user stats
    UPDATE public.users
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        games_won = COALESCE(games_won, 0) + CASE WHEN tokens_won_param > 0 THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id::text = user_id_param;
    
    RAISE NOTICE '✅ [Save Game] Saved result for %', v_username;
    
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

-- ============================================================================
-- FUNCTION 4: Reset Hot Sell Session
-- ============================================================================
-- Deletes the completed session and creates a fresh one
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_hot_sell_session(config_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    v_session_id TEXT;
    v_new_session_id TEXT;
    v_base_price NUMERIC;
    v_max_participants INTEGER;
BEGIN
    RAISE NOTICE '🔄 [Reset Session] Resetting session for config: %', config_id_param;
    
    -- Get the current session
    SELECT id::text INTO v_session_id
    FROM public.hot_sell_sessions
    WHERE config_id = config_id_param
        AND status != 'completed'
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RAISE NOTICE 'ℹ️ [Reset Session] No active session found for config: %', config_id_param;
    ELSE
        -- Delete participants first (due to foreign key)
        DELETE FROM public.hot_sell_participants
        WHERE session_id::text = v_session_id;
        
        RAISE NOTICE '✅ [Reset Session] Deleted participants for session: %', v_session_id;
        
        -- Delete the session
        DELETE FROM public.hot_sell_sessions
        WHERE id::text = v_session_id;
        
        RAISE NOTICE '✅ [Reset Session] Deleted session: %', v_session_id;
    END IF;
    
    -- Get config details
    SELECT base_price, max_participants
    INTO v_base_price, v_max_participants
    FROM public.hot_sell_configs
    WHERE id = config_id_param;
    
    -- Create a new session
    v_new_session_id := gen_random_uuid()::text;
    
    INSERT INTO public.hot_sell_sessions (
        id,
        config_id,
        current_pot,
        base_price,
        max_participants,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_new_session_id::uuid,
        config_id_param,
        0,
        v_base_price,
        v_max_participants,
        'waiting',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ [Reset Session] Created new session: %', v_new_session_id;
    
    RETURN json_build_object(
        'success', true,
        'old_session_id', v_session_id,
        'new_session_id', v_new_session_id,
        'config_id', config_id_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [Reset Session] Error: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Execute Permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_hot_sell_winners(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION pay_user_tokens(TEXT, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION save_game_result(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION reset_hot_sell_session(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ SIMPLE HOT SELL CLIENT-SIDE PAYOUT SYSTEM CREATED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Functions created:';
    RAISE NOTICE '✅   - get_hot_sell_winners(session_id)';
    RAISE NOTICE '✅   - pay_user_tokens(user_id, amount) [WITH BACKUP]';
    RAISE NOTICE '✅   - save_game_result(user_id, game_type, score, tokens, tournament) [WITH BACKUP]';
    RAISE NOTICE '✅   - reset_hot_sell_session(config_id)';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All transactions are backed up to:';
    RAISE NOTICE '✅   - token_transactions (for payment history)';
    RAISE NOTICE '✅   - purchase_history (for earnings tracking)';
    RAISE NOTICE '✅   - game_history (for game results)';
    RAISE NOTICE '✅   - user_game_history (for user stats)';
    RAISE NOTICE '✅ ============================================================';
END $$;

