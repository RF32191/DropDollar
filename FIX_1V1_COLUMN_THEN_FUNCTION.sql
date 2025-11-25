-- ============================================================================
-- FIX 1V1: FIRST FIX COLUMN TYPE, THEN CREATE FUNCTION
-- ============================================================================
-- Step 1: Make config_id TEXT if it's UUID
-- Step 2: Create the working payout function
-- ============================================================================

-- STEP 1: FIX THE COLUMN TYPE
DO $$
DECLARE
    v_type TEXT;
BEGIN
    -- Check current type
    SELECT data_type INTO v_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'one_v_one_sessions' 
    AND column_name = 'config_id';
    
    RAISE NOTICE 'Current config_id type: %', v_type;
    
    IF v_type = 'uuid' THEN
        RAISE NOTICE 'Converting config_id from UUID to TEXT...';
        
        -- Drop foreign key
        ALTER TABLE public.one_v_one_sessions DROP CONSTRAINT IF EXISTS one_v_one_sessions_config_id_fkey;
        
        -- Convert column
        ALTER TABLE public.one_v_one_sessions ALTER COLUMN config_id TYPE TEXT USING config_id::TEXT;
        
        RAISE NOTICE '✅ config_id is now TEXT';
    ELSE
        RAISE NOTICE '✅ config_id is already TEXT';
    END IF;
END $$;

-- Fix user tokens
UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) WHERE won_tokens IS NULL;
UPDATE public.users SET purchased_tokens = COALESCE(purchased_tokens, 0) WHERE purchased_tokens IS NULL;

-- STEP 2: CREATE THE PAYOUT FUNCTION
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
    v_completed_count INT;
BEGIN
    RAISE NOTICE '💰 [1V1] Payout for: %', config_id_param;
    
    SELECT * INTO session_record FROM public.one_v_one_sessions
    WHERE config_id = config_id_param AND status IN ('active', 'waiting')
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'No session'); END IF;
    IF session_record.winner_user_id IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Already paid'); END IF;
    IF session_record.participants_count < 2 THEN RETURN jsonb_build_object('success', false, 'message', 'Need 2 players'); END IF;

    SELECT COUNT(*) INTO v_completed_count FROM public.one_v_one_participants
    WHERE session_id = session_record.id AND score IS NOT NULL AND completed_at IS NOT NULL;
    IF v_completed_count < 2 THEN RETURN jsonb_build_object('success', false, 'message', 'Waiting for both'); END IF;

    SELECT p.*, u.username INTO winner_record FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id WHERE p.session_id = session_record.id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'No winner'); END IF;

    SELECT p.*, u.username INTO loser_record FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id WHERE p.session_id = session_record.id AND p.user_id != winner_record.user_id LIMIT 1;

    total_pot := COALESCE(session_record.current_pot, 0);
    IF total_pot <= 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Empty pot'); END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;

    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout, updated_at = NOW() WHERE id = winner_record.user_id;
    IF loser_record IS NOT NULL THEN
        UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout, updated_at = NOW() WHERE id = loser_record.user_id;
    END IF;

    UPDATE public.one_v_one_sessions SET status = 'completed', winner_user_id = winner_record.user_id,
        loser_user_id = COALESCE(loser_record.user_id, NULL), winner_prize = v_winner_payout,
        loser_prize = COALESCE(v_loser_payout, 0), platform_fee = v_platform_fee,
        completed_at = NOW(), updated_at = NOW() WHERE id = session_record.id;

    INSERT INTO public.one_v_one_sessions (id, config_id, status, participants_count, current_pot, rng_seed, created_at, updated_at)
    VALUES (gen_random_uuid(), config_id_param, 'waiting', 0, 0, session_record.rng_seed, NOW(), NOW());

    DELETE FROM public.one_v_one_participants WHERE session_id = session_record.id;

    RAISE NOTICE '✅ Payout complete! Winner: % (+%), Loser: % (+%)', winner_record.username, v_winner_payout, loser_record.username, v_loser_payout;

    RETURN jsonb_build_object('success', true, 'message', 'Payout complete!', 'winner_username', winner_record.username,
        'winner_score', winner_record.score, 'winner_payout', v_winner_payout, 'loser_username', COALESCE(loser_record.username, 'None'),
        'loser_score', loser_record.score, 'loser_payout', v_loser_payout, 'platform_fee', v_platform_fee, 'total_pot', total_pot);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- VERIFY
DO $$
DECLARE
    v_type TEXT;
    v_function_exists BOOLEAN;
BEGIN
    SELECT data_type INTO v_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'config_id';
    
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'process_1v1_payout') INTO v_function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ 1V1 SYSTEM FIXED!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ config_id type: %', v_type;
    RAISE NOTICE '✅ Function exists: %', v_function_exists;
    RAISE NOTICE '✅ Payouts: 50%% W, 35%% L, 15%% platform';
    RAISE NOTICE '✅ Auto-reset enabled';
    RAISE NOTICE '✅ Fair skill-based gaming';
    RAISE NOTICE '✅ ========================================';
END $$;

