-- ============================================================================
-- FINAL COMPLETE FIX - Drop policies, fix types, recreate everything
-- ============================================================================

-- Step 1: Drop ALL policies that depend on game_history.user_id
DROP POLICY IF EXISTS "users_view_own_games" ON public.game_history;
DROP POLICY IF EXISTS "Users can view their own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can view their own games" ON public.game_history;
DROP POLICY IF EXISTS "Public can view all games" ON public.game_history;
DROP POLICY IF EXISTS "Anyone can view game history" ON public.game_history;

-- Step 2: Convert game_history.user_id to TEXT
ALTER TABLE public.game_history 
ALTER COLUMN user_id TYPE TEXT;

-- Step 3: Recreate policies with TEXT comparison
CREATE POLICY "users_view_own_games"
ON public.game_history
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Public can view all games"
ON public.game_history
FOR SELECT
TO anon, authenticated
USING (true);

-- Step 4: Recreate the payout function (simplified, no game_history inserts for now to test)
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_current_pot NUMERIC;
    v_config_game_type TEXT;
    v_config_base_price NUMERIC;
    v_config_max_participants INTEGER;
    v_config_platform_fee_percent NUMERIC;
    v_config_first_place_percent NUMERIC;
    v_config_second_place_percent NUMERIC;
    v_config_third_place_percent NUMERIC;
    v_platform_fee NUMERIC;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_winner1_id UUID;
    v_winner1_score NUMERIC;
    v_winner1_name TEXT;
    v_winner2_id UUID;
    v_winner2_score NUMERIC;
    v_winner2_name TEXT;
    v_winner3_id UUID;
    v_winner3_score NUMERIC;
    v_winner3_name TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎯 PAYOUT START: %', config_id_param;
    
    SELECT game_type, base_price, max_participants, platform_fee_percent, 
           first_place_percent, second_place_percent, third_place_percent
    INTO v_config_game_type, v_config_base_price, v_config_max_participants,
         v_config_platform_fee_percent, v_config_first_place_percent,
         v_config_second_place_percent, v_config_third_place_percent
    FROM public.hot_sell_configs WHERE id = config_id_param;
    
    IF v_config_game_type IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    SELECT id, current_pot INTO v_session_id, v_current_pot
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'No active session');
    END IF;
    
    RAISE NOTICE '✅ Session: % | Pot: %', v_session_id, v_current_pot;
    
    v_platform_fee := v_current_pot * (v_config_platform_fee_percent / 100.0);
    v_first_prize := (v_current_pot - v_platform_fee) * (v_config_first_place_percent / 100.0);
    v_second_prize := (v_current_pot - v_platform_fee) * (v_config_second_place_percent / 100.0);
    v_third_prize := (v_current_pot - v_platform_fee) * (v_config_third_place_percent / 100.0);
    
    RAISE NOTICE '💰 Prizes: 1st=% | 2nd=% | 3rd=%', v_first_prize, v_second_prize, v_third_prize;
    
    -- Get winners
    SELECT user_id, score INTO v_winner1_id, v_winner1_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner1_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 1') INTO v_winner1_name FROM public.users WHERE id = v_winner1_id;
        UPDATE public.users SET tokens = tokens + v_first_prize WHERE id = v_winner1_id;
        RAISE NOTICE '🥇 Paid %: % tokens', v_winner1_name, v_first_prize;
        
        -- Save to game_history with TEXT user_id
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1_id::text, v_config_game_type, v_winner1_score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    SELECT user_id, score INTO v_winner2_id, v_winner2_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL AND user_id != v_winner1_id
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner2_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 2') INTO v_winner2_name FROM public.users WHERE id = v_winner2_id;
        UPDATE public.users SET tokens = tokens + v_second_prize WHERE id = v_winner2_id;
        RAISE NOTICE '🥈 Paid %: % tokens', v_winner2_name, v_second_prize;
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2_id::text, v_config_game_type, v_winner2_score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    SELECT user_id, score INTO v_winner3_id, v_winner3_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL 
    AND user_id != v_winner1_id AND (v_winner2_id IS NULL OR user_id != v_winner2_id)
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner3_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 3') INTO v_winner3_name FROM public.users WHERE id = v_winner3_id;
        UPDATE public.users SET tokens = tokens + v_third_prize WHERE id = v_winner3_id;
        RAISE NOTICE '🥉 Paid %: % tokens', v_winner3_name, v_third_prize;
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner3_id::text, v_config_game_type, v_winner3_score, v_third_prize, 'hot_sell', NOW());
    END IF;
    
    -- Mark completed
    UPDATE public.hot_sell_sessions
    SET status = 'completed', first_place_prize = v_first_prize,
        second_place_prize = v_second_prize, third_place_prize = v_third_prize,
        platform_fee = v_platform_fee, completed_at = NOW(), updated_at = NOW()
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ Session completed';
    
    -- Clean up
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session_id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session_id;
    
    RAISE NOTICE '🗑️ Deleted old session';
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, 
        participants_count, status, created_at, updated_at
    ) VALUES (
        config_id_param, 0, v_config_base_price, v_config_max_participants, 
        0, 'waiting', NOW(), NOW()
    );
    
    RAISE NOTICE '✨ New session created';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 PAYOUT COMPLETE!';
    RAISE NOTICE '========================================';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful',
        'first_place_winner', COALESCE(v_winner1_name, 'N/A'),
        'first_place_amount', v_first_prize,
        'second_place_winner', COALESCE(v_winner2_name, 'N/A'),
        'second_place_amount', v_second_prize,
        'third_place_winner', COALESCE(v_winner3_name, 'N/A'),
        'third_place_amount', v_third_prize,
        'total_pot', v_current_pot,
        'platform_fee', v_platform_fee
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FINAL COMPLETE FIX DONE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Dropped all game_history policies';
    RAISE NOTICE '✅ Converted game_history.user_id to TEXT';
    RAISE NOTICE '✅ Recreated policies with TEXT';
    RAISE NOTICE '✅ Payout function with ::text casting';
    RAISE NOTICE '✅ Ready to test!';
    RAISE NOTICE '========================================';
END $$;
