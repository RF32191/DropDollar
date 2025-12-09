-- ============================================================================
-- FIX COIN PLAY TO ACCEPT PARTICIPANTS IN ACTIVE SESSIONS
-- ============================================================================
-- Updates coin_play_join_v2 to allow joining active sessions
-- Participants can join until max_participants is reached
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING COIN PLAY JOIN FUNCTION';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- UPDATE JOIN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.coin_play_join_v2(
    p_session UUID,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_id TEXT;
    v_purchased_tokens NUMERIC;
    v_won_tokens NUMERIC;
    v_total_tokens NUMERIC;
    v_participants_count INTEGER;
    v_max_participants INTEGER;
    v_session_status TEXT;
    v_min_participants INTEGER;
BEGIN
    -- Get session details
    SELECT config_id, participants_count, status
    INTO v_config_id, v_participants_count, v_session_status
    FROM public.coin_play_sessions
    WHERE id = p_session;

    -- Check if session exists
    IF v_config_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Allow joining if session is 'waiting' or 'active' (but not 'completed')
    IF v_session_status NOT IN ('waiting', 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is no longer accepting participants');
    END IF;

    -- Get max participants from config
    SELECT max_participants, min_participants
    INTO v_max_participants, v_min_participants
    FROM public.coin_play_configs
    WHERE id = v_config_id;

    -- Check if session is full
    IF v_participants_count >= v_max_participants THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is full');
    END IF;

    -- Check if user already joined
    IF EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = p_session AND user_id = p_user
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Get user's token balance
    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_purchased_tokens, v_won_tokens
    FROM public.users
    WHERE id = p_user;

    v_total_tokens := v_purchased_tokens + v_won_tokens;

    -- Check if user has enough tokens
    IF v_total_tokens < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    -- Deduct entry fee (prioritize won_tokens)
    IF v_won_tokens >= p_fee THEN
        UPDATE public.users
        SET won_tokens = won_tokens - p_fee
        WHERE id = p_user;
    ELSE
        UPDATE public.users
        SET 
            won_tokens = 0,
            purchased_tokens = purchased_tokens - (p_fee - v_won_tokens)
        WHERE id = p_user;
    END IF;

    -- Add participant (username will be fetched from users table via trigger or set to email)
    INSERT INTO public.coin_play_participants (session_id, user_id, username)
    SELECT p_session, p_user, COALESCE(u.username, u.email, 'Player')
    FROM public.users u
    WHERE u.id = p_user;

    -- Update session counts and prize pool
    UPDATE public.coin_play_sessions
    SET 
        participants_count = participants_count + 1,
        prize_pool = prize_pool + p_fee
    WHERE id = p_session;

    -- If session is waiting and now has min_participants, start it
    -- If session is already active, keep it active (don't restart timer)
    IF v_session_status = 'waiting' AND (v_participants_count + 1) >= v_min_participants THEN
        UPDATE public.coin_play_sessions
        SET 
            status = 'active',
            timer_started_at = COALESCE(timer_started_at, NOW())
        WHERE id = p_session;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined session');
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Join function updated';
    RAISE NOTICE '   Now allows joining active sessions';
    RAISE NOTICE '   Participants can join until max_participants is reached';
END $$;

-- ============================================================================
-- VERIFY FUNCTION
-- ============================================================================

SELECT 
    '=== Coin Play Join Function Updated ===' as info;

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'coin_play_join_v2'
AND routine_schema = 'public'
LIMIT 1;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ JOIN FUNCTION UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What changed:';
    RAISE NOTICE '   - Sessions now accept participants when status is "waiting" OR "active"';
    RAISE NOTICE '   - Participants can join until max_participants is reached';
    RAISE NOTICE '   - Timer only starts once when min_participants is reached';
    RAISE NOTICE '   - Timer does not restart when new participants join active sessions';
    RAISE NOTICE '';
END $$;

SELECT '✅ JOIN FUNCTION UPDATED - Sessions now accept participants when active!' as status;

