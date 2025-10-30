-- ============================================================================
-- WORKING HOT SELL PAYOUT - Based on Winner Takes All Model
-- Uses the exact same pattern that's proven to work
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_winner1 RECORD;
    v_winner2 RECORD;
    v_winner3 RECORD;
    v_config RECORD;
    v_total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_participant_count INTEGER;
BEGIN
    RAISE NOTICE '🎯 Starting payout for config: %', config_id_param;
    
    -- Get config
    SELECT * INTO v_config
    FROM public.hot_sell_configs
    WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Config not found';
        RETURN jsonb_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    RAISE NOTICE '✅ Config found: %', v_config.game_type;
    
    -- Get active session
    SELECT * INTO v_session
    FROM public.hot_sell_sessions
    WHERE config_id = config_id_param
    AND status != 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session';
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;
    
    RAISE NOTICE '✅ Session found: %', v_session.id;
    
    -- Check for scored participants
    SELECT COUNT(*) INTO v_participant_count
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id
    AND score IS NOT NULL;
    
    IF v_participant_count = 0 THEN
        RAISE NOTICE '❌ No participants with scores';
        RETURN jsonb_build_object('success', false, 'message', 'No participants with scores');
    END IF;
    
    RAISE NOTICE '✅ Found % scored participants', v_participant_count;
    
    -- Calculate prizes
    v_total_pot := COALESCE(v_session.current_pot, 0);
    v_platform_fee := v_total_pot * (v_config.platform_fee_percent / 100.0);
    v_first_prize := (v_total_pot - v_platform_fee) * (v_config.first_place_percent / 100.0);
    v_second_prize := (v_total_pot - v_platform_fee) * (v_config.second_place_percent / 100.0);
    v_third_prize := (v_total_pot - v_platform_fee) * (v_config.third_place_percent / 100.0);
    
    RAISE NOTICE '💰 Prizes calculated: 1st=%, 2nd=%, 3rd=%', v_first_prize, v_second_prize, v_third_prize;
    
    -- Get 1st place - DON'T use JOIN, do it in two steps like WTA
    SELECT *INTO v_winner1
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id
    AND score IS NOT NULL
    ORDER BY score DESC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '🥇 First place: user_id=%', v_winner1.user_id;
        
        -- Pay winner - match on TEXT
        UPDATE public.users
        SET tokens = COALESCE(tokens, 0) + v_first_prize,
            updated_at = NOW()
        WHERE id::text = v_winner1.user_id::text;
        
        RAISE NOTICE '💵 Paid first place: % tokens', v_first_prize;
        
        -- Save to history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1.user_id::text, v_config.game_type, v_winner1.score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 2nd place
    SELECT * INTO v_winner2
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id
    AND score IS NOT NULL
    AND id != v_winner1.id
    ORDER BY score DESC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '🥈 Second place: user_id=%', v_winner2.user_id;
        
        UPDATE public.users
        SET tokens = COALESCE(tokens, 0) + v_second_prize,
            updated_at = NOW()
        WHERE id::text = v_winner2.user_id::text;
        
        RAISE NOTICE '💵 Paid second place: % tokens', v_second_prize;
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2.user_id::text, v_config.game_type, v_winner2.score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 3rd place
    SELECT * INTO v_winner3
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id
    AND score IS NOT NULL
    AND id != v_winner1.id
    AND (v_winner2.id IS NULL OR id != v_winner2.id)
    ORDER BY score DESC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '🥉 Third place: user_id=%', v_winner3.user_id;
        
        UPDATE public.users
        SET tokens = COALESCE(tokens, 0) + v_third_prize,
            updated_at = NOW()
        WHERE id::text = v_winner3.user_id::text;
        
        RAISE NOTICE '💵 Paid third place: % tokens', v_third_prize;
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner3.user_id::text, v_config.game_type, v_winner3.score, v_third_prize, 'hot_sell', NOW());
    END IF;
    
    -- Mark session as completed
    UPDATE public.hot_sell_sessions
    SET status = 'completed',
        first_place_prize = v_first_prize,
        second_place_prize = COALESCE(v_second_prize, 0),
        third_place_prize = COALESCE(v_third_prize, 0),
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RAISE NOTICE '✅ Session marked as completed';
    
    -- Clean up old data
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session.id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session.id;
    
    RAISE NOTICE '🗑️ Old data deleted';
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants,
        participants_count, status, created_at, updated_at
    )
    VALUES (
        config_id_param, 0, v_config.base_price, v_config.max_participants,
        0, 'waiting', NOW(), NOW()
    );
    
    RAISE NOTICE '✨ New session created';
    RAISE NOTICE '🎉 PAYOUT COMPLETE!';
    
    -- Get usernames for response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'first_place_winner', (SELECT COALESCE(username, email, 'Player') FROM public.users WHERE id::text = v_winner1.user_id::text),
        'first_place_amount', v_first_prize,
        'second_place_winner', COALESCE((SELECT COALESCE(username, email) FROM public.users WHERE id::text = v_winner2.user_id::text), 'N/A'),
        'second_place_amount', COALESCE(v_second_prize, 0),
        'third_place_winner', COALESCE((SELECT COALESCE(username, email) FROM public.users WHERE id::text = v_winner3.user_id::text), 'N/A'),
        'third_place_amount', COALESCE(v_third_prize, 0),
        'total_pot', v_total_pot,
        'platform_fee', v_platform_fee
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon, service_role;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ WORKING HOT SELL PAYOUT CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Based on proven Winner Takes All model';
    RAISE NOTICE '✅ No JOINs on user_id';
    RAISE NOTICE '✅ Explicit ::text casting everywhere';
    RAISE NOTICE '✅ Compare by participant.id instead of user_id';
    RAISE NOTICE '========================================';
END $$;

