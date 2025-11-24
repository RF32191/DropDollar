-- ============================================================================
-- 🚨 URGENT FIX: 1V1 PAYOUT + RESET FOR ALL LISTINGS
-- ============================================================================
-- Run this ONE file to fix ALL 1v1 listings on the page
-- This will make payout and reset work for ALL games (Sword, Blade, Laser, etc.)
-- ============================================================================

-- ============================================================================
-- STEP 1: RESET ALL 1V1 SESSIONS (CLEAN SLATE)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔄 =======================================';
    RAISE NOTICE '🔄 RESETTING ALL 1V1 SESSIONS';
    RAISE NOTICE '🔄 =======================================';
    
    -- Delete all participants
    DELETE FROM public.one_v_one_participants;
    RAISE NOTICE '✅ Cleared all participants';
    
    -- Reset all sessions
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
    
    RAISE NOTICE '✅ Reset all sessions to waiting';
    RAISE NOTICE '🔄 =======================================';
END $$;

-- ============================================================================
-- STEP 2: ENSURE ALL USERS HAVE DEFAULT TOKEN VALUES
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
-- STEP 3: FIX PAYOUT FUNCTION (WORKS FOR ALL GAME TYPES)
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
    RAISE NOTICE '💰 ======================================';
    RAISE NOTICE '💰 1V1 PAYOUT STARTING';
    RAISE NOTICE '💰 Config ID: %', config_id_param;
    RAISE NOTICE '💰 ======================================';
    
    -- Find active session
    SELECT * INTO session_record
    FROM public.one_v_one_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ No active session found';
        RETURN jsonb_build_object('success', false, 'message', 'No active session');
    END IF;
    
    RAISE NOTICE '📊 Session ID: %', session_record.id;
    RAISE NOTICE '📊 Participants: %', session_record.participants_count;
    RAISE NOTICE '📊 Pot: % tokens', session_record.current_pot;

    -- Check if already paid
    IF session_record.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Already paid out';
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    -- Need 2 players
    IF session_record.participants_count < 2 THEN
        RAISE NOTICE '❌ Only % player(s)', session_record.participants_count;
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;

    -- Count completed games
    SELECT COUNT(*) INTO v_completed_count
    FROM public.one_v_one_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;
    
    RAISE NOTICE '📊 Completed games: %', v_completed_count;

    IF v_completed_count < 2 THEN
        RAISE NOTICE '⏸️ Waiting for both to complete';
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
        RAISE NOTICE '❌ No winner found';
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
    
    IF total_pot <= 0 THEN
        RAISE NOTICE '❌ Empty pot';
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    RAISE NOTICE '🏆 WINNER: % (score: %) = % tokens', winner_record.username, winner_record.score, v_winner_payout;
    RAISE NOTICE '🥈 LOSER: % (score: %) = % tokens', loser_record.username, loser_record.score, v_loser_payout;
    RAISE NOTICE '💼 PLATFORM FEE: % tokens', v_platform_fee;

    -- Pay winner
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    RAISE NOTICE '✅ Winner paid!';

    -- Pay loser
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout,
        updated_at = NOW()
    WHERE id = loser_record.user_id;
    
    RAISE NOTICE '✅ Loser paid!';

    -- Mark session completed
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
    
    RAISE NOTICE '✅ Session marked completed';

    -- Wait 2 seconds then reset for next game
    PERFORM pg_sleep(2);
    PERFORM reset_1v1_session(config_id_param);
    
    RAISE NOTICE '✅ Session reset - ready for next game!';
    RAISE NOTICE '💰 ======================================';
    RAISE NOTICE '💰 PAYOUT COMPLETE!';
    RAISE NOTICE '💰 ======================================';

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
    RAISE NOTICE '❌ FATAL ERROR: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 4: FIX RESET FUNCTION (WORKS FOR ALL GAME TYPES)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_1v1_session(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    RAISE NOTICE '🔄 Resetting session for config: %', config_id_param;
    
    -- Get completed session
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
    
    -- Delete participants
    DELETE FROM public.one_v_one_participants WHERE session_id = v_session_id;
    
    -- Reset session to waiting
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
    
    RETURN jsonb_build_object('success', true, 'message', 'Reset complete');
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Reset error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_1v1_session(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 5: REMOVE TIME-BASED BLOCKING (ONLY BLOCK WHEN FULL)
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
    
    SELECT COALESCE(participants_count, 0)
    INTO v_current_count
    FROM one_v_one_sessions
    WHERE id = v_session_uuid
    AND status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- 🔥 ONLY block when full (no time check!)
    IF v_current_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing full - 2 players maximum');
    END IF;
    
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM users WHERE id = p_user;
    
    IF (v_purchased + v_won) < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= p_fee THEN
        UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
    END IF;
    
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = p_user;
    
    INSERT INTO one_v_one_participants (session_id, user_id, username, entry_fee, rng_seed)
    VALUES (v_session_uuid, p_user, COALESCE(v_username, 'Player'), p_fee, v_rng_seed)
    RETURNING id INTO v_participant_id;
    
    UPDATE one_v_one_sessions
    SET participants_count = participants_count + 1,
        current_pot = current_pot + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    SELECT participants_count INTO v_current_count FROM one_v_one_sessions WHERE id = v_session_uuid;
    
    IF v_current_count = 1 THEN
        UPDATE one_v_one_sessions
        SET timer_started_at = NOW(), status = 'active'
        WHERE id = v_session_uuid;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'participants_count', v_current_count,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_one_v_one_session(UUID, TEXT, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- ✅ SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ ALL 1V1 LISTINGS FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ All sessions reset';
  RAISE NOTICE '✅ Payout function updated';
  RAISE NOTICE '✅ Reset function updated';
  RAISE NOTICE '✅ No time blocking (only blocks when full)';
  RAISE NOTICE '✅ NULL-safe token operations';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 THIS FIX APPLIES TO:';
  RAISE NOTICE '   ⚔️ Sword Slash 1v1';
  RAISE NOTICE '   🛡️ Blade Bounce 1v1';
  RAISE NOTICE '   🚀 Laser Dodge 1v1';
  RAISE NOTICE '   🎯 Multi-Target 1v1';
  RAISE NOTICE '   💰 Coin Catch 1v1';
  RAISE NOTICE '   🎨 Color Memory 1v1';
  RAISE NOTICE '   💵 Cash Stack 1v1';
  RAISE NOTICE '   ⚡ Quick Click 1v1';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST NOW:';
  RAISE NOTICE '   1. Two players join ANY 1v1 listing';
  RAISE NOTICE '   2. Both complete the game';
  RAISE NOTICE '   3. 10-second countdown appears';
  RAISE NOTICE '   4. Winner gets 50%%, loser gets 35%%';
  RAISE NOTICE '   5. Session resets automatically';
  RAISE NOTICE '   6. Listing goes back to "waiting"';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check Supabase Logs for detailed payout info!';
  RAISE NOTICE '✅ ========================================';
END $$;

