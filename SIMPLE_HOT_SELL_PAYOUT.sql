-- ============================================================================
-- HOT SELL PAYOUT - SIMPLE TEXT-ONLY METHOD
-- No UUID conversions, pure TEXT handling
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner1 RECORD;
    winner2 RECORD;
    winner3 RECORD;
    total_pot NUMERIC;
    platform_fee_amount NUMERIC;
    first_prize NUMERIC;
    second_prize NUMERIC;
    third_prize NUMERIC;
    config_record RECORD;
    participant_count INT;
BEGIN
    RAISE NOTICE '🔍 Starting payout for config: %', config_id_param;
    
    -- Get config
    SELECT * INTO config_record 
    FROM public.hot_sell_configs 
    WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Get active session
    SELECT * INTO session_record 
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param 
    AND status = 'waiting'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No active session');
    END IF;
    
    -- Check if all participants have played
    SELECT COUNT(*) INTO participant_count
    FROM public.hot_sell_participants
    WHERE session_id = session_record.id AND score IS NOT NULL;
    
    IF participant_count = 0 THEN
        RETURN json_build_object('success', false, 'message', 'No participants with scores');
    END IF;
    
    -- Calculate prizes
    total_pot := session_record.current_pot;
    platform_fee_amount := total_pot * (config_record.platform_fee_percent / 100.0);
    
    first_prize := (total_pot - platform_fee_amount) * (config_record.first_place_percent / 100.0);
    second_prize := (total_pot - platform_fee_amount) * (config_record.second_place_percent / 100.0);
    third_prize := (total_pot - platform_fee_amount) * (config_record.third_place_percent / 100.0);
    
    RAISE NOTICE '💰 Prizes: 1st=%, 2nd=%, 3rd=%', first_prize, second_prize, third_prize;
    
    -- Get 1st place
    SELECT 
        p.user_id::text as user_id,
        p.score,
        COALESCE(u.username, 'Player') as username
    INTO winner1
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    ORDER BY p.score DESC 
    LIMIT 1;
    
    IF winner1.user_id IS NOT NULL THEN
        -- Pay 1st place
        UPDATE public.users 
        SET tokens = tokens + first_prize 
        WHERE id::text = winner1.user_id;
        
        RAISE NOTICE '🥇 Paid %: % tokens', winner1.username, first_prize;
        
        -- Save to game history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (winner1.user_id, config_record.game_type, winner1.score, first_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 2nd place
    SELECT 
        p.user_id::text as user_id,
        p.score,
        COALESCE(u.username, 'Player') as username
    INTO winner2
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    AND p.user_id::text != winner1.user_id
    ORDER BY p.score DESC 
    LIMIT 1;
    
    IF winner2.user_id IS NOT NULL THEN
        -- Pay 2nd place
        UPDATE public.users 
        SET tokens = tokens + second_prize 
        WHERE id::text = winner2.user_id;
        
        RAISE NOTICE '🥈 Paid %: % tokens', winner2.username, second_prize;
        
        -- Save to game history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (winner2.user_id, config_record.game_type, winner2.score, second_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 3rd place
    SELECT 
        p.user_id::text as user_id,
        p.score,
        COALESCE(u.username, 'Player') as username
    INTO winner3
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    AND p.user_id::text != winner1.user_id
    AND (winner2.user_id IS NULL OR p.user_id::text != winner2.user_id)
    ORDER BY p.score DESC 
    LIMIT 1;
    
    IF winner3.user_id IS NOT NULL THEN
        -- Pay 3rd place
        UPDATE public.users 
        SET tokens = tokens + third_prize 
        WHERE id::text = winner3.user_id;
        
        RAISE NOTICE '🥉 Paid %: % tokens', winner3.username, third_prize;
        
        -- Save to game history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (winner3.user_id, config_record.game_type, winner3.score, third_prize, 'hot_sell', NOW());
    END IF;
    
    -- Mark session as completed (don't store user IDs, just status)
    UPDATE public.hot_sell_sessions
    SET 
        status = 'completed',
        first_place_prize = first_prize,
        second_place_prize = COALESCE(second_prize, 0),
        third_place_prize = COALESCE(third_prize, 0),
        platform_fee = platform_fee_amount,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;
    
    RAISE NOTICE '✅ Session marked as completed';
    
    -- Delete old session and participants (complete cleanup)
    DELETE FROM public.hot_sell_participants WHERE session_id = session_record.id;
    DELETE FROM public.hot_sell_sessions WHERE id = session_record.id;
    
    RAISE NOTICE '🗑️ Old session deleted';
    
    -- Create new fresh session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, status, created_at, updated_at
    )
    VALUES (
        config_id_param, 0, config_record.base_price, config_record.max_participants, 'waiting', NOW(), NOW()
    );
    
    RAISE NOTICE '✨ New session created';
    RAISE NOTICE '🎉 PAYOUT COMPLETE!';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful and listing reset',
        'first_place_winner', winner1.username,
        'first_place_amount', first_prize,
        'second_place_winner', COALESCE(winner2.username, 'N/A'),
        'second_place_amount', COALESCE(second_prize, 0),
        'third_place_winner', COALESCE(winner3.username, 'N/A'),
        'third_place_amount', COALESCE(third_prize, 0),
        'total_pot', total_pot,
        'platform_fee', platform_fee_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SIMPLE HOT SELL PAYOUT CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Pure TEXT handling (no UUID issues)';
    RAISE NOTICE '✅ Pays winners to wallet';
    RAISE NOTICE '✅ Saves to game history/analytics';
    RAISE NOTICE '✅ Deletes old session completely';
    RAISE NOTICE '✅ Creates new fresh session';
    RAISE NOTICE '========================================';
END $$;
