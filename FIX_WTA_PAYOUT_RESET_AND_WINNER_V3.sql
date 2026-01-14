-- ============================================================================
-- FIX WTA PAYOUT, RESET, AND WINNER SELECTION V3
-- ============================================================================
-- Ensures:
-- 1. Payout goes to HIGHEST SCORE among players who joined
-- 2. No cache issues - always gets fresh data
-- 3. Proper reset after 30-second announcement
-- 4. Winner username returned correctly
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '💰 FIXING WTA PAYOUT, RESET & WINNER V3';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- HELPER FUNCTION: ENSURE ALL CONFIGS HAVE SESSIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_all_wta_sessions_exist()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    config_record RECORD;
    sessions_created INTEGER := 0;
BEGIN
    -- Create sessions for any configs that don't have one
    FOR config_record IN 
        SELECT c.id, COALESCE(c.base_price, c.entry_fee, 2) as base_price
        FROM public.winner_takes_all_configs c
        WHERE NOT EXISTS (
            SELECT 1 FROM public.winner_takes_all_sessions s 
            WHERE s.config_id = c.id
        )
    LOOP
        INSERT INTO public.winner_takes_all_sessions (
            id,
            config_id,
            status,
            participants_count,
            prize_pool,
            current_pot,
            base_price,
            timer_started_at,
            timer_duration,
            winner_user_id,
            winner_prize,
            platform_fee_amount,
            rng_seed,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            config_record.id,
            'waiting',
            0,
            0,
            0,
            config_record.base_price,
            NULL,
            1800,  -- 30 minutes default timer
            NULL,
            0,
            0,
            floor(random() * 99999 + 1)::integer,
            NOW(),
            NOW()
        );
        sessions_created := sessions_created + 1;
    END LOOP;
    
    RETURN sessions_created;
END;
$$;

