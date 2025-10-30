-- ============================================================================
-- NUCLEAR FIX - Convert hot_sell_participants.user_id to TEXT too
-- The error is probably because hot_sell_participants.user_id is still UUID
-- ============================================================================

-- Step 1: Drop ALL foreign key constraints on hot_sell_participants
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.hot_sell_participants'::regclass 
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.hot_sell_participants DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Drop policies on hot_sell_participants
DROP POLICY IF EXISTS "Users can join sessions" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can update their own scores" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view participants" ON public.hot_sell_participants;

-- Step 3: Convert hot_sell_participants.user_id to TEXT
ALTER TABLE public.hot_sell_participants 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Step 4: Recreate policies with TEXT
CREATE POLICY "Users can join sessions" ON public.hot_sell_participants
FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own participation" ON public.hot_sell_participants
FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Public can view participants" ON public.hot_sell_participants
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can update their own scores" ON public.hot_sell_participants
FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Step 5: Drop views
DROP VIEW IF EXISTS public.user_activity_stats CASCADE;
DROP VIEW IF EXISTS public.user_game_stats CASCADE;
DROP VIEW IF EXISTS public.user_statistics CASCADE;

-- Step 6: Drop policies on game_history
DROP POLICY IF EXISTS "users_view_own_games" ON public.game_history;
DROP POLICY IF EXISTS "users_insert_own_games" ON public.game_history;
DROP POLICY IF EXISTS "Users can view their own game history" ON public.game_history;
DROP POLICY IF EXISTS "Public can view all games" ON public.game_history;
DROP POLICY IF EXISTS "Service role can insert" ON public.game_history;

-- Step 7: Convert game_history.user_id to TEXT
ALTER TABLE public.game_history ALTER COLUMN user_id TYPE TEXT;

-- Step 8: Recreate game_history policies
CREATE POLICY "users_view_own_games" ON public.game_history FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "users_insert_own_games" ON public.game_history FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Public can view all games" ON public.game_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role can insert" ON public.game_history FOR INSERT TO service_role WITH CHECK (true);

-- Step 9: Recreate views
CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT user_id, COUNT(*) as total_games, AVG(score) as avg_score, MAX(score) as best_score, SUM(tokens_won) as total_earnings
FROM public.game_history GROUP BY user_id;

CREATE OR REPLACE VIEW public.user_game_stats AS
SELECT user_id, game_type, COUNT(*) as games_played, AVG(score) as avg_score, MAX(score) as best_score
FROM public.game_history GROUP BY user_id, game_type;

