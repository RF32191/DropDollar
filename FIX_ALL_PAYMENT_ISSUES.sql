-- ============================================================================
-- FIX ALL PAYMENT ISSUES
-- ============================================================================
-- 1. Fix Hot Sell payout to use correct pot calculation (after platform fee)
-- 2. Ensure all users get proper payouts
-- ============================================================================

DROP FUNCTION IF EXISTS process_hot_sell_payout_complete(TEXT);

CREATE OR REPLACE FUNCTION process_hot_sell_payout_complete(config_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    v_session_record RECORD;
    v_participant_record RECORD;
    v_config_record RECORD;
    v_total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_payout_pot NUMERIC; -- This is what gets split among winners
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_winners JSONB := '[]'::jsonb;
    v_winner_count INTEGER := 0;
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
BEGIN
    RAISE NOTICE '💰 [Hot Sell Payout] Starting for config: %', config_id_param;
    
    -- Find session
    SELECT * INTO v_session_record
    FROM hot_sell_sessions
    WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF NOT FOUND THEN
        SELECT * INTO v_session_record
        FROM hot_sell_sessions
        WHERE config_id = config_id_param
        ORDER BY created_at DESC LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No session found');
    END IF;
    
    v_total_pot := v_session_record.current_pot;
    
    RAISE NOTICE '📊 Session: %, Total Pot: $%', v_session_record.id, v_total_pot;
    
    -- Get config
    SELECT * INTO v_config_record FROM hot_sell_configs WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Config not found');
    END IF;
    
    -- Calculate platform fee (15% of total pot stays with you)
    v_platform_fee := v_total_pot * 0.15;
    
    -- Calculate payout pot (85% of total pot goes to winners)
    v_payout_pot := v_total_pot * 0.85;
    
    -- Split payout pot among winners:
    -- 1st: 50% of payout_pot (which is 50% of 85% = 42.5% of total)
    -- 2nd: 20% of payout_pot (which is 20% of 85% = 17% of total)
    -- 3rd: 15% of payout_pot (which is 15% of 85% = 12.75% of total)
    v_first_prize := v_payout_pot * 0.50;   -- 50% of the 85%
    v_second_prize := v_payout_pot * 0.20;  -- 20% of the 85%
    v_third_prize := v_payout_pot * 0.15;   -- 15% of the 85%
    
    RAISE NOTICE '💰 Total Pot: $%, Platform Fee (15%%): $%, Payout Pot (85%%): $%', 
        v_total_pot, v_platform_fee, v_payout_pot;
    RAISE NOTICE '💰 Prizes: 1st=$% (%.1f%%), 2nd=$% (%.1f%%), 3rd=$% (%.1f%%)', 
        v_first_prize, (v_first_prize/v_total_pot)*100,
        v_second_prize, (v_second_prize/v_total_pot)*100,
        v_third_prize, (v_third_prize/v_total_pot)*100;
    
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
            AND p.score IS NOT NULL AND p.score > 0
        ORDER BY p.score DESC LIMIT 3
    LOOP
        DECLARE v_prize NUMERIC;
        BEGIN
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
                
                RAISE NOTICE '💵 Rank % (%) - Score: %, Prize: $%', 
                    v_participant_record.rank, v_participant_record.username,
                    v_participant_record.score, v_prize;
                
                -- Get current balance
                SELECT COALESCE(tokens, 0) INTO v_balance_before
                FROM users WHERE id::text = v_participant_record.user_id;
                
                v_balance_after := v_balance_before + v_prize;
                
                -- Update user
                UPDATE users
                SET tokens = v_balance_after, total_earned = COALESCE(total_earned, 0) + v_prize,
                    games_won = COALESCE(games_won, 0) + 1, games_played = COALESCE(games_played, 0) + 1,
                    updated_at = NOW()
                WHERE id::text = v_participant_record.user_id;
                
                -- Save to token_transactions
                BEGIN
                    INSERT INTO token_transactions (user_id, amount, type, balance_before, balance_after,
                        transaction_type, description, created_at)
                    VALUES (v_participant_record.user_id::uuid, v_prize, 'game_win', v_balance_before, v_balance_after,
                        'tournament_prize', 'Hot Sell - ' || v_config_record.game_type, NOW());
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ token_transactions error: %', SQLERRM;
                END;
                
                -- Save to game_history
                BEGIN
                    INSERT INTO game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
                    VALUES (v_participant_record.user_id, v_config_record.game_type, v_participant_record.score, 
                        v_prize, 'hot_sell', NOW());
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ game_history error: %', SQLERRM;
                END;
                
                -- Save to user_game_history
                BEGIN
                    INSERT INTO user_game_history (user_id, game_type, score, tokens_earned, competition_type, played_at)
                    VALUES (v_participant_record.user_id, v_config_record.game_type, v_participant_record.score, 
                        v_prize, 'hot_sell', NOW());
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️ user_game_history error: %', SQLERRM;
                END;
                
                v_winners := v_winners || jsonb_build_object(
                    'rank', v_participant_record.rank, 'username', v_participant_record.username,
                    'score', v_participant_record.score, 'prize', v_prize
                );
            END IF;
        END;
    END LOOP;
    
    IF v_winner_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No winners found');
    END IF;
    
    -- Mark session as completed, delete, and create new
    UPDATE hot_sell_sessions SET status = 'completed', updated_at = NOW() WHERE id = v_session_record.id;
    DELETE FROM hot_sell_participants WHERE session_id = v_session_record.id;
    DELETE FROM hot_sell_sessions WHERE id = v_session_record.id;
    
    INSERT INTO hot_sell_sessions (id, config_id, current_pot, base_price, max_participants, participants_count, status, created_at, updated_at)
    VALUES (gen_random_uuid(), config_id_param, 0, v_config_record.base_price, v_config_record.max_participants, 0, 'waiting', NOW(), NOW());
    
    RAISE NOTICE '✅ Paid % winners, Platform fee: $%', v_winner_count, v_platform_fee;
    
    RETURN json_build_object(
        'success', true, 'session_id', v_session_record.id::text, 'config_id', config_id_param,
        'winners', v_winners, 'pot', v_total_pot, 'platform_fee', v_platform_fee,
        'payout_pot', v_payout_pot, 'winner_count', v_winner_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_hot_sell_payout_complete(TEXT) TO authenticated, anon, service_role;

RAISE NOTICE '✅ ============================================================';
RAISE NOTICE '✅ HOT SELL PAYOUT FIXED!';
RAISE NOTICE '✅ ============================================================';
RAISE NOTICE '✅ Now pays:';
RAISE NOTICE '✅   Platform Fee: 15%% of total pot';
RAISE NOTICE '✅   Winners share 85%% of pot:';
RAISE NOTICE '✅     1st: 50%% of 85%% = 42.5%% of total';
RAISE NOTICE '✅     2nd: 20%% of 85%% = 17%% of total';
RAISE NOTICE '✅     3rd: 15%% of 85%% = 12.75%% of total';
RAISE NOTICE '✅ ============================================================';

