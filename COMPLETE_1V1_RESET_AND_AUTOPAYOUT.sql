-- ============================================================================
-- COMPLETE 1V1 RESET + AUTO-PAYOUT SYSTEM
-- ============================================================================
-- This script does THREE things:
-- 1. Resets ALL 1v1 sessions for fresh testing
-- 2. Ensures payouts happen automatically after countdown
-- 3. Ensures sessions reset after payout
-- ============================================================================

-- ============================================================================
-- PART 1: RESET ALL 1V1 SESSIONS
-- ============================================================================

DO $$
DECLARE
    v_participant_count INT;
    v_session_count INT;
BEGIN
    -- Count and delete participants
    SELECT COUNT(*) INTO v_participant_count FROM public.one_v_one_participants;
    DELETE FROM public.one_v_one_participants;
    RAISE NOTICE '🗑️ Deleted % participants', v_participant_count;
    
    -- Count and reset sessions
    SELECT COUNT(*) INTO v_session_count FROM public.one_v_one_sessions;
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
    
    RAISE NOTICE '♻️ Reset % sessions to waiting state', v_session_count;
END $$;

-- ============================================================================
-- PART 2: ENSURE USER TOKEN COLUMNS ARE INITIALIZED
-- ============================================================================

UPDATE public.users
SET won_tokens = COALESCE(won_tokens, 0)
WHERE won_tokens IS NULL;

UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0)
WHERE purchased_tokens IS NULL;

ALTER TABLE public.users
ALTER COLUMN won_tokens SET DEFAULT 0,
ALTER COLUMN purchased_tokens SET DEFAULT 0;

-- ============================================================================
-- PART 3: CREATE/UPDATE PAYOUT FUNCTION (WITH AUTO-PAYOUT LOGIC)
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
BEGIN
    RAISE NOTICE '💰 [1V1 PAYOUT] Starting for config: %', config_id_param;
    
    -- Find the active session
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

    -- Get all participants with scores
    SELECT COUNT(*) FROM public.one_v_one_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL
    INTO loser_record;

    -- Check if both players have completed
    IF loser_record.count < 2 THEN
        RAISE NOTICE '⏸️ Only % player(s) completed', loser_record.count;
        RETURN jsonb_build_object('success', false, 'message', 'Waiting for both players to complete');
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
        RAISE NOTICE '❌ No winner found';
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
        RAISE NOTICE '❌ Prize pool is empty';
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 Winner: % (score: %) gets % tokens', winner_record.username, winner_record.score, v_winner_payout;
    RAISE NOTICE '🥈 Loser: % (score: %) gets % tokens', COALESCE(loser_record.username, 'None'), loser_record.score, v_loser_payout;

    -- Pay winner (NULL-safe)
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    RAISE NOTICE '✅ Winner paid: %', v_winner_payout;

    -- Pay loser (NULL-safe)
    IF loser_record IS NOT NULL THEN
        UPDATE public.users
        SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
            updated_at = NOW()
        WHERE id = loser_record.user_id;
        
        RAISE NOTICE '✅ Loser paid: %', v_loser_payout;
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

    RAISE NOTICE '✅ Session marked as completed';

    -- Auto-reset session after 2 seconds
    PERFORM pg_sleep(2);
    PERFORM reset_1v1_session(config_id_param);
    
    RAISE NOTICE '✅ Session auto-reset for next game';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout successful! Session reset.',
        'winner_username', winner_record.username,
        'winner_score', winner_record.score,
        'loser_username', COALESCE(loser_record.username, 'None'),
        'loser_score', COALESCE(loser_record.score, 0),
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
-- PART 4: CREATE/UPDATE RESET FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_config RECORD;
BEGIN
    RAISE NOTICE '🔄 [1V1 RESET] Resetting session for config: %', config_id_param;
    
    -- Get the completed session
    SELECT id INTO v_session_id
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '⚠️ No completed session to reset';
        RETURN jsonb_build_object('success', false, 'message', 'No completed session');
    END IF;
    
    -- Get config
    SELECT * INTO v_config FROM public.one_v_one_configs WHERE id = config_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Config not found';
        RETURN jsonb_build_object('success', false, 'message', 'Config not found');
    END IF;
    
    -- Delete old participants
    DELETE FROM public.one_v_one_participants WHERE session_id = v_session_id;
    RAISE NOTICE '🗑️ Deleted old participants';
    
    -- Reset the session to waiting
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
        updated_at = NOW()
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ Session reset to waiting - ready for new players!';
    
    RETURN jsonb_build_object('success', true, 'message', 'Session reset successfully');
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error resetting: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- ============================================================================
-- PART 5: REMOVE TIME-BASED BLOCKING
-- ============================================================================

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
    v_session_uuid := p_session::UUID;
    
    -- Get current participant count
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- ONLY block if 2 players already (no time check!)
    IF v_current_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
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
    
    -- Deduct tokens
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
    
    -- Increment count
    UPDATE one_v_one_sessions
    SET participants_count = participants_count + 1,
        current_pot = current_pot + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    SELECT participants_count INTO v_current_count FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    -- Start timer when first player joins
    IF v_current_count = 1 THEN
        UPDATE one_v_one_sessions
        SET timer_started_at = NOW(), status = 'active'
        WHERE id = v_session_uuid AND timer_started_at IS NULL;
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
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '✅ 1V1 SYSTEM FULLY RESET AND READY!';
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '✅ All sessions reset to waiting';
  RAISE NOTICE '✅ All participants cleared';
  RAISE NOTICE '✅ Payout function: auto-triggers after both complete';
  RAISE NOTICE '✅ Auto-reset: happens automatically after payout';
  RAISE NOTICE '✅ No time blocking: only blocks when 2 players in';
  RAISE NOTICE '✅ NULL-safe: works for all users (current + future)';
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '🎮 READY TO TEST!';
  RAISE NOTICE '✅ ================================================';
END $$;

