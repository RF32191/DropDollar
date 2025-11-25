-- ============================================================================
-- 1V1 FUNCTIONS ONLY - MINIMAL UPDATE
-- ============================================================================
-- Only creates/updates functions, doesn't touch tables
-- Safe to run without deadlocks
-- ============================================================================

-- ============================================================================
-- PART 1: DROP OLD FUNCTIONS (without CASCADE to avoid deadlocks)
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);
DROP FUNCTION IF EXISTS public.process_1v1_payout(UUID);
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.join_1v1_session(UUID, UUID, NUMERIC);

-- ============================================================================
-- PART 2: CREATE JOIN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_1v1_session(
    session_id_param TEXT,
    user_id_param UUID,
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
    
    RAISE NOTICE '🎮 1V1 JOIN: session=%, user=%', v_session_uuid, user_id_param;
    
    -- Get current participant count (with row lock for concurrency)
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active')
    FOR UPDATE SKIP LOCKED;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or locked');
    END IF;
    
    -- Block if 2 players already (1v1 = max 2 players)
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check tokens (ensure NULL-safety)
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
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens (use purchased first, then won) - ATOMIC operation
    IF v_purchased >= entry_fee_param THEN
        UPDATE users 
        SET purchased_tokens = COALESCE(purchased_tokens, 0) - entry_fee_param,
            updated_at = NOW()
        WHERE id = user_id_param;
    ELSE
        UPDATE users 
        SET purchased_tokens = 0, 
            won_tokens = COALESCE(won_tokens, 0) - (entry_fee_param - v_purchased),
            updated_at = NOW()
        WHERE id = user_id_param;
    END IF;
    
    -- Get RNG seed and username
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = user_id_param;
    
    -- Add participant (ATOMIC operation)
    INSERT INTO one_v_one_participants (session_id, user_id, username, entry_fee, rng_seed, joined_at)
    VALUES (v_session_uuid, user_id_param, COALESCE(v_username, 'Player'), entry_fee_param, v_rng_seed, NOW())
    RETURNING id INTO v_participant_id;
    
    -- Increment participant count and pot (ATOMIC operation)
    UPDATE one_v_one_sessions
    SET participants_count = participants_count + 1,
        current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        status = CASE WHEN participants_count + 1 >= 2 THEN 'active' ELSE 'waiting' END,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    -- Get updated count
    SELECT participants_count INTO v_current_count FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    RAISE NOTICE '✅ Player joined! Total: %, Pot: %', v_current_count, entry_fee_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'message', 'Successfully joined!',
        'participants_count', v_current_count,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ 1v1 join error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- PART 3: CREATE PAYOUT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_1v1_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    loser_record RECORD;
    total_pot NUMERIC;
    v_winner_payout NUMERIC;
    v_loser_payout NUMERIC;
    v_platform_fee NUMERIC;
    v_completed_count INT;
BEGIN
    RAISE NOTICE '💰 [1V1 PAYOUT] Starting for config: %', config_id_param;
    
    -- Find active session with FOR UPDATE lock to prevent race conditions
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session found for config: %', config_id_param;
        RETURN jsonb_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if already paid
    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Session already paid out';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Need 2 players
    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '⏸️ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;

    -- Count completed games
    SELECT COUNT(*) INTO v_completed_count
    FROM public.one_v_one_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;

    RAISE NOTICE '📊 Completed players: %/2', v_completed_count;

    IF v_completed_count < 2 THEN
        RAISE NOTICE '⏸️ Waiting for both players to finish';
        RETURN jsonb_build_object('success', false, 'message', 'Waiting for both to complete');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner');
    END IF;

    -- Get loser
    SELECT p.*, u.username, u.email
    INTO loser_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.user_id != winner_record.user_id
    LIMIT 1;

    -- Calculate payouts
    total_pot := COALESCE(session_record.current_pot, 0);
    
    RAISE NOTICE '💰 Total pot: % tokens', total_pot;
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Empty pot - cannot pay out';
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;
    
    RAISE NOTICE '💵 Payouts: Winner=%, Loser=%, Platform=%', v_winner_payout, v_loser_payout, v_platform_fee;

    -- Pay winner (atomic operation)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    -- Pay loser (atomic operation)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
        updated_at = NOW()
    WHERE id = loser_record.user_id;

    -- Mark session completed (atomic operation)
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = loser_record.user_id,
        winner_prize = v_winner_payout,
        loser_prize = v_loser_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    -- Create new session immediately (don't wait for reset)
    -- Only if one doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM public.one_v_one_sessions 
        WHERE config_id = config_id_param
        AND status = 'waiting'
    ) THEN
        BEGIN
            INSERT INTO public.one_v_one_sessions (
                id, config_id, status, participants_count, current_pot, 
                rng_seed, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                config_id_param,
                'waiting',
                0,
                0,
                session_record.rng_seed,
                NOW(),
                NOW()
            );
            RAISE NOTICE '✅ Created new waiting session for config: %', config_id_param;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create new session (may already exist): %', SQLERRM;
        END;
    END IF;

    -- Delete old participants
    DELETE FROM public.one_v_one_participants WHERE session_id = session_record.id;

    RAISE NOTICE '✅ ======================================';
    RAISE NOTICE '✅ PAYOUT COMPLETE!';
    RAISE NOTICE '✅ Winner: % (Score: %) = % tokens', winner_record.username, winner_record.score, v_winner_payout;
    RAISE NOTICE '✅ Loser: % (Score: %) = % tokens', loser_record.username, loser_record.score, v_loser_payout;
    RAISE NOTICE '✅ Platform fee: % tokens', v_platform_fee;
    RAISE NOTICE '✅ New session created for config: %', config_id_param;
    RAISE NOTICE '✅ ======================================';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout complete!',
        'winner_username', winner_record.username,
        'winner_score', winner_record.score,
        'winner_payout', v_winner_payout,
        'loser_username', loser_record.username,
        'loser_score', loser_record.score,
        'loser_payout', v_loser_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ 1v1 payout error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ 1V1 FUNCTIONS UPDATED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ join_1v1_session - READY';
  RAISE NOTICE '✅ process_1v1_payout - READY';
  RAISE NOTICE '✅ Type casting fixed (TEXT ↔ UUID)';
  RAISE NOTICE '✅ Row-level locking enabled';
  RAISE NOTICE '✅ Atomic operations for payouts';
  RAISE NOTICE '✅ Auto-session creation on payout';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 READY TO TEST:';
  RAISE NOTICE '   1. Join as 2 users';
  RAISE NOTICE '   2. Complete both games';
  RAISE NOTICE '   3. Wait for 10-second countdown';
  RAISE NOTICE '   4. Winner gets 50%%, loser gets 35%%';
  RAISE NOTICE '   5. Listing resets automatically';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
END $$;

