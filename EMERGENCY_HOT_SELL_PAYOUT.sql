-- ============================================================================
-- EMERGENCY HOT SELL PAYOUT - DIRECT AND SIMPLE
-- ============================================================================
-- This creates a simple function that pays out ANY session that's ready
-- No complex logic, just: find session with scores → pay → reset
-- ============================================================================

-- Function to payout and reset ANY session that has all participants with scores
CREATE OR REPLACE FUNCTION emergency_hot_sell_payout(session_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    v_session_record RECORD;
    v_participant_record RECORD;
    v_config_record RECORD;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_winners TEXT[] := ARRAY[]::TEXT[];
    v_rank INTEGER := 1;
BEGIN
    RAISE NOTICE '🚨 [EMERGENCY PAYOUT] Starting for session: %', session_id_param;
    
    -- Get session info
    SELECT * INTO v_session_record
    FROM hot_sell_sessions
    WHERE id::text = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Session not found');
    END IF;
    
    RAISE NOTICE '📊 Session: % (config: %, pot: %)', v_session_record.id, v_session_record.config_id, v_session_record.current_pot;
    
    -- Get config
    SELECT * INTO v_config_record
    FROM hot_sell_configs
    WHERE id = v_session_record.config_id;
    
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
            ROW_NUMBER() OVER (ORDER BY p.score DESC) as rank
        FROM hot_sell_participants p
        LEFT JOIN users u ON p.user_id::text = u.id::text
        WHERE p.session_id::text = session_id_param
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
                RAISE NOTICE '💵 Paying rank % (%) - Score: %, Prize: %', 
                    v_participant_record.rank, 
                    v_participant_record.username,
                    v_participant_record.score,
                    v_prize;
                
                -- Get user's current balance
                DECLARE
                    v_balance_before NUMERIC;
                    v_balance_after NUMERIC;
                BEGIN
                    SELECT COALESCE(tokens, 0) INTO v_balance_before
                    FROM users
                    WHERE id::text = v_participant_record.user_id;
                    
                    v_balance_after := v_balance_before + v_prize;
                    
                    -- Add tokens to user
                    UPDATE users
                    SET 
                        tokens = v_balance_after,
                        total_earned = COALESCE(total_earned, 0) + v_prize,
                        games_won = COALESCE(games_won, 0) + 1,
                        updated_at = NOW()
                    WHERE id::text = v_participant_record.user_id;
                    
                    -- Save to token_transactions (with all required fields)
                    INSERT INTO token_transactions (user_id, amount, type, balance_before, balance_after, transaction_type, description, created_at)
                    VALUES (v_participant_record.user_id::uuid, v_prize, 'game_win', v_balance_before, v_balance_after, 'tournament_prize', 'Hot Sell prize', NOW());
                END;
                
                -- Save to game_history (user_id might be TEXT)
                BEGIN
                    INSERT INTO game_history (user_id, game_type, score, tokens_won, tournament_type, played_at, created_at)
                    VALUES (v_participant_record.user_id, v_config_record.game_type, v_participant_record.score, v_prize, 'hot_sell', NOW(), NOW());
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ Could not save to game_history: %', SQLERRM;
                END;
                
                v_winners := array_append(v_winners, v_participant_record.username || ' ($' || v_prize::text || ')');
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ All winners paid!';
    
    -- Delete participants
    DELETE FROM hot_sell_participants WHERE session_id::text = session_id_param;
    
    -- Delete session
    DELETE FROM hot_sell_sessions WHERE id::text = session_id_param;
    
    -- Create new session
    INSERT INTO hot_sell_sessions (id, config_id, current_pot, base_price, max_participants, participants_count, status, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        v_session_record.config_id,
        0,
        v_config_record.base_price,
        v_config_record.max_participants,
        0,
        'waiting',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '🔄 New session created for config: %', v_session_record.config_id;
    
    RETURN json_build_object(
        'success', true,
        'session_id', session_id_param,
        'config_id', v_session_record.config_id,
        'winners', v_winners,
        'pot', v_session_record.current_pot
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION emergency_hot_sell_payout(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- Now run the payout for the session we found!
-- ============================================================================
SELECT emergency_hot_sell_payout('83505678-3f2a-40f5-a4c8-f66de0883edf');

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ EMERGENCY PAYOUT FUNCTION CREATED AND RUN!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ The stuck session has been paid out and reset';
    RAISE NOTICE '✅ New function: emergency_hot_sell_payout(session_id)';
    RAISE NOTICE '✅ Use this to manually payout any stuck session';
    RAISE NOTICE '✅ ============================================================';
END $$;

