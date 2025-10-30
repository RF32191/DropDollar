-- ============================================================================
-- HOT SELL PAYOUT - RADICAL FIX
-- No joins, no UUID comparisons, pure sequential operations
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id_val uuid;
    config_id_val text;
    total_pot_val NUMERIC;
    platform_fee_percent_val NUMERIC;
    first_place_percent_val NUMERIC;
    second_place_percent_val NUMERIC;
    third_place_percent_val NUMERIC;
    max_participants_val INT;
    base_price_val NUMERIC;
    game_type_val text;
    
    platform_fee_amount NUMERIC;
    first_prize NUMERIC;
    second_prize NUMERIC;
    third_prize NUMERIC;
    
    winner1_user_id text;
    winner1_score NUMERIC;
    winner1_username text;
    
    winner2_user_id text;
    winner2_score NUMERIC;
    winner2_username text;
    
    winner3_user_id text;
    winner3_score NUMERIC;
    winner3_username text;
    
    participant_count INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 STARTING PAYOUT FOR: %', config_id_param;
    RAISE NOTICE '========================================';
    
    -- Step 1: Get config data WITHOUT joins
    SELECT 
        id, 
        platform_fee_percent, 
        first_place_percent, 
        second_place_percent, 
        third_place_percent,
        max_participants,
        base_price,
        game_type
    INTO 
        config_id_val,
        platform_fee_percent_val,
        first_place_percent_val,
        second_place_percent_val,
        third_place_percent_val,
        max_participants_val,
        base_price_val,
        game_type_val
    FROM public.hot_sell_configs 
    WHERE id = config_id_param;
    
    IF config_id_val IS NULL THEN
        RAISE NOTICE '❌ Config not found';
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    RAISE NOTICE '✅ Config found: %', game_type_val;
    
    -- Step 2: Get active session WITHOUT joins
    SELECT id, current_pot
    INTO session_id_val, total_pot_val
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param 
    AND status != 'completed'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF session_id_val IS NULL THEN
        RAISE NOTICE '❌ No active session';
        RETURN json_build_object('success', false, 'message', 'No active session');
    END IF;
    
    RAISE NOTICE '✅ Session found: %', session_id_val;
    RAISE NOTICE '💰 Total pot: %', total_pot_val;
    
    -- Step 3: Check participant count
    SELECT COUNT(*) INTO participant_count
    FROM public.hot_sell_participants
    WHERE session_id = session_id_val AND score IS NOT NULL;
    
    IF participant_count = 0 THEN
        RAISE NOTICE '❌ No participants with scores';
        RETURN json_build_object('success', false, 'message', 'No participants');
    END IF;
    
    RAISE NOTICE '✅ Participants with scores: %', participant_count;
    
    -- Step 4: Calculate prizes
    platform_fee_amount := total_pot_val * (platform_fee_percent_val / 100.0);
    first_prize := (total_pot_val - platform_fee_amount) * (first_place_percent_val / 100.0);
    second_prize := (total_pot_val - platform_fee_amount) * (second_place_percent_val / 100.0);
    third_prize := (total_pot_val - platform_fee_amount) * (third_place_percent_val / 100.0);
    
    RAISE NOTICE '💎 1st: %, 2nd: %, 3rd: %', first_prize, second_prize, third_prize;
    
    -- Step 5: Get 1st place (NO joins, pure participant data)
    SELECT user_id, score
    INTO winner1_user_id, winner1_score
    FROM public.hot_sell_participants
    WHERE session_id = session_id_val AND score IS NOT NULL
    ORDER BY score DESC
    LIMIT 1;
    
    -- Step 6: Get username separately (avoid join)
    IF winner1_user_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player')
        INTO winner1_username
        FROM public.users
        WHERE id::text = winner1_user_id OR id = winner1_user_id::uuid;
        
        IF winner1_username IS NULL THEN
            winner1_username := 'Player 1';
        END IF;
        
        RAISE NOTICE '🥇 First: % (Score: %)', winner1_username, winner1_score;
        
        -- Pay 1st place
        UPDATE public.users 
        SET tokens = tokens + first_prize 
        WHERE id::text = winner1_user_id OR id = winner1_user_id::uuid;
        
        -- Save to history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (winner1_user_id, game_type_val, winner1_score, first_prize, 'hot_sell', NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '💵 Paid 1st: % tokens', first_prize;
    END IF;
    
    -- Step 7: Get 2nd place
    SELECT user_id, score
    INTO winner2_user_id, winner2_score
    FROM public.hot_sell_participants
    WHERE session_id = session_id_val 
    AND score IS NOT NULL
    AND user_id != winner1_user_id
    ORDER BY score DESC
    LIMIT 1;
    
    IF winner2_user_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player')
        INTO winner2_username
        FROM public.users
        WHERE id::text = winner2_user_id OR id = winner2_user_id::uuid;
        
        IF winner2_username IS NULL THEN
            winner2_username := 'Player 2';
        END IF;
        
        RAISE NOTICE '🥈 Second: % (Score: %)', winner2_username, winner2_score;
        
        -- Pay 2nd place
        UPDATE public.users 
        SET tokens = tokens + second_prize 
        WHERE id::text = winner2_user_id OR id = winner2_user_id::uuid;
        
        -- Save to history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (winner2_user_id, game_type_val, winner2_score, second_prize, 'hot_sell', NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '💵 Paid 2nd: % tokens', second_prize;
    END IF;
    
    -- Step 8: Get 3rd place
    SELECT user_id, score
    INTO winner3_user_id, winner3_score
    FROM public.hot_sell_participants
    WHERE session_id = session_id_val 
    AND score IS NOT NULL
    AND user_id != winner1_user_id
    AND (winner2_user_id IS NULL OR user_id != winner2_user_id)
    ORDER BY score DESC
    LIMIT 1;
    
    IF winner3_user_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player')
        INTO winner3_username
        FROM public.users
        WHERE id::text = winner3_user_id OR id = winner3_user_id::uuid;
        
        IF winner3_username IS NULL THEN
            winner3_username := 'Player 3';
        END IF;
        
        RAISE NOTICE '🥉 Third: % (Score: %)', winner3_username, winner3_score;
        
        -- Pay 3rd place
        UPDATE public.users 
        SET tokens = tokens + third_prize 
        WHERE id::text = winner3_user_id OR id = winner3_user_id::uuid;
        
        -- Save to history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (winner3_user_id, game_type_val, winner3_score, third_prize, 'hot_sell', NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '💵 Paid 3rd: % tokens', third_prize;
    END IF;
    
    -- Step 9: Mark session completed (don't store user IDs)
    UPDATE public.hot_sell_sessions
    SET 
        status = 'completed',
        first_place_prize = first_prize,
        second_place_prize = COALESCE(second_prize, 0),
        third_place_prize = COALESCE(third_prize, 0),
        platform_fee = platform_fee_amount,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_id_val;
    
    RAISE NOTICE '✅ Session marked complete';
    
    -- Step 10: Clean up
    DELETE FROM public.hot_sell_participants WHERE session_id = session_id_val;
    DELETE FROM public.hot_sell_sessions WHERE id = session_id_val;
    
    RAISE NOTICE '🗑️ Old session deleted';
    
    -- Step 11: Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, status, created_at, updated_at
    )
    VALUES (
        config_id_param, 0, base_price_val, max_participants_val, 'waiting', NOW(), NOW()
    );
    
    RAISE NOTICE '✨ New session created';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 PAYOUT COMPLETE!';
    RAISE NOTICE '========================================';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful',
        'first_place_winner', COALESCE(winner1_username, 'N/A'),
        'first_place_amount', first_prize,
        'second_place_winner', COALESCE(winner2_username, 'N/A'),
        'second_place_amount', COALESCE(second_prize, 0),
        'third_place_winner', COALESCE(winner3_username, 'N/A'),
        'third_place_amount', COALESCE(third_prize, 0),
        'total_pot', total_pot_val,
        'platform_fee', platform_fee_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RADICAL HOT SELL PAYOUT CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ NO table joins';
    RAISE NOTICE '✅ Separate SELECT statements';
    RAISE NOTICE '✅ Dual UUID/TEXT comparisons in WHERE';
    RAISE NOTICE '✅ Detailed step-by-step logging';
    RAISE NOTICE '✅ Complete cleanup and reset';
    RAISE NOTICE '========================================';
END $$;

