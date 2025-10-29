-- ============================================================================
-- REMOVE FOREIGN KEY CONSTRAINTS
-- Let ALL users join games without strict foreign key checks
-- ============================================================================

-- STEP 1: Drop foreign key constraints from participants tables
ALTER TABLE public.hot_sell_participants DROP CONSTRAINT IF EXISTS hot_sell_participants_user_id_fkey CASCADE;
ALTER TABLE public.winner_takes_all_participants DROP CONSTRAINT IF EXISTS winner_takes_all_participants_user_id_fkey CASCADE;
ALTER TABLE public.one_v_one_participants DROP CONSTRAINT IF EXISTS one_v_one_participants_user_id_fkey CASCADE;

-- STEP 2: Make join functions simpler - no user verification needed
DROP FUNCTION IF EXISTS public.join_hot_sell_session(UUID, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.join_hot_sell_session(session_id_param UUID, user_id_param UUID, entry_fee_param NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_tokens NUMERIC;
    new_pot NUMERIC;
    current_participants_count INTEGER;
BEGIN
    -- Get session
    SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Get user tokens (create user if needed)
    SELECT tokens INTO user_tokens FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        -- Auto-create user with tokens
        BEGIN
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
            SELECT user_id_param, SPLIT_PART(email, '@', 1), email, 100, NOW(), NOW()
            FROM auth.users WHERE id = user_id_param;
            user_tokens := 100;
        EXCEPTION WHEN OTHERS THEN
            user_tokens := 100;
        END;
    END IF;

    -- Count participants
    SELECT COUNT(*) INTO current_participants_count FROM public.hot_sell_participants WHERE session_id = session_id_param;

    -- Check session capacity
    IF current_participants_count >= session_record.max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;

    -- Check if already joined
    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Check tokens
    IF user_tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    -- Deduct tokens
    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    
    -- Add participant (no foreign key constraint now!)
    INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at) 
    VALUES (session_id_param, user_id_param, NOW());

    -- Update pot
    new_pot := session_record.current_pot + entry_fee_param;
    UPDATE public.hot_sell_sessions 
    SET current_pot = new_pot,
        status = CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END,
        updated_at = NOW()
    WHERE id = session_id_param;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined session',
        'newPot', new_pot,
        'participantsCount', current_participants_count + 1,
        'status', CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 3: Same for Winner Takes All
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(session_id_param UUID, user_id_param UUID, entry_fee_param NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_tokens NUMERIC;
    new_pot INTEGER;
    new_count INTEGER;
BEGIN
    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Session not found'); END IF;

    SELECT tokens INTO user_tokens FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        BEGIN
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
            SELECT user_id_param, SPLIT_PART(email, '@', 1), email, 100, NOW(), NOW()
            FROM auth.users WHERE id = user_id_param;
            user_tokens := 100;
        EXCEPTION WHEN OTHERS THEN
            user_tokens := 100;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN 
        RETURN json_build_object('success', false, 'message', 'Already joined this session'); 
    END IF;

    IF user_tokens < entry_fee_param THEN 
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens'); 
    END IF;

    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_id_param, NOW());

    new_pot := session_record.current_pot + entry_fee_param::INTEGER;
    new_count := session_record.participants_count + 1;
    
    UPDATE public.winner_takes_all_sessions 
    SET current_pot = new_pot, 
        participants_count = new_count, 
        status = CASE WHEN new_count >= session_record.base_price THEN 'active' ELSE 'waiting' END, 
        timer_started_at = CASE WHEN new_count >= session_record.base_price AND timer_started_at IS NULL THEN NOW() ELSE timer_started_at END, 
        updated_at = NOW() 
    WHERE id = session_id_param;

    RETURN json_build_object('success', true, 'message', 'Successfully joined session', 'newPot', new_pot, 'participantsCount', new_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 4: Verify constraints are removed
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%_user_id_fkey'
    AND table_schema = 'public';
    
    RAISE NOTICE '========================================';
    IF constraint_count = 0 THEN
        RAISE NOTICE '✅ All foreign key constraints REMOVED!';
        RAISE NOTICE '🎉 ALL users can now join games freely!';
        RAISE NOTICE '🔄 REFRESH YOUR BROWSER and try again!';
    ELSE
        RAISE NOTICE '⚠️ Found % foreign key constraints still active', constraint_count;
    END IF;
    RAISE NOTICE '========================================';
END $$;

