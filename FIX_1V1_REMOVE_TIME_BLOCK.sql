-- ============================================================================
-- FIX: Remove "2 Minutes Remaining" Block from 1v1 Games
-- ============================================================================
-- For 1v1 games, we should ONLY block when the listing is full (2 players),
-- NOT based on time remaining. This removes the time-based restriction.
-- ============================================================================

-- Fix the join_one_v_one_session function to remove time-based blocking
CREATE OR REPLACE FUNCTION public.join_one_v_one_session(
    p_user UUID,
    p_session TEXT,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_participant_id UUID;
    v_rng_seed INT;
    v_username TEXT;
    v_current_count INT;
BEGIN
    -- Convert to UUID
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%', v_session_uuid;
    
    -- Get current participant count
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or completed');
    END IF;
    
    -- ✅ ONLY block if 2 players already (1v1 = max 2 players)
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- ❌ REMOVED: Time-based blocking logic
    -- For 1v1, we don't care about time remaining, only if the listing is full
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = p_user;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens (use purchased first, then won)
    IF v_purchased >= p_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    END IF;
    
    -- Get RNG seed and username
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = p_user;
    
    -- Add participant
    INSERT INTO one_v_one_participants (session_id, user_id, username, entry_fee, rng_seed)
    VALUES (v_session_uuid, p_user, COALESCE(v_username, 'Player'), p_fee, v_rng_seed)
    RETURNING id INTO v_participant_id;
    
    -- Increment participant count
    UPDATE one_v_one_sessions
    SET participants_count = participants_count + 1,
        current_pot = current_pot + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    -- Get updated count
    SELECT participants_count INTO v_current_count FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Player joined! Total: %', v_current_count;
    
    -- Start timer when first player joins
    IF v_current_count = 1 THEN
        UPDATE one_v_one_sessions
        SET timer_started_at = NOW(),
            status = 'active'
        WHERE id = v_session_uuid AND timer_started_at IS NULL;
        
        RAISE NOTICE '⏰ Timer started (first player joined)';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'message', 'Successfully joined!',
        'participants_count', v_current_count,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_one_v_one_session(UUID, TEXT, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- ALSO FIX: The old join_one_v_one_session_v2 function if it exists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_one_v_one_session_v2(
    user_id_param UUID,
    session_id_param TEXT,
    entry_fee_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_uuid UUID;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_participant_id UUID;
    v_rng_seed INT;
    v_username TEXT;
    v_current_count INT;
BEGIN
    -- Convert to UUID
    BEGIN
        v_session_uuid := session_id_param::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%', v_session_uuid;
    
    -- Get current participant count
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or completed');
    END IF;
    
    -- ✅ ONLY block if 2 players already
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- ❌ REMOVED: Time-based blocking
    
    -- Check tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF (v_purchased + v_won) < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Check not already joined
    IF EXISTS(
        SELECT 1 FROM one_v_one_participants 
        WHERE session_id = v_session_uuid
        AND user_id = user_id_param
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_purchased) WHERE id = user_id_param;
    END IF;
    
    -- Get RNG seed and username
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = user_id_param;
    
    -- Add participant
    INSERT INTO one_v_one_participants (session_id, user_id, username, entry_fee, rng_seed)
    VALUES (v_session_uuid, user_id_param, COALESCE(v_username, 'Player'), entry_fee_param, v_rng_seed)
    RETURNING id INTO v_participant_id;
    
    -- Increment participant count and pot
    UPDATE one_v_one_sessions
    SET participants_count = participants_count + 1,
        current_pot = current_pot + entry_fee_param,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    -- Get updated count
    SELECT participants_count INTO v_current_count FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Player joined! Total: %', v_current_count;
    
    -- Start timer when first player joins
    IF v_current_count = 1 THEN
        UPDATE one_v_one_sessions
        SET timer_started_at = NOW(),
            status = 'active'
        WHERE id = v_session_uuid AND timer_started_at IS NULL;
        
        RAISE NOTICE '⏰ Timer started (first player joined)';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'message', 'Successfully joined!',
        'participants_count', v_current_count,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_one_v_one_session_v2(UUID, TEXT, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 1v1 time-based blocking removed!';
  RAISE NOTICE '✅ 1v1 games now ONLY block when 2 players are in (full)';
  RAISE NOTICE '✅ Players can join at any time as long as there''s space';
END $$;

