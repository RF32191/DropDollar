-- ============================================================================
-- SIMPLE HOT SELL PAYOUT - Minimal SQL, Maximum Client Control
-- Break down the payout into simple, independent operations
-- ============================================================================

-- Function 1: Get winners (read-only, no updates)
DROP FUNCTION IF EXISTS public.get_hot_sell_winners(uuid);

CREATE OR REPLACE FUNCTION public.get_hot_sell_winners(session_id_param UUID)
RETURNS TABLE (
    rank INTEGER,
    user_id TEXT,
    username TEXT,
    score NUMERIC,
    prize NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session RECORD;
    v_config RECORD;
    v_total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
BEGIN
    -- Get session
    SELECT * INTO v_session FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Get config
    SELECT * INTO v_config FROM public.hot_sell_configs WHERE id = v_session.config_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Calculate prizes
    v_total_pot := COALESCE(v_session.current_pot, 0);
    v_platform_fee := v_total_pot * (v_config.platform_fee_percent / 100.0);
    v_first_prize := (v_total_pot - v_platform_fee) * (v_config.first_place_percent / 100.0);
    v_second_prize := (v_total_pot - v_platform_fee) * (v_config.second_place_percent / 100.0);
    v_third_prize := (v_total_pot - v_platform_fee) * (v_config.third_place_percent / 100.0);
    
    -- Return top 3 with their prizes
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY p.score DESC)::INTEGER as rank,
        p.user_id,
        COALESCE(u.username, u.email, 'Player') as username,
        p.score,
        CASE 
            WHEN ROW_NUMBER() OVER (ORDER BY p.score DESC) = 1 THEN v_first_prize
            WHEN ROW_NUMBER() OVER (ORDER BY p.score DESC) = 2 THEN v_second_prize
            WHEN ROW_NUMBER() OVER (ORDER BY p.score DESC) = 3 THEN v_third_prize
            ELSE 0::NUMERIC
        END as prize
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_id_param AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 3;
END;
$$;

-- Function 2: Pay a single user (simple update)
DROP FUNCTION IF EXISTS public.pay_user_tokens(text, numeric);

CREATE OR REPLACE FUNCTION public.pay_user_tokens(user_id_param TEXT, amount_param NUMERIC)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users 
    SET tokens = COALESCE(tokens, 0) + amount_param,
        updated_at = NOW()
    WHERE id::text = user_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function 3: Save game result (simple insert)
DROP FUNCTION IF EXISTS public.save_game_result(text, text, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.save_game_result(
    user_id_param TEXT,
    game_type_param TEXT,
    score_param NUMERIC,
    tokens_won_param NUMERIC,
    tournament_type_param TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
    VALUES (user_id_param, game_type_param, score_param, tokens_won_param, tournament_type_param, NOW());
    
    RETURN TRUE;
END;
$$;

-- Function 4: Reset session (simple delete and insert)
DROP FUNCTION IF EXISTS public.reset_hot_sell_session(text);

CREATE OR REPLACE FUNCTION public.reset_hot_sell_session(config_id_param TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session RECORD;
    v_config RECORD;
BEGIN
    -- Get active session
    SELECT * INTO v_session 
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Get config
    SELECT * INTO v_config FROM public.hot_sell_configs WHERE id = config_id_param;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Delete old data
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session.id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session.id;
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants,
        participants_count, status, created_at, updated_at
    ) VALUES (
        config_id_param, 0, v_config.base_price, v_config.max_participants,
        0, 'waiting', NOW(), NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_hot_sell_winners(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.pay_user_tokens(text, numeric) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_game_result(text, text, numeric, numeric, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reset_hot_sell_session(text) TO authenticated, anon, service_role;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SIMPLE HOT SELL PAYOUT CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 4 simple functions instead of 1 complex one';
    RAISE NOTICE '✅ Client handles the orchestration';
    RAISE NOTICE '✅ Each function does ONE simple thing';
    RAISE NOTICE '✅ No complex type comparisons';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usage from client:';
    RAISE NOTICE '1. Call get_hot_sell_winners(session_id)';
    RAISE NOTICE '2. For each winner: pay_user_tokens(user_id, prize)';
    RAISE NOTICE '3. For each winner: save_game_result(...)';
    RAISE NOTICE '4. Call reset_hot_sell_session(config_id)';
    RAISE NOTICE '5. Refresh page';
    RAISE NOTICE '========================================';
END $$;
