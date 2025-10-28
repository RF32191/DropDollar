-- ============================================================================
-- FIX HOT SELL FOREIGN KEY CONSTRAINT - SIMPLE VERSION
-- ============================================================================

-- Fix join function to verify user exists first
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
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found. Please refresh the page.');
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

-- Clean up orphaned participants
DELETE FROM public.hot_sell_participants WHERE user_id NOT IN (SELECT id FROM public.users);

-- Verify foreign key exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'hot_sell_participants_user_id_fkey' AND table_name = 'hot_sell_participants') THEN
        ALTER TABLE public.hot_sell_participants ADD CONSTRAINT hot_sell_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint';
    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists';
    END IF;
    RAISE NOTICE '🎉 Hot Sell foreign key fixed!';
END $$;

