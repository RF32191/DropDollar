-- ============================================================================
-- FIX WTA TIMER LOGIC - Enhanced with better logging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wta_join_v2(
    p_session TEXT,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_participant_id UUID;
    v_hour_count INT;
    v_day_count INT;
    v_rng_seed INT;
    v_username TEXT;
    v_max_participants INT;
    v_current_count INT;
    v_should_start_timer BOOLEAN;
BEGIN
    -- HOT SELL METHOD: Convert TEXT to UUID immediately
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
    END;
    
    RAISE NOTICE '🎮 WTA_JOIN_V2: session=%, user=%', v_session_uuid, p_user;
    
    -- Rate limit check
    SELECT 
        COALESCE(games_last_hour, 0),
        COALESCE(games_last_day, 0)
    INTO v_hour_count, v_day_count
    FROM user_rate_limits
    WHERE user_id = p_user;
    
    IF v_hour_count >= 30 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30 games per hour');
    END IF;
    
    IF v_day_count >= 200 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200 games per day');
    END IF;
    
    -- Get user tokens
    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users
    WHERE id = p_user;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Get session details including max_participants and current count
    -- Default to 10 if max_participants not set
    SELECT 
        COALESCE(s.participants_count, 0),
        COALESCE(c.max_participants, 10)
    INTO v_current_count, v_max_participants
    FROM winner_takes_all_sessions s
    LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
    WHERE s.id = v_session_uuid
    AND s.status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or inactive');
    END IF;
    
    -- If max_participants is NULL, default to 10
    v_max_participants := COALESCE(v_max_participants, 10);
    
    -- Calculate if timer should start after this join
    v_should_start_timer := (v_current_count + 1) >= v_max_participants;
    
    RAISE NOTICE '📊 TIMER CHECK: current=%, max=%, new_count=%, should_start=%', 
        v_current_count, v_max_participants, v_current_count + 1, v_should_start_timer;
    
    -- Check not already joined (UUID = UUID, hot sell method)
    IF EXISTS(
        SELECT 1 FROM winner_takes_all_participants 
        WHERE session_id = v_session_uuid
        AND user_id = p_user
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;
    
    -- Deduct tokens (purchased first)
    IF v_purchased >= p_fee THEN
        UPDATE users
        SET purchased_tokens = purchased_tokens - p_fee
        WHERE id = p_user;
        
        INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
        VALUES (p_user, 'debit', 'game_entry', p_fee, 'Winner Takes All entry');
    ELSE
        UPDATE users
        SET 
            purchased_tokens = 0,
            won_tokens = won_tokens - (p_fee - v_purchased)
        WHERE id = p_user;
        
        INSERT INTO token_transactions (user_id, type, transaction_type, amount, description)
        VALUES (p_user, 'debit', 'game_entry', p_fee, 'WTA entry (mixed wallets)');
    END IF;
    
    -- Get RNG seed for fair gameplay (UUID = UUID, hot sell method)
    SELECT rng_seed INTO v_rng_seed
    FROM winner_takes_all_sessions
    WHERE id = v_session_uuid;
    
    -- Generate participant ID (UUID, hot sell method)
    v_participant_id := gen_random_uuid();
    
    -- Get username for participant record
    SELECT username INTO v_username FROM users WHERE id = p_user;
    
    -- Add participant (UUID values with username - hot sell method)
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, COALESCE(v_username, 'Anonymous'), NOW());
    
    -- Update session and START TIMER when progress bar hits 100% (max_participants reached)
    -- Note: Users can still join AFTER timer starts to add more to the pool
    UPDATE winner_takes_all_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        prize_pool = COALESCE(prize_pool, 0) + p_fee,
        status = CASE 
            -- Start timer when we reach max_participants (progress bar at 100%)
            WHEN COALESCE(participants_count, 0) + 1 >= v_max_participants AND timer_started_at IS NULL THEN 'active'
            ELSE status 
        END,
        timer_started_at = CASE
            -- Start timer when progress bar hits 100% (max_participants reached)
            WHEN COALESCE(participants_count, 0) + 1 >= v_max_participants AND timer_started_at IS NULL THEN NOW()
            ELSE timer_started_at
        END,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    -- Log if timer was started
    IF v_should_start_timer THEN
        RAISE NOTICE '⏰ TIMER STARTED! Session reached threshold: % >= %', 
            v_current_count + 1, v_max_participants;
    END IF;
    
    -- Update rate limits
    INSERT INTO user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
    VALUES (p_user, 1, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        games_last_hour = user_rate_limits.games_last_hour + 1,
        games_last_day = user_rate_limits.games_last_day + 1,
        last_game_at = NOW();
    
    RAISE NOTICE '✅ SUCCESS: participant=%', v_participant_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed,
        'timer_should_start', v_should_start_timer,
        'participants_count', v_current_count + 1,
        'max_participants', v_max_participants
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wta_join_v2 error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'System error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

SELECT '✅ Enhanced wta_join_v2 function with better logging and diagnostics' as status;

