-- ============================================================================
-- FIX USER CREATION FINAL - HANDLE DUPLICATES
-- Works for all existing and future users
-- ============================================================================

-- STEP 1: Update join function to handle existing users
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
    generated_username TEXT;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
        
        IF user_email IS NOT NULL THEN
            generated_username := SPLIT_PART(user_email, '@', 1);
            
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
            VALUES (user_id_param, generated_username, user_email, 100, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            ON CONFLICT (email) DO UPDATE SET updated_at = NOW();
            
            SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
        END IF;
    END IF;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User account not found. Please sign out and sign in again.');
    END IF;

    SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;

    SELECT COUNT(*) INTO current_participants_count FROM public.hot_sell_participants WHERE session_id = session_id_param;

    IF current_participants_count >= session_record.max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;

    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    IF user_record.tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_id_param, NOW());

    new_pot := session_record.current_pot + entry_fee_param;
    UPDATE public.hot_sell_sessions SET current_pot = new_pot, status = CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END, updated_at = NOW() WHERE id = session_id_param;

    RETURN json_build_object('success', true, 'message', 'Successfully joined session', 'newPot', new_pot, 'participantsCount', current_participants_count + 1, 'status', CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 2: Update trigger for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    generated_username TEXT;
BEGIN
    generated_username := SPLIT_PART(NEW.email, '@', 1);
    
    INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
    VALUES (NEW.id, generated_username, NEW.email, 100, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
    ON CONFLICT (email) DO NOTHING;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Backfill missing users (skip duplicates)
INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
SELECT 
    au.id, 
    SPLIT_PART(au.email, '@', 1), 
    au.email, 
    100, 
    NOW(), 
    NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING
ON CONFLICT (email) DO NOTHING;

-- STEP 4: Fix users with null username
UPDATE public.users SET username = SPLIT_PART(email, '@', 1), updated_at = NOW() WHERE username IS NULL AND email IS NOT NULL;

-- STEP 5: Also fix Winner Takes All join function
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
    generated_username TEXT;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
        IF user_email IS NOT NULL THEN
            generated_username := SPLIT_PART(user_email, '@', 1);
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at) VALUES (user_id_param, generated_username, user_email, 100, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET updated_at = NOW() ON CONFLICT (email) DO UPDATE SET updated_at = NOW();
            SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
        END IF;
    END IF;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User account not found. Please sign out and sign in again.');
    END IF;

    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Session not found'); END IF;

    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN RETURN json_build_object('success', false, 'message', 'Already joined this session'); END IF;

    IF user_record.tokens < entry_fee_param THEN RETURN json_build_object('success', false, 'message', 'Insufficient tokens'); END IF;

    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_id_param, NOW());

    new_pot := session_record.current_pot + entry_fee_param::INTEGER;
    new_count := session_record.participants_count + 1;
    
    UPDATE public.winner_takes_all_sessions SET current_pot = new_pot, participants_count = new_count, status = CASE WHEN new_count >= session_record.base_price THEN 'active' ELSE 'waiting' END, timer_started_at = CASE WHEN new_count >= session_record.base_price AND timer_started_at IS NULL THEN NOW() ELSE timer_started_at END, updated_at = NOW() WHERE id = session_id_param;

    RETURN json_build_object('success', true, 'message', 'Successfully joined session', 'newPot', new_pot, 'participantsCount', new_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 6: Verify
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    null_username INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO null_username FROM public.users WHERE username IS NULL;
    
    RAISE NOTICE '✅ Auth users: %', auth_count;
    RAISE NOTICE '✅ Public users: %', public_count;
    RAISE NOTICE '✅ Users with null username: %', null_username;
    RAISE NOTICE '🎉 User creation fixed for all existing and future users!';
END $$;

