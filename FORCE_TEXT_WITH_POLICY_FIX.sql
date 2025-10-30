-- ============================================================================
-- HOT SELL PAYOUT - FORCE TEXT WITH POLICY HANDLING
-- Drop policies, convert to TEXT, recreate policies, then create function
-- ============================================================================

-- Step 1: Drop all policies on hot_sell_participants
DROP POLICY IF EXISTS "Users can join sessions" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can update their own scores" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view participants" ON public.hot_sell_participants;

-- Step 2: Convert user_id to TEXT
DO $$
BEGIN
    -- Check if column exists and is UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_sell_participants' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.hot_sell_participants 
        ALTER COLUMN user_id TYPE TEXT USING user_id::text;
        RAISE NOTICE '✅ Converted hot_sell_participants.user_id to TEXT';
    ELSE
        RAISE NOTICE '✅ hot_sell_participants.user_id is already TEXT';
    END IF;
END $$;

-- Step 3: Recreate policies with TEXT comparisons
CREATE POLICY "Users can join sessions"
ON public.hot_sell_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own participation"
ON public.hot_sell_participants
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Public can view participants"
ON public.hot_sell_participants
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can update their own scores"
ON public.hot_sell_participants
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Step 4: Create the payout function with pure TEXT
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id uuid;
    v_config record;
    v_total_pot numeric;
    v_platform_fee numeric;
    v_first_prize numeric;
    v_second_prize numeric;
    v_third_prize numeric;
    v_winner1 record;
    v_winner2 record;
    v_winner3 record;
    v_participant_count int;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎯 PAYOUT START: %', config_id_param;
    
    -- Get config
    SELECT * INTO v_config
    FROM public.hot_sell_configs 
    WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Config not found';
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    RAISE NOTICE '✅ Config: % (% players)', v_config.game_type, v_config.max_participants;
    
    -- Get session
    SELECT id, current_pot INTO v_session_id, v_total_pot
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param 
    AND status != 'completed'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RAISE NOTICE '❌ No active session';
        RETURN json_build_object('success', false, 'message', 'No active session');
    END IF;
    
    RAISE NOTICE '✅ Session: % | Pot: %', v_session_id, v_total_pot;
    
    -- Check participants
    SELECT COUNT(*) INTO v_participant_count
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL;
    
    IF v_participant_count = 0 THEN
        RAISE NOTICE '❌ No scored participants';
        RETURN json_build_object('success', false, 'message', 'No participants with scores');
    END IF;
    
    RAISE NOTICE '✅ Participants: %', v_participant_count;
    
    -- Calculate prizes
    v_platform_fee := v_total_pot * (v_config.platform_fee_percent / 100.0);
    v_first_prize := (v_total_pot - v_platform_fee) * (v_config.first_place_percent / 100.0);
    v_second_prize := (v_total_pot - v_platform_fee) * (v_config.second_place_percent / 100.0);
    v_third_prize := (v_total_pot - v_platform_fee) * (v_config.third_place_percent / 100.0);
    
    RAISE NOTICE '💰 Prizes: 1st=% | 2nd=% | 3rd=%', v_first_prize, v_second_prize, v_third_prize;
    
    -- Get 1st place (user_id is now TEXT, so comparison is TEXT to TEXT)
    SELECT 
        p.user_id as user_id_text,
        p.score,
        COALESCE(u.username, u.email, 'Player 1') as username
    INTO v_winner1
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id
    WHERE p.session_id = v_session_id AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1;
    
    IF v_winner1.user_id_text IS NOT NULL THEN
        RAISE NOTICE '🥇 1st: % (ID: %, Score: %)', v_winner1.username, v_winner1.user_id_text, v_winner1.score;
        
        -- Pay 1st place
        UPDATE public.users 
        SET tokens = tokens + v_first_prize 
        WHERE id::text = v_winner1.user_id_text;
        
        GET DIAGNOSTICS v_participant_count = ROW_COUNT;
        RAISE NOTICE '💵 Paid 1st place (% rows updated)', v_participant_count;
        
        -- Save to game history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1.user_id_text, v_config.game_type, v_winner1.score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 2nd place
    SELECT 
        p.user_id as user_id_text,
        p.score,
        COALESCE(u.username, u.email, 'Player 2') as username
    INTO v_winner2
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id
    WHERE p.session_id = v_session_id 
    AND p.score IS NOT NULL
    AND p.user_id != v_winner1.user_id_text
    ORDER BY p.score DESC
    LIMIT 1;
    
    IF v_winner2.user_id_text IS NOT NULL THEN
        RAISE NOTICE '🥈 2nd: % (Score: %)', v_winner2.username, v_winner2.score;
        
        UPDATE public.users 
        SET tokens = tokens + v_second_prize 
        WHERE id::text = v_winner2.user_id_text;
        
        RAISE NOTICE '💵 Paid 2nd place';
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2.user_id_text, v_config.game_type, v_winner2.score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 3rd place
    SELECT 
        p.user_id as user_id_text,
        p.score,
        COALESCE(u.username, u.email, 'Player 3') as username
    INTO v_winner3
    FROM public.hot_sell_participants p
    LEFT JOIN public.users u ON u.id::text = p.user_id
    WHERE p.session_id = v_session_id 
    AND p.score IS NOT NULL
    AND p.user_id != v_winner1.user_id_text
    AND (v_winner2.user_id_text IS NULL OR p.user_id != v_winner2.user_id_text)
    ORDER BY p.score DESC
    LIMIT 1;
    
    IF v_winner3.user_id_text IS NOT NULL THEN
        RAISE NOTICE '🥉 3rd: % (Score: %)', v_winner3.username, v_winner3.score;
        
        UPDATE public.users 
        SET tokens = tokens + v_third_prize 
        WHERE id::text = v_winner3.user_id_text;
        
        RAISE NOTICE '💵 Paid 3rd place';
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner3.user_id_text, v_config.game_type, v_winner3.score, v_third_prize, 'hot_sell', NOW());
    END IF;
    
    -- Mark session completed
    UPDATE public.hot_sell_sessions
    SET 
        status = 'completed',
        first_place_prize = v_first_prize,
        second_place_prize = COALESCE(v_second_prize, 0),
        third_place_prize = COALESCE(v_third_prize, 0),
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ Session marked completed';
    
    -- Delete old session and participants
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session_id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session_id;
    
    RAISE NOTICE '🗑️ Old session deleted';
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, status, created_at, updated_at
    )
    VALUES (
        config_id_param, 0, v_config.base_price, v_config.max_participants, 'waiting', NOW(), NOW()
    );
    
    RAISE NOTICE '✨ New session created';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 PAYOUT COMPLETE!';
    RAISE NOTICE '========================================';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful',
        'first_place_winner', COALESCE(v_winner1.username, 'N/A'),
        'first_place_amount', v_first_prize,
        'second_place_winner', COALESCE(v_winner2.username, 'N/A'),
        'second_place_amount', COALESCE(v_second_prize, 0),
        'third_place_winner', COALESCE(v_winner3.username, 'N/A'),
        'third_place_amount', COALESCE(v_third_prize, 0),
        'total_pot', v_total_pot,
        'platform_fee', v_platform_fee
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FORCE TEXT WITH POLICY FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Dropped old policies';
    RAISE NOTICE '✅ Converted user_id to TEXT';
    RAISE NOTICE '✅ Recreated policies with TEXT';
    RAISE NOTICE '✅ Created payout function';
    RAISE NOTICE '========================================';
END $$;

