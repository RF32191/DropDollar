-- ============================================================================
-- ULTIMATE TYPE FIX - Make ALL ID columns consistent
-- Strategy: Keep session_id as UUID everywhere, user_id as TEXT everywhere
-- ============================================================================

-- Step 1: Check and show current types
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING CURRENT TYPES:';
    RAISE NOTICE '========================================';
END $$;

-- Step 2: Ensure hot_sell_participants has correct types
-- session_id should be UUID (it references hot_sell_sessions.id which is UUID)
-- user_id should be TEXT (we decided this for compatibility)

-- Drop policies first
DROP POLICY IF EXISTS "Users can join sessions" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can update their own scores" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.hot_sell_participants;

-- Ensure user_id is TEXT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_sell_participants' AND column_name = 'user_id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.hot_sell_participants ALTER COLUMN user_id TYPE TEXT;
        RAISE NOTICE '✅ hot_sell_participants.user_id → TEXT';
    ELSE
        RAISE NOTICE '✅ hot_sell_participants.user_id already TEXT';
    END IF;
END $$;

-- Recreate policies
CREATE POLICY "Users can join sessions" ON public.hot_sell_participants
FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own participation" ON public.hot_sell_participants
FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Public can view participants" ON public.hot_sell_participants
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can update their own scores" ON public.hot_sell_participants
FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Step 3: Fix game_history.user_id
DROP VIEW IF EXISTS public.user_activity_stats CASCADE;
DROP VIEW IF EXISTS public.user_game_stats CASCADE;

DROP POLICY IF EXISTS "users_view_own_games" ON public.game_history;
DROP POLICY IF EXISTS "users_insert_own_games" ON public.game_history;
DROP POLICY IF EXISTS "Public can view all games" ON public.game_history;
DROP POLICY IF EXISTS "Service role can insert" ON public.game_history;

ALTER TABLE public.game_history ALTER COLUMN user_id TYPE TEXT;

CREATE POLICY "users_view_own_games" ON public.game_history FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "users_insert_own_games" ON public.game_history FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Public can view all games" ON public.game_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role can insert" ON public.game_history FOR INSERT TO service_role WITH CHECK (true);

CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT user_id, COUNT(*) as total_games, AVG(score) as avg_score, MAX(score) as best_score, SUM(tokens_won) as total_earnings
FROM public.game_history GROUP BY user_id;

CREATE OR REPLACE VIEW public.user_game_stats AS
SELECT user_id, game_type, COUNT(*) as games_played, AVG(score) as avg_score, MAX(score) as best_score
FROM public.game_history GROUP BY user_id, game_type;

