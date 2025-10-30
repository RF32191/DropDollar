-- ============================================================================
-- FIX HOT SELL SCHEMA AND FUNCTIONS
-- Add missing columns and fix all functions
-- ============================================================================

-- Step 1: Add missing columns to hot_sell_sessions if they don't exist
ALTER TABLE public.hot_sell_sessions 
ADD COLUMN IF NOT EXISTS participants_count INTEGER DEFAULT 0;

ALTER TABLE public.hot_sell_sessions 
ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;

-- Step 2: Update participants_count for existing sessions
UPDATE public.hot_sell_sessions s
SET participants_count = (
    SELECT COUNT(*) FROM public.hot_sell_participants p 
    WHERE p.session_id = s.id
);

-- Step 3: Recreate join function with proper variables
DROP FUNCTION IF EXISTS public.join_hot_sell_session(uuid, uuid, numeric);

CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
    session_id_param UUID, 
    user_id_param UUID, 
    entry_fee_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_config_id TEXT;
    v_max_participants INTEGER;
    v_current_pot NUMERIC;
    v_status TEXT;
    v_user_tokens NUMERIC;
    v_new_pot NUMERIC;
    v_participant_count INTEGER;
    v_already_joined BOOLEAN;
BEGIN
    -- Get session details
    SELECT 
        id, config_id, max_participants, current_pot, status
    INTO 
        v_session_id, v_config_id, v_max_participants, v_current_pot, v_status
    FROM public.hot_sell_sessions 
    WHERE id = session_id_param;
    
    IF v_session_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Get user tokens
    SELECT tokens INTO v_user_tokens 
    FROM public.users 
    WHERE id = user_id_param;
    
    IF v_user_tokens IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Count current participants
    SELECT COUNT(*) INTO v_participant_count 
    FROM public.hot_sell_participants 
    WHERE session_id = session_id_param;
    
    -- Check if full
    IF v_participant_count >= v_max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;
    
    -- Check if already joined
    SELECT EXISTS (
        SELECT 1 FROM public.hot_sell_participants 
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) INTO v_already_joined;
    
    IF v_already_joined THEN
        RETURN json_build_object('success', false, 'message', 'Already joined this session');
    END IF;
    
    -- Check tokens
    IF v_user_tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens from user
    UPDATE public.users 
    SET tokens = tokens - entry_fee_param 
    WHERE id = user_id_param;
    
    -- Calculate new pot
    v_new_pot := v_current_pot + entry_fee_param;
    
    -- Update session
    UPDATE public.hot_sell_sessions 
    SET 
        current_pot = v_new_pot,
        participants_count = v_participant_count + 1,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Add participant
    INSERT INTO public.hot_sell_participants (
        session_id, user_id, entry_fee, joined_at
    ) VALUES (
        session_id_param, user_id_param, entry_fee_param, NOW()
    );
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Joined successfully',
        'new_pot', v_new_pot,
        'participants_count', v_participant_count + 1
    );
END;
$$;

-- Step 4: Recreate update score function
DROP FUNCTION IF EXISTS public.update_hot_sell_score(uuid, uuid, numeric, numeric);

CREATE OR REPLACE FUNCTION public.update_hot_sell_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_exists BOOLEAN;
BEGIN
    -- Check if participant exists
    SELECT EXISTS (
        SELECT 1 FROM public.hot_sell_participants 
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) INTO v_participant_exists;
    
    IF NOT v_participant_exists THEN
        RETURN json_build_object('success', false, 'message', 'Not a participant in this session');
    END IF;
    
    -- Update score
    UPDATE public.hot_sell_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Score updated successfully',
        'score', score_param,
        'accuracy', accuracy_param
    );
END;
$$;

-- Step 5: Recreate payout function with NO JOINs
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
    -- Get config
    SELECT 
        game_type, base_price, max_participants, 
        platform_fee_percent, first_place_percent, 
        second_place_percent, third_place_percent
    INTO 
        v_config_game_type, v_config_base_price, v_config_max_participants,
        v_config_platform_fee_percent, v_config_first_place_percent,
        v_config_second_place_percent, v_config_third_place_percent
    FROM public.hot_sell_configs 
    WHERE id = config_id_param;
    
    IF v_config_game_type IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Get active session
    SELECT id, current_pot INTO v_session_id, v_current_pot
    FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'No active session');
    END IF;
    
    -- Calculate prizes
    v_platform_fee := v_current_pot * (v_config_platform_fee_percent / 100.0);
    v_first_prize := (v_current_pot - v_platform_fee) * (v_config_first_place_percent / 100.0);
    v_second_prize := (v_current_pot - v_platform_fee) * (v_config_second_place_percent / 100.0);
    v_third_prize := (v_current_pot - v_platform_fee) * (v_config_third_place_percent / 100.0);
    
    -- Get 1st place
    SELECT user_id, score INTO v_winner1_id, v_winner1_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner1_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 1') INTO v_winner1_name
        FROM public.users WHERE id = v_winner1_id;
        
        UPDATE public.users SET tokens = tokens + v_first_prize WHERE id = v_winner1_id;
        
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1_id::text, v_config_game_type, v_winner1_score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 2nd place
    SELECT user_id, score INTO v_winner2_id, v_winner2_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL AND user_id != v_winner1_id
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner2_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 2') INTO v_winner2_name FROM public.users WHERE id = v_winner2_id;
        UPDATE public.users SET tokens = tokens + v_second_prize WHERE id = v_winner2_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2_id::text, v_config_game_type, v_winner2_score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 3rd place
    SELECT user_id, score INTO v_winner3_id, v_winner3_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND score IS NOT NULL 
    AND user_id != v_winner1_id AND (v_winner2_id IS NULL OR user_id != v_winner2_id)
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner3_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 3') INTO v_winner3_name FROM public.users WHERE id = v_winner3_id;
        UPDATE public.users SET tokens = tokens + v_third_prize WHERE id = v_winner3_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner3_id::text, v_config_game_type, v_winner3_score, v_third_prize, 'hot_sell', NOW());
    END IF;
    
    -- Mark session completed
    UPDATE public.hot_sell_sessions
    SET 
        status = 'completed',
        first_place_prize = v_first_prize,
        second_place_prize = v_second_prize,
        third_place_prize = v_third_prize,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session_id;
    
    -- Delete old data
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session_id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session_id;
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (
        config_id, current_pot, base_price, max_participants, 
        participants_count, status, created_at, updated_at
    ) VALUES (
        config_id_param, 0, v_config_base_price, v_config_max_participants, 
        0, 'waiting', NOW(), NOW()
    );
    
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

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(uuid, uuid, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_hot_sell_score(uuid, uuid, numeric, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOT SELL SCHEMA AND FUNCTIONS FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Added participants_count column';
    RAISE NOTICE '✅ Added base_price column';
    RAISE NOTICE '✅ All variables properly declared';
    RAISE NOTICE '✅ NO JOIN operations';
    RAISE NOTICE '✅ Pure UUID handling';
    RAISE NOTICE '========================================';
END $$;

