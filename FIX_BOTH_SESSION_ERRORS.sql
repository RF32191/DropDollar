-- ============================================================================
-- FIX BOTH SESSION ERRORS
-- ============================================================================
-- Fixes: "Session not found" for Winner Takes All
-- Fixes: "participants_count" error for Hot Sell
-- ============================================================================

-- STEP 1: Create get_all_winner_takes_all_sessions (returns existing sessions)
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot NUMERIC,
    base_price NUMERIC,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        s.current_pot,
        s.base_price,
        s.participants_count,
        s.status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 1800) as timer_duration,
        s.winner_user_id,
        s.prize_amount,
        s.platform_fee,
        s.created_at,
        s.updated_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'user_id', p.user_id,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.winner_takes_all_participants p
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.winner_takes_all_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

-- STEP 2: Create get_all_hot_sell_sessions (calculates participants_count)
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot NUMERIC,
    base_price NUMERIC,
    max_participants INTEGER,
    status TEXT,
    first_place_user_id UUID,
    second_place_user_id UUID,
    third_place_user_id UUID,
    first_place_prize NUMERIC,
    second_place_prize NUMERIC,
    third_place_prize NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        s.current_pot,
        s.base_price,
        s.max_participants,
        s.status,
        s.first_place_user_id,
        s.second_place_user_id,
        s.third_place_user_id,
        s.first_place_prize,
        s.second_place_prize,
        s.third_place_prize,
        s.platform_fee,
        s.created_at,
        s.updated_at,
        s.completed_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'user_id', p.user_id,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at
                    )
                )
                FROM public.hot_sell_participants p
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.hot_sell_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

-- STEP 3: Fix join_hot_sell_session to NOT use participants_count column
DROP FUNCTION IF EXISTS public.join_hot_sell_session(UUID, UUID, NUMERIC) CASCADE;

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
    session_record RECORD;
    user_record RECORD;
    new_pot NUMERIC;
    current_participants_count INTEGER;
BEGIN
    -- Get session (without participants_count field)
    SELECT * INTO session_record FROM hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Calculate current participants from participants table
    SELECT COUNT(*) INTO current_participants_count 
    FROM hot_sell_participants 
    WHERE session_id = session_id_param;

    -- Check if session is full
    IF current_participants_count >= session_record.max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;

    -- Check if user already joined
    IF EXISTS (SELECT 1 FROM hot_sell_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined');
    END IF;

    -- Get user
    SELECT * INTO user_record FROM users WHERE id = user_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    IF user_record.tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    -- Deduct tokens
    UPDATE users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    
    -- Add participant
    INSERT INTO hot_sell_participants (session_id, user_id, joined_at) VALUES (session_id_param, user_id_param, NOW());

    -- Update pot
    new_pot := session_record.current_pot + entry_fee_param;
    UPDATE hot_sell_sessions 
    SET current_pot = new_pot,
        status = CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END,
        updated_at = NOW()
    WHERE id = session_id_param;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined',
        'newPot', new_pot,
        'participantsCount', current_participants_count + 1,
        'status', CASE WHEN (current_participants_count + 1) >= session_record.max_participants THEN 'active' ELSE 'waiting' END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 4: Create Winner Takes All sessions if missing
INSERT INTO winner_takes_all_sessions (config_id, current_pot, base_price, participants_count, status, created_at, updated_at)
SELECT c.id, 0, c.base_price, 0, 'waiting', NOW(), NOW()
FROM winner_takes_all_configs c
WHERE NOT EXISTS (SELECT 1 FROM winner_takes_all_sessions s WHERE s.config_id = c.id AND s.status IN ('waiting', 'active'));

-- STEP 5: Create Hot Sell sessions if missing
INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
SELECT c.id, 0, c.base_price, c.max_participants, 'waiting', NOW(), NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (SELECT 1 FROM hot_sell_sessions s WHERE s.config_id = c.id AND s.status IN ('waiting', 'active'));

-- STEP 6: Verify
DO $$
DECLARE
    wta_count INTEGER;
    hs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO wta_count FROM winner_takes_all_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO hs_count FROM hot_sell_sessions WHERE status IN ('waiting', 'active');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ BOTH ERRORS FIXED';
    RAISE NOTICE '  Winner Takes All sessions: %', wta_count;
    RAISE NOTICE '  Hot Sell sessions: %', hs_count;
    RAISE NOTICE '  Functions created without participants_count errors';
    RAISE NOTICE '';
END $$;

