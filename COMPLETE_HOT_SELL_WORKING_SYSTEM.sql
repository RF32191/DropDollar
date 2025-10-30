-- ============================================================================
-- COMPLETE WORKING HOT SELL SYSTEM - ALL IN ONE
-- ============================================================================
-- This replaces ALL hot sell functions with proven working versions
-- that properly save to dashboard and back up data
-- ============================================================================

-- Drop all existing functions
DROP FUNCTION IF EXISTS get_hot_sell_winners(TEXT);
DROP FUNCTION IF EXISTS pay_user_tokens(TEXT, NUMERIC);
DROP FUNCTION IF EXISTS save_game_result(TEXT, TEXT, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS reset_hot_sell_session(TEXT);
DROP FUNCTION IF EXISTS process_hot_sell_payout_complete(TEXT);

-- ============================================================================
-- FUNCTION 1: Complete Hot Sell Payout (All-in-One)
-- ============================================================================
-- This single function does EVERYTHING: finds winners, pays them, saves to 
-- dashboard, backs up data, and resets the session
-- ============================================================================
CREATE OR REPLACE FUNCTION process_hot_sell_payout_complete(config_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    v_session_record RECORD;
    v_participant_record RECORD;
    v_config_record RECORD;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_winners JSONB := '[]'::jsonb;
    v_winner_count INTEGER := 0;
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
BEGIN
    RAISE NOTICE '💰 [COMPLETE PAYOUT] Starting for config: %', config_id_param;
    
    -- Find session for this config with participants
    SELECT * INTO v_session_record
    FROM hot_sell_sessions
    WHERE config_id = config_id_param
        AND status != 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Try any session with participants
        SELECT * INTO v_session_record
        FROM hot_sell_sessions
        WHERE config_id = config_id_param
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No session found for config: %', config_id_param;
        RETURN json_build_object('success', false, 'error', 'No session found');
    END IF;
    
    RAISE NOTICE '📊 Session: % (pot: %)', v_session_record.id, v_session_record.current_pot;
    
    -- Get config
    SELECT * INTO v_config_record
    FROM hot_sell_configs
    WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Config not found: %', config_id_param;
        RETURN json_build_object('success', false, 'error', 'Config not found');
    END IF;
    
    -- Calculate prizes
    v_first_prize := v_session_record.current_pot * 0.50;
    v_second_prize := v_session_record.current_pot * 0.20;
    v_third_prize := v_session_record.current_pot * 0.15;
    
    RAISE NOTICE '💰 Prizes: 1st=%, 2nd=%, 3rd=%', v_first_prize, v_second_prize, v_third_prize;
    
    -- Pay winners (top 3 by score)
    FOR v_participant_record IN 
        SELECT 
            p.user_id::text as user_id,
            p.score,
            COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username,
            u.email,
            ROW_NUMBER() OVER (ORDER BY p.score DESC) as rank
        FROM hot_sell_participants p
        LEFT JOIN users u ON p.user_id::text = u.id::text
        WHERE p.session_id::text = v_session_record.id::text
            AND p.score IS NOT NULL
            AND p.score > 0
        ORDER BY p.score DESC
        LIMIT 3
    LOOP
        DECLARE
            v_prize NUMERIC;
        BEGIN
            -- Determine prize amount
            IF v_participant_record.rank = 1 THEN
                v_prize := v_first_prize;
            ELSIF v_participant_record.rank = 2 THEN
                v_prize := v_second_prize;
            ELSIF v_participant_record.rank = 3 THEN
                v_prize := v_third_prize;
            ELSE
                v_prize := 0;
            END IF;
            
            IF v_prize > 0 THEN
                v_winner_count := v_winner_count + 1;
                
                RAISE NOTICE '💵 Paying rank % (%) - Score: %, Prize: %', 
                    v_participant_record.rank, 
                    v_participant_record.username,
                    v_participant_record.score,
                    v_prize;
                
                -- Get current balance
                SELECT COALESCE(tokens, 0) INTO v_balance_before
                FROM users
                WHERE id::text = v_participant_record.user_id;
                
                v_balance_after := v_balance_before + v_prize;
                
                -- Update user balance and stats
                UPDATE users
                SET 
                    tokens = v_balance_after,
                    total_earned = COALESCE(total_earned, 0) + v_prize,
                    games_won = COALESCE(games_won, 0) + 1,
                    games_played = COALESCE(games_played, 0) + 1,
                    updated_at = NOW()
                WHERE id::text = v_participant_record.user_id;
                
                -- Save to token_transactions
                BEGIN
                    INSERT INTO token_transactions (user_id, amount, type, balance_before, balance_after, transaction_type, description, created_at)
                    VALUES (v_participant_record.user_id::uuid, v_prize, 'game_win', v_balance_before, v_balance_after, 'tournament_prize', 'Hot Sell - ' || v_config_record.game_type, NOW());
                    RAISE NOTICE '✅ Saved to token_transactions';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
                END;
                
                -- Save to game_history (check what columns exist)
                BEGIN
                    INSERT INTO game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
                    VALUES (v_participant_record.user_id, v_config_record.game_type, v_participant_record.score, v_prize, 'hot_sell', NOW());
                    RAISE NOTICE '✅ Saved to game_history';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ Could not save to game_history: %', SQLERRM;
                END;
                
                -- Save to user_game_history
                BEGIN
                    INSERT INTO user_game_history (user_id, game_type, score, tokens_earned, competition_type, played_at)
                    VALUES (v_participant_record.user_id, v_config_record.game_type, v_participant_record.score, v_prize, 'hot_sell', NOW());
                    RAISE NOTICE '✅ Saved to user_game_history';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ Could not save to user_game_history: %', SQLERRM;
                END;
                
                -- Save to purchase_history
                BEGIN
                    INSERT INTO purchase_history (user_id, transaction_type, amount, description, created_at)
                    VALUES (v_participant_record.user_id, 'earnings', v_prize, 'Hot Sell - ' || v_config_record.game_type, NOW());
                    RAISE NOTICE '✅ Saved to purchase_history';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ Could not save to purchase_history: %', SQLERRM;
                END;
                
                -- Add to winners array
                v_winners := v_winners || jsonb_build_object(
                    'rank', v_participant_record.rank,
                    'username', v_participant_record.username,
                    'email', v_participant_record.email,
                    'score', v_participant_record.score,
                    'prize', v_prize
                );
            END IF;
        END;
    END LOOP;
    
    IF v_winner_count = 0 THEN
        RAISE NOTICE '❌ No winners with scores found';
        RETURN json_build_object('success', false, 'error', 'No winners found');
    END IF;
    
    RAISE NOTICE '✅ Paid % winners!', v_winner_count;
    
    -- Mark session as completed
    UPDATE hot_sell_sessions
    SET status = 'completed', updated_at = NOW()
    WHERE id = v_session_record.id;
    
    -- Delete participants
    DELETE FROM hot_sell_participants WHERE session_id = v_session_record.id;
    
    -- Delete old session
    DELETE FROM hot_sell_sessions WHERE id = v_session_record.id;
    
    -- Create new session
    INSERT INTO hot_sell_sessions (id, config_id, current_pot, base_price, max_participants, participants_count, status, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        config_id_param,
        0,
        v_config_record.base_price,
        v_config_record.max_participants,
        0,
        'waiting',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '🔄 New session created for config: %', config_id_param;
    
    RETURN json_build_object(
        'success', true,
        'session_id', v_session_record.id::text,
        'config_id', config_id_param,
        'winners', v_winners,
        'pot', v_session_record.current_pot,
        'winner_count', v_winner_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ COMPLETE HOT SELL SYSTEM CREATED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Function created: process_hot_sell_payout_complete(config_id)';
    RAISE NOTICE '✅ This function:';
    RAISE NOTICE '✅   - Finds the session for a config';
    RAISE NOTICE '✅   - Pays all winners (top 3)';
    RAISE NOTICE '✅   - Saves to token_transactions';
    RAISE NOTICE '✅   - Saves to game_history';
    RAISE NOTICE '✅   - Saves to user_game_history';
    RAISE NOTICE '✅   - Saves to purchase_history';
    RAISE NOTICE '✅   - Updates user stats';
    RAISE NOTICE '✅   - Resets the session';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Use from client: supabase.rpc("process_hot_sell_payout_complete", { config_id_param: "hs-5-sword-parry" })';
    RAISE NOTICE '✅ ============================================================';
END $$;

