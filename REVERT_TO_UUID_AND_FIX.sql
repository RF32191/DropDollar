-- ============================================================================
-- REVERT TO UUID AND FIX PROPERLY
-- Go back to UUID columns and fix the payout function correctly
-- ============================================================================

-- Step 1: Drop policies
DROP POLICY IF EXISTS "Users can join sessions" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can update their own scores" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view participants" ON public.hot_sell_participants;

-- Step 2: Convert user_id back to UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_sell_participants' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.hot_sell_participants 
        ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
        RAISE NOTICE '✅ Converted hot_sell_participants.user_id back to UUID';
    ELSE
        RAISE NOTICE '✅ hot_sell_participants.user_id is already UUID';
    END IF;
END $$;

-- Step 3: Recreate policies with UUID
CREATE POLICY "Users can join sessions"
ON public.hot_sell_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own participation"
ON public.hot_sell_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Public can view participants"
ON public.hot_sell_participants
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can update their own scores"
ON public.hot_sell_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 4: Fix ALL functions to avoid JOIN and use subqueries instead
DROP FUNCTION IF EXISTS public.join_hot_sell_session(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.update_hot_sell_score(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

-- Join function
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
    v_session RECORD;
    v_user_tokens NUMERIC;
    v_new_pot NUMERIC;
    v_participant_count INTEGER;
BEGIN
    SELECT * INTO v_session FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    SELECT tokens INTO v_user_tokens FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    SELECT COUNT(*) INTO v_participant_count FROM public.hot_sell_participants WHERE session_id = session_id_param;
    IF v_participant_count >= v_session.max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    IF v_user_tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    UPDATE public.users SET tokens = tokens - entry_fee_param WHERE id = user_id_param;
    
    v_new_pot := v_session.current_pot + entry_fee_param;
    UPDATE public.hot_sell_sessions 
    SET current_pot = v_new_pot, participants_count = v_participant_count + 1, updated_at = NOW()
    WHERE id = session_id_param;
    
    INSERT INTO public.hot_sell_participants (session_id, user_id, entry_fee, joined_at)
    VALUES (session_id_param, user_id_param, entry_fee_param, NOW());
    
    RETURN json_build_object('success', true, 'message', 'Joined successfully', 'new_pot', v_new_pot);
END;
$$;

-- Update score function
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
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'Not a participant');
    END IF;
    
    UPDATE public.hot_sell_participants
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    RETURN json_build_object('success', true, 'message', 'Score updated', 'score', score_param);
END;
$$;

-- Payout function - NO JOINS, use separate queries
CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_config RECORD;
    v_winner1_id UUID;
    v_winner1_score NUMERIC;
    v_winner1_name TEXT;
    v_winner2_id UUID;
    v_winner2_score NUMERIC;
    v_winner2_name TEXT;
    v_winner3_id UUID;
    v_winner3_score NUMERIC;
    v_winner3_name TEXT;
    v_platform_fee NUMERIC;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
BEGIN
    -- Get config
    SELECT * INTO v_config FROM public.hot_sell_configs WHERE id = config_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Get session
    SELECT * INTO v_session FROM public.hot_sell_sessions 
    WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No active session');
    END IF;
    
    -- Calculate prizes
    v_platform_fee := v_session.current_pot * (v_config.platform_fee_percent / 100.0);
    v_first_prize := (v_session.current_pot - v_platform_fee) * (v_config.first_place_percent / 100.0);
    v_second_prize := (v_session.current_pot - v_platform_fee) * (v_config.second_place_percent / 100.0);
    v_third_prize := (v_session.current_pot - v_platform_fee) * (v_config.third_place_percent / 100.0);
    
    -- Get 1st place (NO JOIN)
    SELECT user_id, score INTO v_winner1_id, v_winner1_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner1_id IS NOT NULL THEN
        -- Get username separately
        SELECT COALESCE(username, email, 'Player') INTO v_winner1_name
        FROM public.users WHERE id = v_winner1_id;
        
        -- Pay winner
        UPDATE public.users SET tokens = tokens + v_first_prize WHERE id = v_winner1_id;
        
        -- Save to history
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1_id::text, v_config.game_type, v_winner1_score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 2nd place
    SELECT user_id, score INTO v_winner2_id, v_winner2_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id AND score IS NOT NULL AND user_id != v_winner1_id
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner2_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player') INTO v_winner2_name FROM public.users WHERE id = v_winner2_id;
        UPDATE public.users SET tokens = tokens + v_second_prize WHERE id = v_winner2_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2_id::text, v_config.game_type, v_winner2_score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    -- Get 3rd place
    SELECT user_id, score INTO v_winner3_id, v_winner3_score
    FROM public.hot_sell_participants
    WHERE session_id = v_session.id AND score IS NOT NULL 
    AND user_id != v_winner1_id AND (v_winner2_id IS NULL OR user_id != v_winner2_id)
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner3_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player') INTO v_winner3_name FROM public.users WHERE id = v_winner3_id;
        UPDATE public.users SET tokens = tokens + v_third_prize WHERE id = v_winner3_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner3_id::text, v_config.game_type, v_winner3_score, v_third_prize, 'hot_sell', NOW());
    END IF;
    
    -- Mark completed
    UPDATE public.hot_sell_sessions
    SET status = 'completed', first_place_prize = v_first_prize, second_place_prize = v_second_prize,
        third_place_prize = v_third_prize, platform_fee = v_platform_fee, completed_at = NOW(), updated_at = NOW()
    WHERE id = v_session.id;
    
    -- Clean up
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session.id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session.id;
    
    -- Create new session
    INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
    VALUES (config_id_param, 0, v_config.base_price, v_config.max_participants, 'waiting', NOW(), NOW());
    
    RETURN json_build_object(
        'success', true, 'message', 'Payout successful',
        'first_place_winner', COALESCE(v_winner1_name, 'N/A'), 'first_place_amount', v_first_prize,
        'second_place_winner', COALESCE(v_winner2_name, 'N/A'), 'second_place_amount', v_second_prize,
        'third_place_winner', COALESCE(v_winner3_name, 'N/A'), 'third_place_amount', v_third_prize,
        'total_pot', v_session.current_pot, 'platform_fee', v_platform_fee
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(uuid, uuid, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_hot_sell_score(uuid, uuid, numeric, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ REVERTED TO UUID AND FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ All columns back to UUID';
    RAISE NOTICE '✅ NO joins in any function';
    RAISE NOTICE '✅ Separate SELECT statements';
    RAISE NOTICE '✅ Should work perfectly now';
    RAISE NOTICE '========================================';
END $$;

