-- ============================================================================
-- HOT SELL PAYOUT - COMPLETE UUID/TEXT FIX
-- Handles all possible type mismatches
-- ============================================================================

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
    first_user_id TEXT;
    second_user_id TEXT;
    third_user_id TEXT;
BEGIN
    RAISE NOTICE '🔍 Starting payout for config: %', config_id_param;
    
    -- Get config
    SELECT * INTO config_record 
    FROM public.hot_sell_configs 
    WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Config not found: %', config_id_param;
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
        RAISE NOTICE '❌ No active session found for config: %', config_id_param;
        RETURN json_build_object('success', false, 'message', 'No active session found');
    END IF;
    
    RAISE NOTICE '✅ Found session: %', session_record.id;
    
    -- Calculate prizes
    total_pot := session_record.current_pot;
    platform_fee_amount := total_pot * (config_record.platform_fee_percent / 100.0);
    
    first_prize := (total_pot - platform_fee_amount) * (config_record.first_place_percent / 100.0);
    second_prize := (total_pot - platform_fee_amount) * (config_record.second_place_percent / 100.0);
    third_prize := (total_pot - platform_fee_amount) * (config_record.third_place_percent / 100.0);
    
    RAISE NOTICE '💰 Prizes: 1st=%, 2nd=%, 3rd=%', first_prize, second_prize, third_prize;
    
    -- Get top 3 players (store user_id as TEXT to avoid type issues)
    SELECT 
        p.id,
        p.user_id::text as user_id_text,
        p.score,
        COALESCE(u.username, 'Player') as username
    INTO first_place_record
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON (
        CASE 
            WHEN p.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN u.id::text = p.user_id::text
            ELSE u.id::text = p.user_id::text
        END
    )
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    ORDER BY p.score DESC 
    LIMIT 1;
    
    first_user_id := first_place_record.user_id_text;
    RAISE NOTICE '🥇 First place: % (ID: %)', first_place_record.username, first_user_id;
    
    -- Second place
    SELECT 
        p.id,
        p.user_id::text as user_id_text,
        p.score,
        COALESCE(u.username, 'Player') as username
    INTO second_place_record
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    AND p.id != first_place_record.id
    ORDER BY p.score DESC 
    LIMIT 1;
    
    second_user_id := CASE WHEN second_place_record.user_id_text IS NOT NULL THEN second_place_record.user_id_text ELSE NULL END;
    IF second_user_id IS NOT NULL THEN
        RAISE NOTICE '🥈 Second place: % (ID: %)', second_place_record.username, second_user_id;
    END IF;
    
    -- Third place
    SELECT 
        p.id,
        p.user_id::text as user_id_text,
        p.score,
        COALESCE(u.username, 'Player') as username
    INTO third_place_record
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id::text
    WHERE p.session_id = session_record.id 
    AND p.score IS NOT NULL
    AND p.id != first_place_record.id
    AND (second_place_record.id IS NULL OR p.id != second_place_record.id)
    ORDER BY p.score DESC 
    LIMIT 1;
    
    third_user_id := CASE WHEN third_place_record.user_id_text IS NOT NULL THEN third_place_record.user_id_text ELSE NULL END;
    IF third_user_id IS NOT NULL THEN
        RAISE NOTICE '🥉 Third place: % (ID: %)', third_place_record.username, third_user_id;
    END IF;
    
    -- Pay winners (all comparisons as TEXT)
    IF first_user_id IS NOT NULL THEN
        UPDATE public.users 
        SET tokens = tokens + first_prize 
        WHERE id::text = first_user_id;
        RAISE NOTICE '💵 Paid first place: % tokens', first_prize;
    END IF;
    
    IF second_user_id IS NOT NULL THEN
        UPDATE public.users 
        SET tokens = tokens + second_prize 
        WHERE id::text = second_user_id;
        RAISE NOTICE '💵 Paid second place: % tokens', second_prize;
    END IF;
    
    IF third_user_id IS NOT NULL THEN
        UPDATE public.users 
        SET tokens = tokens + third_prize 
        WHERE id::text = third_user_id;
        RAISE NOTICE '💵 Paid third place: % tokens', third_prize;
    END IF;
    
    -- Mark session as completed (convert TEXT to UUID for storage)
    UPDATE public.hot_sell_sessions
    SET 
        status = 'completed',
        first_place_user_id = CASE 
            WHEN first_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN first_user_id::uuid 
            ELSE NULL 
        END,
        second_place_user_id = CASE 
            WHEN second_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN second_user_id::uuid 
            ELSE NULL 
        END,
        third_place_user_id = CASE 
            WHEN third_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN third_user_id::uuid 
            ELSE NULL 
        END,
        first_place_prize = first_prize,
        second_place_prize = COALESCE(second_prize, 0),
        third_place_prize = COALESCE(third_prize, 0),
        platform_fee = platform_fee_amount,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;
    
    RAISE NOTICE '✅ Session marked as completed';
    
    -- Save to analytics
    INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
    SELECT 
        p.user_id::text,
        config_record.game_type,
        p.score,
        CASE 
            WHEN p.user_id::text = first_user_id THEN first_prize
            WHEN p.user_id::text = COALESCE(second_user_id, '') THEN second_prize
            WHEN p.user_id::text = COALESCE(third_user_id, '') THEN third_prize
            ELSE 0
        END,
        'hot_sell',
        NOW()
    FROM public.hot_sell_participants p
    WHERE p.session_id = session_record.id AND p.score IS NOT NULL;
    
    RAISE NOTICE '✅ Saved to analytics';
    
    -- Create new session IMMEDIATELY
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, status, created_at, updated_at
    )
    SELECT 
        config_id_param, 0, config_record.base_price, config_record.max_participants, 'waiting', NOW(), NOW();
    
    RAISE NOTICE '✅ New session created';
    RAISE NOTICE '🎉 PAYOUT COMPLETE!';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful and listing reset',
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

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOT SELL PAYOUT COMPLETELY FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ All TEXT comparisons';
    RAISE NOTICE '✅ UUID validation before storage';
    RAISE NOTICE '✅ Detailed logging for debugging';
    RAISE NOTICE '✅ Payout + Reset in one transaction';
    RAISE NOTICE '========================================';
END $$;