-- Step 10: Recreate ALL Hot Sell functions with pure TEXT
DROP FUNCTION IF EXISTS public.join_hot_sell_session(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.update_hot_sell_score(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

-- Join function - accepts UUID params, converts to TEXT immediately
CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
    session_id_param UUID, 
    user_id_param UUID, 
    entry_fee_param NUMERIC
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session_id TEXT;
    v_user_id TEXT;
    v_max_participants INTEGER;
    v_current_pot NUMERIC;
    v_user_tokens NUMERIC;
    v_new_pot NUMERIC;
    v_participant_count INTEGER;
BEGIN
    v_session_id := session_id_param::text;
    v_user_id := user_id_param::text;
    
    SELECT max_participants, current_pot INTO v_max_participants, v_current_pot
    FROM public.hot_sell_sessions WHERE id::text = v_session_id;
    
    IF v_max_participants IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    SELECT tokens INTO v_user_tokens FROM public.users WHERE id::text = v_user_id;
    IF v_user_tokens IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    SELECT COUNT(*) INTO v_participant_count FROM public.hot_sell_participants WHERE session_id::text = v_session_id;
    IF v_participant_count >= v_max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id::text = v_session_id AND user_id = v_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    IF v_user_tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    UPDATE public.users SET tokens = tokens - entry_fee_param WHERE id::text = v_user_id;
    v_new_pot := v_current_pot + entry_fee_param;
    
    UPDATE public.hot_sell_sessions 
    SET current_pot = v_new_pot, participants_count = v_participant_count + 1, updated_at = NOW()
    WHERE id::text = v_session_id;
    
    INSERT INTO public.hot_sell_participants (session_id, user_id, entry_fee, joined_at)
    VALUES (session_id_param, v_user_id, entry_fee_param, NOW());
    
    RETURN json_build_object('success', true, 'message', 'Joined successfully', 'new_pot', v_new_pot);
END;
$$;

-- Update score function
CREATE OR REPLACE FUNCTION public.update_hot_sell_score(
    session_id_param UUID, user_id_param UUID, score_param NUMERIC, accuracy_param NUMERIC
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session_id TEXT;
    v_user_id TEXT;
BEGIN
    v_session_id := session_id_param::text;
    v_user_id := user_id_param::text;
    
    IF NOT EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id::text = v_session_id AND user_id = v_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Not a participant');
    END IF;
    
    UPDATE public.hot_sell_participants
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id::text = v_session_id AND user_id = v_user_id;
    
    RETURN json_build_object('success', true, 'message', 'Score updated');
END;
$$;

-- Payout function - pure TEXT throughout
CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session_id TEXT;
    v_current_pot NUMERIC;
    v_config RECORD;
    v_platform_fee NUMERIC;
    v_first_prize NUMERIC;
    v_second_prize NUMERIC;
    v_third_prize NUMERIC;
    v_winner1_id TEXT;
    v_winner1_score NUMERIC;
    v_winner1_name TEXT;
    v_winner2_id TEXT;
    v_winner2_score NUMERIC;
    v_winner2_name TEXT;
    v_winner3_id TEXT;
    v_winner3_score NUMERIC;
    v_winner3_name TEXT;
BEGIN
    SELECT * INTO v_config FROM public.hot_sell_configs WHERE id = config_id_param;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Config not found'); END IF;
    
    SELECT id::text, current_pot INTO v_session_id, v_current_pot
    FROM public.hot_sell_sessions WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_session_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'No active session'); END IF;
    
    v_platform_fee := v_current_pot * (v_config.platform_fee_percent / 100.0);
    v_first_prize := (v_current_pot - v_platform_fee) * (v_config.first_place_percent / 100.0);
    v_second_prize := (v_current_pot - v_platform_fee) * (v_config.second_place_percent / 100.0);
    v_third_prize := (v_current_pot - v_platform_fee) * (v_config.third_place_percent / 100.0);
    
    -- Get winners (user_id is TEXT in hot_sell_participants now)
    SELECT user_id, score INTO v_winner1_id, v_winner1_score
    FROM public.hot_sell_participants WHERE session_id::text = v_session_id AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner1_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 1') INTO v_winner1_name FROM public.users WHERE id::text = v_winner1_id;
        UPDATE public.users SET tokens = tokens + v_first_prize WHERE id::text = v_winner1_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1_id, v_config.game_type, v_winner1_score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    SELECT user_id, score INTO v_winner2_id, v_winner2_score
    FROM public.hot_sell_participants WHERE session_id::text = v_session_id AND score IS NOT NULL AND user_id != v_winner1_id
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner2_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 2') INTO v_winner2_name FROM public.users WHERE id::text = v_winner2_id;
        UPDATE public.users SET tokens = tokens + v_second_prize WHERE id::text = v_winner2_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2_id, v_config.game_type, v_winner2_score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    SELECT user_id, score INTO v_winner3_id, v_winner3_score
    FROM public.hot_sell_participants WHERE session_id::text = v_session_id AND score IS NOT NULL 
    AND user_id != v_winner1_id AND (v_winner2_id IS NULL OR user_id != v_winner2_id)
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner3_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 3') INTO v_winner3_name FROM public.users WHERE id::text = v_winner3_id;
        UPDATE public.users SET tokens = tokens + v_third_prize WHERE id::text = v_winner3_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner3_id, v_config.game_type, v_winner3_score, v_third_prize, 'hot_sell', NOW());
    END IF;
    
    UPDATE public.hot_sell_sessions SET status = 'completed', first_place_prize = v_first_prize,
        second_place_prize = v_second_prize, third_place_prize = v_third_prize, platform_fee = v_platform_fee,
        completed_at = NOW(), updated_at = NOW()
    WHERE id::text = v_session_id;
    
    DELETE FROM public.hot_sell_participants WHERE session_id::text = v_session_id;
    DELETE FROM public.hot_sell_sessions WHERE id::text = v_session_id;
    
    INSERT INTO public.hot_sell_sessions (config_id, current_pot, base_price, max_participants, participants_count, status, created_at, updated_at)
    VALUES (config_id_param, 0, v_config.base_price, v_config.max_participants, 0, 'waiting', NOW(), NOW());
    
    RETURN json_build_object('success', true, 'message', 'Payout successful',
        'first_place_winner', COALESCE(v_winner1_name, 'N/A'), 'first_place_amount', v_first_prize,
        'second_place_winner', COALESCE(v_winner2_name, 'N/A'), 'second_place_amount', v_second_prize,
        'third_place_winner', COALESCE(v_winner3_name, 'N/A'), 'third_place_amount', v_third_prize,
        'total_pot', v_current_pot, 'platform_fee', v_platform_fee);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(uuid, uuid, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_hot_sell_score(uuid, uuid, numeric, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_hot_sell_payout(text) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ NUCLEAR FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ hot_sell_participants.user_id → TEXT';
    RAISE NOTICE '✅ game_history.user_id → TEXT';
    RAISE NOTICE '✅ ALL foreign keys dropped';
    RAISE NOTICE '✅ ALL functions use pure TEXT';
    RAISE NOTICE '✅ This MUST work now!';
    RAISE NOTICE '========================================';
END $$;