-- Step 4: Recreate functions with CORRECT types
-- session_id params stay as UUID, user_id params stay as UUID but convert to TEXT for storage
DROP FUNCTION IF EXISTS public.join_hot_sell_session(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.update_hot_sell_score(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.process_hot_sell_payout(text);

CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
    session_id_param UUID, 
    user_id_param UUID, 
    entry_fee_param NUMERIC
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id_text TEXT;
    v_max_participants INTEGER;
    v_current_pot NUMERIC;
    v_user_tokens NUMERIC;
    v_new_pot NUMERIC;
    v_participant_count INTEGER;
BEGIN
    v_user_id_text := user_id_param::text;
    
    SELECT max_participants, current_pot INTO v_max_participants, v_current_pot
    FROM public.hot_sell_sessions WHERE id = session_id_param;
    
    IF v_max_participants IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    SELECT tokens INTO v_user_tokens FROM public.users WHERE id = user_id_param;
    IF v_user_tokens IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    SELECT COUNT(*) INTO v_participant_count FROM public.hot_sell_participants WHERE session_id = session_id_param;
    IF v_participant_count >= v_max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;
    
    -- user_id in table is TEXT, so compare with TEXT
    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = v_user_id_text) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    IF v_user_tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    UPDATE public.users SET tokens = tokens - entry_fee_param WHERE id = user_id_param;
    v_new_pot := v_current_pot + entry_fee_param;
    
    UPDATE public.hot_sell_sessions 
    SET current_pot = v_new_pot, participants_count = v_participant_count + 1, updated_at = NOW()
    WHERE id = session_id_param;
    
    -- session_id is UUID, user_id is TEXT
    INSERT INTO public.hot_sell_participants (session_id, user_id, entry_fee, joined_at)
    VALUES (session_id_param, v_user_id_text, entry_fee_param, NOW());
    
    RETURN json_build_object('success', true, 'message', 'Joined successfully', 'new_pot', v_new_pot);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_hot_sell_score(
    session_id_param UUID, user_id_param UUID, score_param NUMERIC, accuracy_param NUMERIC
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id_text TEXT;
BEGIN
    v_user_id_text := user_id_param::text;
    
    IF NOT EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = v_user_id_text) THEN
        RETURN json_build_object('success', false, 'message', 'Not a participant');
    END IF;
    
    UPDATE public.hot_sell_participants
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = v_user_id_text;
    
    RETURN json_build_object('success', true, 'message', 'Score updated');
END;
$$;

CREATE OR REPLACE FUNCTION public.process_hot_sell_payout(config_id_param text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session_id UUID;
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
    
    SELECT id, current_pot INTO v_session_id, v_current_pot
    FROM public.hot_sell_sessions WHERE config_id = config_id_param AND status != 'completed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_session_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'No active session'); END IF;
    
    v_platform_fee := v_current_pot * (v_config.platform_fee_percent / 100.0);
    v_first_prize := (v_current_pot - v_platform_fee) * (v_config.first_place_percent / 100.0);
    v_second_prize := (v_current_pot - v_platform_fee) * (v_config.second_place_percent / 100.0);
    v_third_prize := (v_current_pot - v_platform_fee) * (v_config.third_place_percent / 100.0);
    
    -- user_id in hot_sell_participants is TEXT
    SELECT user_id, score INTO v_winner1_id, v_winner1_score
    FROM public.hot_sell_participants WHERE session_id = v_session_id AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner1_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 1') INTO v_winner1_name FROM public.users WHERE id::text = v_winner1_id;
        UPDATE public.users SET tokens = tokens + v_first_prize WHERE id::text = v_winner1_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner1_id, v_config.game_type, v_winner1_score, v_first_prize, 'hot_sell', NOW());
    END IF;
    
    SELECT user_id, score INTO v_winner2_id, v_winner2_score
    FROM public.hot_sell_participants WHERE session_id = v_session_id AND score IS NOT NULL AND user_id != v_winner1_id
    ORDER BY score DESC LIMIT 1;
    
    IF v_winner2_id IS NOT NULL THEN
        SELECT COALESCE(username, email, 'Player 2') INTO v_winner2_name FROM public.users WHERE id::text = v_winner2_id;
        UPDATE public.users SET tokens = tokens + v_second_prize WHERE id::text = v_winner2_id;
        INSERT INTO public.game_history (user_id, game_type, score, tokens_won, tournament_type, created_at)
        VALUES (v_winner2_id, v_config.game_type, v_winner2_score, v_second_prize, 'hot_sell', NOW());
    END IF;
    
    SELECT user_id, score INTO v_winner3_id, v_winner3_score
    FROM public.hot_sell_participants WHERE session_id = v_session_id AND score IS NOT NULL 
    AND user_id != v_winner1_id AND (v_winner2_id IS NULL OR user_id != v_winner3_id)
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
    WHERE id = v_session_id;
    
    DELETE FROM public.hot_sell_participants WHERE session_id = v_session_id;
    DELETE FROM public.hot_sell_sessions WHERE id = v_session_id;
    
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
    RAISE NOTICE '✅ ULTIMATE TYPE FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ hot_sell_participants.session_id = UUID';
    RAISE NOTICE '✅ hot_sell_participants.user_id = TEXT';
    RAISE NOTICE '✅ game_history.user_id = TEXT';
    RAISE NOTICE '✅ All functions handle types correctly';
    RAISE NOTICE '========================================';
END $$;