-- ============================================================================
-- FUNCTION: CREATE SESSION FOR SPECIFIC CONFIG (ON-DEMAND)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_wta_session_exists(config_id_param TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config RECORD;
    v_session_id UUID;
    v_existing_session_id UUID;
BEGIN
    -- Check if session already exists
    SELECT id INTO v_existing_session_id
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    LIMIT 1;
    
    IF v_existing_session_id IS NOT NULL THEN
        RETURN v_existing_session_id;
    END IF;
    
    -- Get config details
    SELECT id, COALESCE(base_price, entry_fee, 2) as base_price
    INTO v_config
    FROM public.winner_takes_all_configs
    WHERE id = config_id_param
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Config not found: %', config_id_param;
    END IF;
    
    -- Create session
    v_session_id := gen_random_uuid();
    INSERT INTO public.winner_takes_all_sessions (
        id,
        config_id,
        status,
        participants_count,
        prize_pool,
        current_pot,
        base_price,
        timer_started_at,
        timer_duration,
        winner_user_id,
        winner_prize,
        platform_fee_amount,
        rng_seed,
        created_at,
        updated_at
    ) VALUES (
        v_session_id,
        v_config.id,
        'waiting',
        0,
        0,
        0,
        v_config.base_price,
        NULL,
        1800,  -- 30 minutes default timer
        NULL,
        0,
        0,
        floor(random() * 99999 + 1)::integer,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Created WTA session % for config: %', v_session_id, config_id_param;
    RETURN v_session_id;
END;
$$;

-- ============================================================================
-- UPDATE GET_SESSIONS FUNCTION TO INCLUDE WINNER USERNAME AND AUTO-CREATE SESSIONS
-- ============================================================================

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
    winner_username TEXT,
    winner_prize NUMERIC,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sessions_created INTEGER;
BEGIN
    -- Auto-create missing sessions before returning
    SELECT public.ensure_all_wta_sessions_exist() INTO sessions_created;
    IF sessions_created > 0 THEN
        RAISE NOTICE '✅ Auto-created % missing WTA session(s)', sessions_created;
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id as id,
        s.config_id as config_id,
        COALESCE(s.current_pot, 0)::NUMERIC as current_pot,
        COALESCE(s.base_price, 0)::NUMERIC as base_price,
        COALESCE(s.participants_count, 0)::INTEGER as participants_count,
        s.status as status,
        s.timer_started_at as timer_started_at,
        COALESCE(s.timer_duration, 1800) as timer_duration,  -- Default 30 minutes
        s.winner_user_id as winner_user_id,
        -- Get winner username from users table (not cached)
        CASE 
            WHEN s.winner_user_id IS NOT NULL THEN
                COALESCE(
                    (SELECT u2.username FROM public.users u2 WHERE u2.id = s.winner_user_id LIMIT 1),
                    (SELECT SPLIT_PART(u3.email, '@', 1) FROM public.users u3 WHERE u3.id = s.winner_user_id LIMIT 1),
                    'Player'
                )
            ELSE NULL
        END::TEXT as winner_username,
        COALESCE(s.winner_prize, 0)::NUMERIC as winner_prize,
        COALESCE(s.prize_amount, 0)::NUMERIC as prize_amount,
        COALESCE(s.platform_fee, 0)::NUMERIC as platform_fee,
        s.completed_at as completed_at,
        s.created_at as created_at,
        s.updated_at as updated_at,
        -- Get CURRENT participants (not cached) - only for active/waiting sessions
        CASE 
            WHEN s.status = 'completed' THEN '[]'::jsonb  -- No participants for completed sessions
            ELSE COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', p.id,
                            'user_id', p.user_id,
                            'username', COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player'),
                            'score', p.score,
                            'accuracy', p.accuracy,
                            'joined_at', p.joined_at,
                            'completed_at', p.completed_at
                        ) ORDER BY COALESCE(p.score, 0) DESC NULLS LAST
                    )
                    FROM public.winner_takes_all_participants p
                    LEFT JOIN public.users u ON p.user_id = u.id
                    WHERE p.session_id = s.id
                ),
                '[]'::jsonb
            )
        END as participants
    FROM public.winner_takes_all_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_all_wta_sessions_exist() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_wta_session_exists(TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- UPDATE PAYOUT FUNCTION - ENSURE HIGHEST SCORE WINS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    participant_log RECORD;
    total_pot NUMERIC;
    v_platform_fee NUMERIC;
    v_winner_payout NUMERIC;
    v_time_elapsed NUMERIC;
    v_winner_username TEXT;
BEGIN
    RAISE NOTICE '💰 [PAYOUT] Starting payout for config: %', config_id_param;
    
    -- Find active OR recently completed session for this config
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    AND (status = 'active' OR (status = 'completed' AND completed_at > NOW() - INTERVAL '1 minute'))
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;  -- Lock row to prevent concurrent updates

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if already paid out (and more than 30 seconds ago)
    IF session_record.winner_user_id IS NOT NULL THEN
        -- If completed more than 30 seconds ago, allow reset
        IF session_record.completed_at IS NOT NULL AND 
           EXTRACT(EPOCH FROM (NOW() - session_record.completed_at)) > 30 THEN
            -- Reset the session now (30 seconds have passed)
            UPDATE public.winner_takes_all_sessions
            SET 
                status = 'waiting',
                participants_count = 0,
                current_pot = 0,
                prize_pool = 0,
                timer_started_at = NULL,
                winner_user_id = NULL,
                winner_prize = NULL,
                prize_amount = NULL,
                platform_fee = NULL,
                completed_at = NULL,
                rng_seed = floor(random() * 99999 + 1)::integer,
                updated_at = NOW()
            WHERE id = session_record.id;
            
            -- Clear participants to fix "joined" status
            DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;
            
            RAISE NOTICE '🔄 [RESET] Session % reset to waiting state (kept session, cleared data)', session_record.id;
            
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Session reset after 30-second announcement period',
                'reset', true,
                'session_id', session_record.id::TEXT
            );
        ELSE
            -- Still in announcement period - return winner info
            SELECT COALESCE(username, SPLIT_PART(email, '@', 1), 'Player') INTO v_winner_username
            FROM public.users
            WHERE id = session_record.winner_user_id
            LIMIT 1;
            
            RETURN jsonb_build_object(
                'success', true, 
                'message', 'Session already paid out - showing announcement',
                'already_paid', true,
                'winner_username', v_winner_username,
                'winner_payout', session_record.winner_prize
            );
        END IF;
    END IF;

    -- Check if timer has expired
    IF session_record.timer_started_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer not started yet');
    END IF;

    v_time_elapsed := EXTRACT(EPOCH FROM (NOW() - session_record.timer_started_at));
    
    -- Check if timer has expired (at least timer_duration seconds elapsed)
    IF v_time_elapsed < COALESCE(session_record.timer_duration, 10) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Timer has not expired yet. Time elapsed: ' || ROUND(v_time_elapsed, 1) || 's'
        );
    END IF;

    -- CRITICAL: Find winner from CURRENT participants with HIGHEST SCORE
    -- Only consider players who actually joined and completed the game
    -- Log all participants with scores for debugging
    RAISE NOTICE '🔍 [PAYOUT] Checking participants for session %:', session_record.id;
    FOR winner_record IN 
        SELECT 
            p.*, 
            COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
        FROM public.winner_takes_all_participants p
        JOIN public.users u ON p.user_id = u.id
        WHERE p.session_id = session_record.id
        AND p.score IS NOT NULL
        AND p.completed_at IS NOT NULL
        ORDER BY p.score DESC, p.completed_at ASC
    LOOP
        RAISE NOTICE '  👤 Participant: % (ID: %), Score: %, Completed: %', 
            winner_record.username, winner_record.user_id, winner_record.score, winner_record.completed_at;
    END LOOP;
    
    -- Now select the actual winner (highest score)
    SELECT 
        p.*, 
        COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as username
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL  -- Must have a score
    AND p.completed_at IS NOT NULL  -- Must have completed the game
    ORDER BY p.score DESC, p.completed_at ASC  -- Highest score wins, earliest completion breaks ties
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '🏆 [PAYOUT] SELECTED WINNER: % (ID: %) with score: %', 
            winner_record.username, winner_record.user_id, winner_record.score;
    END IF;

    IF NOT FOUND THEN
        -- No scores submitted - refund all participants
        UPDATE public.users u
        SET won_tokens = COALESCE(won_tokens, 0) + session_record.base_price
        FROM public.winner_takes_all_participants p
        WHERE p.session_id = session_record.id AND p.user_id = u.id;

        -- Mark session as completed
        UPDATE public.winner_takes_all_sessions
        SET 
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = session_record.id;

        -- Clear participants to fix "joined" status
        DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'No scores submitted - all participants refunded. Listing will reset in 30 seconds.',
            'refunded', true
        );
    END IF;

    v_winner_username := winner_record.username;

    -- Calculate payout (85% winner, 15% platform fee)
    total_pot := COALESCE(session_record.prize_pool, session_record.current_pot, session_record.base_price, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool is empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;

    RAISE NOTICE '🏆 [PAYOUT] Winner: % (score: %) = % tokens', v_winner_username, winner_record.score, v_winner_payout;
    RAISE NOTICE '📊 [PAYOUT] Total participants with scores: %', (
        SELECT COUNT(*) FROM public.winner_takes_all_participants 
        WHERE session_id = session_record.id AND score IS NOT NULL
    );

    -- Pay winner to won_tokens wallet
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    RAISE NOTICE '✅ [PAYOUT] Winner paid % tokens', v_winner_payout;

    -- Record transaction
    BEGIN
        INSERT INTO public.token_transactions (
            user_id, 
            transaction_type, 
            amount, 
            balance_after, 
            description, 
            created_at
        )
        VALUES (
            winner_record.user_id,
            'game_win',
            v_winner_payout,
            (SELECT COALESCE(won_tokens, 0) FROM public.users WHERE id = winner_record.user_id),
            'Winner Takes All - ' || config_id_param || ' (Score: ' || winner_record.score || ')',
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [PAYOUT] Transaction log failed (non-fatal): %', SQLERRM;
    END;

    -- Mark session as completed with winner info (KEEP AS COMPLETED FOR 30 SECONDS)
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        winner_prize = v_winner_payout,
        prize_amount = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    RAISE NOTICE '✅ [PAYOUT] Session % marked as completed (will reset after 30 seconds)', session_record.id;

    -- CRITICAL: Clear participants IMMEDIATELY to fix "joined" status
    -- But keep session as "completed" for 30 seconds for announcement
    DELETE FROM public.winner_takes_all_participants
    WHERE session_id = session_record.id;

    RAISE NOTICE '🧹 [RESET] Cleared participants to fix "joined" status';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT COMPLETE!';
    RAISE NOTICE '🎉 Winner: % (score: %)', v_winner_username, winner_record.score;
    RAISE NOTICE '💰 Payout: % tokens (85%% of % pool)', v_winner_payout, total_pot;
    RAISE NOTICE '⏰ Session will reset after 30-second announcement';
    RAISE NOTICE '========================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', '🎉 Payout complete! Winner: ' || v_winner_username || ' received ' || v_winner_payout::TEXT || ' tokens. Announcement will show for 30 seconds.',
        'winner_username', v_winner_username,
        'winner_user_id', winner_record.user_id::TEXT,
        'winner_score', winner_record.score,
        'payout_amount', v_winner_payout,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot,
        'payout_announced', true,
        'completed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [PAYOUT ERROR] %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Payout failed: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- CREATE FUNCTION TO AUTO-RESET AFTER 30 SECONDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_reset_completed_wta_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reset_count INTEGER := 0;
BEGIN
    -- Reset sessions that have been completed for more than 30 seconds
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_prize = NULL,
        prize_amount = NULL,
        platform_fee = NULL,
        completed_at = NULL,
        rng_seed = floor(random() * 99999 + 1)::integer,
        updated_at = NOW()
    WHERE status = 'completed'
    AND completed_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - completed_at)) > 30;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    -- Also clear participants from reset sessions
    DELETE FROM public.winner_takes_all_participants
    WHERE session_id IN (
        SELECT id FROM public.winner_takes_all_sessions
        WHERE status = 'waiting'
        AND completed_at IS NULL
    );
    
    RETURN reset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.auto_reset_completed_wta_sessions() TO authenticated, anon, service_role;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYOUT FUNCTION UPDATED V3';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🏆 Winner Selection:';
    RAISE NOTICE '   - Highest score among players who joined';
    RAISE NOTICE '   - Must have completed the game (score IS NOT NULL)';
    RAISE NOTICE '   - No cache - always gets fresh data';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Payout Structure:';
    RAISE NOTICE '   - Winner (highest score): 85%% of pool';
    RAISE NOTICE '   - Platform fee: 15%% of pool';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Reset Process:';
    RAISE NOTICE '   1. Pay winner immediately';
    RAISE NOTICE '   2. Mark session as completed';
    RAISE NOTICE '   3. Clear participants (fixes "joined" status)';
    RAISE NOTICE '   4. Keep session as "completed" for 30 seconds';
    RAISE NOTICE '   5. Frontend shows announcement for 30 seconds';
    RAISE NOTICE '   6. Auto-reset after 30 seconds';
    RAISE NOTICE '';
    RAISE NOTICE '📢 Payout Announcement:';
    RAISE NOTICE '   - Shows for 30 seconds';
    RAISE NOTICE '   - Returns winner username (fresh from DB)';
    RAISE NOTICE '';
END $$;

SELECT '✅ PAYOUT FUNCTION UPDATED V3 - Highest score wins, 30 second announcement!' as status;

