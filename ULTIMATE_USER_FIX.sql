-- ============================================================================
-- ULTIMATE USER FIX - CREATE USER ON THE FLY IN JOIN FUNCTION
-- This will work even if the user doesn't exist yet
-- ============================================================================

-- STEP 1: Hot Sell join - CREATE user if missing
DROP FUNCTION IF EXISTS public.join_hot_sell_session(UUID, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.join_hot_sell_session(session_id_param UUID, user_id_param UUID, entry_fee_param NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    new_pot NUMERIC;
    current_participants_count INTEGER;
    user_email TEXT;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
        IF user_email IS NOT NULL THEN
            BEGIN
                INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
                VALUES (user_id_param, SPLIT_PART(user_email, '@', 1), user_email, 100, NOW(), NOW());
                
                SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
            EXCEPTION
                WHEN unique_violation THEN
                    SELECT * INTO user_record FROM public.users WHERE id = user_id_param OR email = user_email LIMIT 1;
            END;
        END IF;
    END IF;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User account error. Please sign out and sign in again.');
    END IF;

    SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;

    SELECT COUNT(*) INTO current_participants_count FROM public.hot_sell_participants WHERE session_id = session_id_param;

    IF current_participants_count >= session_record.max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;

    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = user_record.id) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    IF user_record.tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_record.id;
    INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_record.id, NOW());

    new_pot := session_record.current_pot + entry_fee_param;
    UPDATE public.hot_sell_sessions SET current_pot = new_pot, status = CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END, updated_at = NOW() WHERE id = session_id_param;

    RETURN json_build_object('success', true, 'message', 'Successfully joined session', 'newPot', new_pot, 'participantsCount', current_participants_count + 1, 'status', CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 2: Winner Takes All join - CREATE user if missing
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(session_id_param UUID, user_id_param UUID, entry_fee_param NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    new_pot INTEGER;
    new_count INTEGER;
    user_email TEXT;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
        IF user_email IS NOT NULL THEN
            BEGIN
                INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
                VALUES (user_id_param, SPLIT_PART(user_email, '@', 1), user_email, 100, NOW(), NOW());
                
                SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
            EXCEPTION
                WHEN unique_violation THEN
                    SELECT * INTO user_record FROM public.users WHERE id = user_id_param OR email = user_email LIMIT 1;
            END;
        END IF;
    END IF;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User account error. Please sign out and sign in again.');
    END IF;

    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Session not found'); END IF;

    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_param AND user_id = user_record.id) THEN RETURN json_build_object('success', false, 'message', 'Already joined this session'); END IF;

    IF user_record.tokens < entry_fee_param THEN RETURN json_build_object('success', false, 'message', 'Insufficient tokens'); END IF;

    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_record.id;
    INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_record.id, NOW());

    new_pot := session_record.current_pot + entry_fee_param::INTEGER;
    new_count := session_record.participants_count + 1;
    
    UPDATE public.winner_takes_all_sessions SET current_pot = new_pot, participants_count = new_count, status = CASE WHEN new_count >= session_record.base_price THEN 'active' ELSE 'waiting' END, timer_started_at = CASE WHEN new_count >= session_record.base_price AND timer_started_at IS NULL THEN NOW() ELSE timer_started_at END, updated_at = NOW() WHERE id = session_id_param;

    RETURN json_build_object('success', true, 'message', 'Successfully joined session', 'newPot', new_pot, 'participantsCount', new_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 3: Backfill existing users one more time
DO $$
DECLARE
    auth_user RECORD;
BEGIN
    FOR auth_user IN SELECT id, email FROM auth.users WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth_user.id) LOOP
        BEGIN
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
            VALUES (auth_user.id, SPLIT_PART(auth_user.email, '@', 1), auth_user.email, 100, NOW(), NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
END $$;

-- STEP 4: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    BEGIN
        INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
        VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1), NEW.email, 100, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ULTIMATE FIX APPLIED!';
    RAISE NOTICE '🎯 Users will be created on-the-fly if missing';
    RAISE NOTICE '🔄 Please REFRESH your browser page';
    RAISE NOTICE '✅ Then try joining Hot Sell or Winner Takes All';
    RAISE NOTICE '========================================';
END $$;

