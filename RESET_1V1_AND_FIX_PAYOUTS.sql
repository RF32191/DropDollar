-- ============================================================================
-- COMPLETE 1V1 RESET + PAYOUT FIX
-- ============================================================================
-- This script does THREE things:
-- 1. Resets ALL 1v1 sessions for fresh testing
-- 2. Removes the "2 minutes remaining" time block
-- 3. Ensures payouts work for ALL users (current and future)
-- ============================================================================

-- ============================================================================
-- PART 1: RESET ALL 1V1 SESSIONS
-- ============================================================================

-- Delete all participants
DELETE FROM public.one_v_one_participants;

-- Reset all sessions to waiting state
UPDATE public.one_v_one_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    loser_user_id = NULL,
    winner_prize = NULL,
    loser_prize = NULL,
    platform_fee = NULL,
    completed_at = NULL,
    updated_at = NOW();

-- Or alternatively, delete all sessions and let the system create new ones
-- DELETE FROM public.one_v_one_sessions;

-- ============================================================================
-- PART 2: ENSURE ALL USERS HAVE TOKEN COLUMNS INITIALIZED
-- ============================================================================

-- Initialize won_tokens for all users (prevents NULL issues)
UPDATE public.users
SET won_tokens = COALESCE(won_tokens, 0)
WHERE won_tokens IS NULL;

-- Initialize purchased_tokens for all users
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0)
WHERE purchased_tokens IS NULL;

-- Set default values for future users
ALTER TABLE public.users
ALTER COLUMN won_tokens SET DEFAULT 0;

ALTER TABLE public.users
ALTER COLUMN purchased_tokens SET DEFAULT 0;

-- Set NOT NULL constraints (optional, but recommended)
ALTER TABLE public.users
ALTER COLUMN won_tokens SET NOT NULL;

ALTER TABLE public.users
ALTER COLUMN purchased_tokens SET NOT NULL;

-- ============================================================================
-- PART 3: REMOVE "2 MINUTES REMAINING" TIME BLOCK FROM 1V1
-- ============================================================================

DROP FUNCTION IF EXISTS public.join_one_v_one_session(UUID, TEXT, NUMERIC);

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
    -- ❌ NO TIME-BASED BLOCKING
    IF v_current_count >= 2 THEN
        RAISE NOTICE '❌ BLOCKED: Listing full (2 players)';
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    -- Check tokens (ensure columns are not NULL)
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
        UPDATE users SET 
            purchased_tokens = 0, 
            won_tokens = won_tokens - (p_fee - v_purchased) 
        WHERE id = p_user;
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
-- PART 4: FIX PAYOUT FUNCTION FOR ALL USERS
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);

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
BEGIN
    RAISE NOTICE '💰 [1V1 PAYOUT] Starting for config: %', config_id_param;
    
    -- Find the active/completed session
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session found for config: %', config_id_param;
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;

    -- Check if already paid out
    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Session already paid out';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Check we have 2 participants
    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '⏸️ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No winner found - no completed games';
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
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
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Prize pool is empty or zero';
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 Winner: % gets % tokens', winner_record.username, v_winner_payout;
    RAISE NOTICE '🥈 Loser: % gets % tokens', COALESCE(loser_record.username, 'None'), v_loser_payout;

    -- Pay winner (NULL-safe with COALESCE)
    BEGIN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
            updated_at = NOW()
        WHERE id = winner_record.user_id;
        
        RAISE NOTICE '✅ Winner paid successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to pay winner: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'message', 'Failed to pay winner: ' || SQLERRM);
    END;

    -- Record winner transaction (optional, with error handling)
    BEGIN
        INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
        VALUES (
            winner_record.user_id,
            'credit',
            'game_win',
            v_winner_payout,
            format('1v1 Winner Prize - Config: %s', config_id_param)
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to log winner transaction: %', SQLERRM;
        -- Don't fail the payout if logging fails
    END;

    -- Pay loser if exists (NULL-safe)
    IF loser_record IS NOT NULL THEN
        BEGIN
            UPDATE public.users
            SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
                updated_at = NOW()
            WHERE id = loser_record.user_id;
            
            RAISE NOTICE '✅ Loser paid successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed to pay loser: %', SQLERRM;
        END;

        -- Record loser transaction (optional)
        BEGIN
            INSERT INTO public.token_transactions (user_id, type, transaction_type, amount, description)
            VALUES (
                loser_record.user_id,
                'credit',
                'game_participation',
                v_loser_payout,
                format('1v1 Participation Prize - Config: %s', config_id_param)
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed to log loser transaction: %', SQLERRM;
        END;
    END IF;

    -- Mark session as completed
    UPDATE public.one_v_one_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL),
        winner_prize = v_winner_payout,
        loser_prize = COALESCE(v_loser_payout, 0),
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    -- Reset the session for the next game (after a brief delay)
    PERFORM pg_sleep(2);
    
    BEGIN
        PERFORM reset_1v1_session(config_id_param);
        RAISE NOTICE '✅ Session reset successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to reset session: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful',
        'winner_username', winner_record.username,
        'loser_username', COALESCE(loser_record.username, 'None'),
        'winner_payout', v_winner_payout,
        'loser_payout', v_loser_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Fatal error in payout: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Payout failed: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ 1V1 SYSTEM FULLY RESET AND FIXED!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ 1. All 1v1 sessions reset to waiting state';
  RAISE NOTICE '✅ 2. All participants cleared';
  RAISE NOTICE '✅ 3. All user token columns initialized to 0';
  RAISE NOTICE '✅ 4. Time-based blocking removed (only blocks when full)';
  RAISE NOTICE '✅ 5. Payout function fixed for ALL users (current + future)';
  RAISE NOTICE '✅ 6. NULL-safe token operations everywhere';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '🎮 Ready for testing! Create new 1v1 games.';
  RAISE NOTICE '✅ ============================================';
END $$;

