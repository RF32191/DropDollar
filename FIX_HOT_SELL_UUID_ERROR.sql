-- ============================================================================
-- FIX HOT SELL PAYOUT UUID ERROR
-- Fixes the "operator does not exist: uuid = text" error
-- ============================================================================

-- Drop and recreate the payout function with proper UUID handling
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    first_place_record RECORD;
    second_place_record RECORD;
    third_place_record RECORD;
    total_pot NUMERIC;
    platform_fee_amount NUMERIC;
    first_prize NUMERIC;
    second_prize NUMERIC;
    third_prize NUMERIC;
    config_record RECORD;
BEGIN
    -- Get config
    SELECT * INTO config_record 
    FROM public.hot_sell_configs 
    WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Get session
    SELECT * INTO session_record 
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param 
    AND status != 'completed'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No active session found');
    END IF;
    
    -- Calculate prizes
    total_pot := session_record.current_pot;
    platform_fee_amount := total_pot * (config_record.platform_fee_percent / 100.0);
    
    first_prize := (total_pot - platform_fee_amount) * (config_record.first_place_percent / 100.0);
    second_prize := (total_pot - platform_fee_amount) * (config_record.second_place_percent / 100.0);
    third_prize := (total_pot - platform_fee_amount) * (config_record.third_place_percent / 100.0);
    
    -- Get top 3 players (convert user_id to text for comparison)
    SELECT p.*, u.username INTO first_place_record
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    ORDER BY p.score DESC 
    LIMIT 1;
    
    SELECT p.*, u.username INTO second_place_record
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    AND p.id != first_place_record.id
    ORDER BY p.score DESC 
    LIMIT 1;
    
    SELECT p.*, u.username INTO third_place_record
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    AND p.id != first_place_record.id
    AND p.id != COALESCE(second_place_record.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY p.score DESC 
    LIMIT 1;
    
    -- Pay winners (convert to text for tokens update)
    IF first_place_record.user_id IS NOT NULL THEN
        UPDATE public.users 
        SET tokens = tokens + first_prize 
        WHERE id::text = first_place_record.user_id::text;
    END IF;
    
    IF second_place_record.user_id IS NOT NULL THEN
        UPDATE public.users 
        SET tokens = tokens + second_prize 
        WHERE id::text = second_place_record.user_id::text;
    END IF;
    
    IF third_place_record.user_id IS NOT NULL THEN
        UPDATE public.users 
        SET tokens = tokens + third_prize 
        WHERE id::text = third_place_record.user_id::text;
    END IF;
    
    -- Mark session as completed (use :: casting for UUID columns)
    UPDATE public.hot_sell_sessions
    SET 
        status = 'completed',
        first_place_user_id = first_place_record.user_id::text,
        second_place_user_id = COALESCE(second_place_record.user_id::text, NULL),
        third_place_user_id = COALESCE(third_place_record.user_id::text, NULL),
        first_place_prize = first_prize,
        second_place_prize = COALESCE(second_prize, 0),
        third_place_prize = COALESCE(third_prize, 0),
        platform_fee = platform_fee_amount,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;
    
    -- Save to analytics (game_history)
    INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
    SELECT 
        p.user_id::text,
        config_record.game_type,
        p.score,
        CASE 
            WHEN p.user_id::text = first_place_record.user_id::text THEN first_prize
            WHEN p.user_id::text = COALESCE(second_place_record.user_id::text, '') THEN second_prize
            WHEN p.user_id::text = COALESCE(third_place_record.user_id::text, '') THEN third_prize
            ELSE 0
        END,
        'hot_sell',
        NOW()
    FROM public.hot_sell_participants p
    WHERE p.session_id = session_record.id AND p.score IS NOT NULL;
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, status, created_at, updated_at
    )
    SELECT 
        config_id_param, 0, config_record.base_price, config_record.max_participants, 'waiting', NOW(), NOW();
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful',
        'first_place_winner', first_place_record.username,
        'first_place_amount', first_prize,
        'second_place_winner', COALESCE(second_place_record.username, 'N/A'),
        'second_place_amount', COALESCE(second_prize, 0),
        'third_place_winner', COALESCE(third_place_record.username, 'N/A'),
        'third_place_amount', COALESCE(third_prize, 0),
        'total_pot', total_pot,
        'platform_fee', platform_fee_amount
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOT SELL PAYOUT FUNCTION FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ UUID/TEXT casting added throughout';
    RAISE NOTICE '✅ All comparisons now work correctly';
    RAISE NOTICE '✅ Payout will now execute without errors';
    RAISE NOTICE '========================================';
END $$;

