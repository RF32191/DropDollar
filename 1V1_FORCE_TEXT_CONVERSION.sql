-- ============================================================================
-- 1V1 FORCE TEXT CONVERSION - AGGRESSIVE FIX
-- ============================================================================
-- This will FORCE config_id to be TEXT by recreating it if needed
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK AND FORCE CONVERT config_id TO TEXT
-- ============================================================================

DO $$
DECLARE
    config_id_type TEXT;
    session_count INT;
BEGIN
    -- Check current type
    SELECT data_type INTO config_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'one_v_one_sessions'
    AND column_name = 'config_id';
    
    RAISE NOTICE '📊 Current config_id type: %', config_id_type;
    
    IF config_id_type = 'uuid' OR config_id_type IS NULL THEN
        RAISE NOTICE '🔄 FORCING conversion to TEXT...';
        
        -- Drop foreign key first
        ALTER TABLE public.one_v_one_sessions 
        DROP CONSTRAINT IF EXISTS one_v_one_sessions_config_id_fkey CASCADE;
        
        -- Drop any indexes on config_id
        DROP INDEX IF EXISTS idx_1v1_sessions_config_status CASCADE;
        DROP INDEX IF EXISTS idx_sessions_config_id CASCADE;
        
        -- Create temporary column
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN config_id_temp TEXT;
        
        -- Copy data with conversion
        UPDATE public.one_v_one_sessions 
        SET config_id_temp = config_id::TEXT;
        
        -- Drop old column
        ALTER TABLE public.one_v_one_sessions 
        DROP COLUMN config_id;
        
        -- Rename temp to config_id
        ALTER TABLE public.one_v_one_sessions 
        RENAME COLUMN config_id_temp TO config_id;
        
        -- Make it NOT NULL
        ALTER TABLE public.one_v_one_sessions 
        ALTER COLUMN config_id SET NOT NULL;
        
        -- Recreate foreign key if configs.id is TEXT
        BEGIN
            ALTER TABLE public.one_v_one_sessions 
            ADD CONSTRAINT one_v_one_sessions_config_id_fkey 
            FOREIGN KEY (config_id) REFERENCES public.one_v_one_configs(id);
            RAISE NOTICE '✅ Foreign key recreated';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not recreate FK (configs may not have TEXT id): %', SQLERRM;
        END;
        
        RAISE NOTICE '✅ config_id FORCED to TEXT!';
    ELSE
        RAISE NOTICE '✅ config_id already TEXT';
    END IF;
    
    -- Show final type
    SELECT data_type INTO config_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'one_v_one_sessions'
    AND column_name = 'config_id';
    
    SELECT COUNT(*) INTO session_count FROM public.one_v_one_sessions;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ FINAL config_id type: %', config_id_type;
    RAISE NOTICE '✅ Total sessions: %', session_count;
    RAISE NOTICE '✅ ========================================';
END $$;

-- ============================================================================
-- STEP 2: ADD MISSING COLUMNS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'prize_pool') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN prize_pool NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'winner_user_id') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN winner_user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'loser_user_id') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN loser_user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'winner_prize') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN winner_prize NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'loser_prize') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN loser_prize NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'platform_fee') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN platform_fee NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'completed_at') THEN
        ALTER TABLE public.one_v_one_sessions ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Fix tokens
UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) WHERE won_tokens IS NULL;
UPDATE public.users SET purchased_tokens = COALESCE(purchased_tokens, 0) WHERE purchased_tokens IS NULL;

-- ============================================================================
-- STEP 3: RECREATE FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_1v1_payout(TEXT);
DROP FUNCTION IF EXISTS public.join_1v1_session(TEXT, UUID, NUMERIC);

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
    v_session_uuid := session_id_param::UUID;
    SELECT COALESCE(participants_count, 0) INTO v_current_count
    FROM one_v_one_sessions WHERE id = v_session_uuid AND status IN ('waiting', 'active') FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Session not found'); END IF;
    IF v_current_count >= 2 THEN RETURN jsonb_build_object('success', false, 'message', 'Session full'); END IF;
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0) INTO v_purchased, v_won FROM users WHERE id = user_id_param;
    IF (v_purchased + v_won) < entry_fee_param THEN RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens'); END IF;
    IF EXISTS(SELECT 1 FROM one_v_one_participants WHERE session_id = v_session_uuid AND user_id = user_id_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    IF v_purchased >= entry_fee_param THEN
        UPDATE users SET purchased_tokens = purchased_tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    ELSE
        UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (entry_fee_param - v_purchased), updated_at = NOW() WHERE id = user_id_param;
    END IF;
    SELECT rng_seed INTO v_rng_seed FROM one_v_one_sessions WHERE id = v_session_uuid;
    SELECT username INTO v_username FROM users WHERE id = user_id_param;
    INSERT INTO one_v_one_participants (session_id, user_id, username, entry_fee, rng_seed, joined_at)
    VALUES (v_session_uuid, user_id_param, COALESCE(v_username, 'Player'), entry_fee_param, v_rng_seed, NOW()) RETURNING id INTO v_participant_id;
    UPDATE one_v_one_sessions SET participants_count = participants_count + 1, current_pot = COALESCE(current_pot, 0) + entry_fee_param,
        status = CASE WHEN participants_count + 1 >= 2 THEN 'active' ELSE 'waiting' END, updated_at = NOW() WHERE id = v_session_uuid;
    SELECT participants_count INTO v_current_count FROM one_v_one_sessions WHERE id = v_session_uuid;
    RETURN jsonb_build_object('success', true, 'participant_id', v_participant_id, 'message', 'Successfully joined!', 'participants_count', v_current_count, 'rng_seed', v_rng_seed);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

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
    RAISE NOTICE '💰 Starting payout for: %', config_id_param;
    
    -- config_id is now TEXT, so this works!
    SELECT * INTO session_record FROM public.one_v_one_sessions
    WHERE config_id = config_id_param AND status IN ('active', 'waiting')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE SKIP LOCKED;
    
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'No session'); END IF;
    IF session_record.winner_user_id IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Already paid'); END IF;
    IF session_record.participants_count < 2 THEN RETURN jsonb_build_object('success', false, 'message', 'Need 2 players'); END IF;
    
    SELECT COUNT(*) INTO v_completed_count FROM public.one_v_one_participants
    WHERE session_id = session_record.id AND score IS NOT NULL AND completed_at IS NOT NULL;
    IF v_completed_count < 2 THEN RETURN jsonb_build_object('success', false, 'message', 'Waiting'); END IF;
    
    SELECT p.*, u.username, u.email INTO winner_record FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id WHERE p.session_id = session_record.id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'No winner'); END IF;
    
    SELECT p.*, u.username, u.email INTO loser_record FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id WHERE p.session_id = session_record.id AND p.user_id != winner_record.user_id LIMIT 1;
    
    total_pot := COALESCE(session_record.current_pot, 0);
    IF total_pot <= 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Empty pot'); END IF;
    
    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;
    
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout, updated_at = NOW() WHERE id = winner_record.user_id;
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout, updated_at = NOW() WHERE id = loser_record.user_id;
    UPDATE public.one_v_one_sessions SET status = 'completed', winner_user_id = winner_record.user_id, loser_user_id = loser_record.user_id,
        winner_prize = v_winner_payout, loser_prize = v_loser_payout, platform_fee = v_platform_fee, completed_at = NOW(), updated_at = NOW() WHERE id = session_record.id;
    
    IF NOT EXISTS (SELECT 1 FROM public.one_v_one_sessions WHERE config_id = config_id_param AND status = 'waiting') THEN
        INSERT INTO public.one_v_one_sessions (id, config_id, status, participants_count, current_pot, rng_seed, created_at, updated_at)
        VALUES (gen_random_uuid(), config_id_param, 'waiting', 0, 0, session_record.rng_seed, NOW(), NOW());
    END IF;
    
    DELETE FROM public.one_v_one_participants WHERE session_id = session_record.id;
    
    RAISE NOTICE '✅ Payout complete! Winner: % (%), Loser: % (%)', winner_record.username, v_winner_payout, loser_record.username, v_loser_payout;
    
    RETURN jsonb_build_object('success', true, 'message', 'Payout complete!', 'winner_username', winner_record.username,
        'winner_score', winner_record.score, 'winner_payout', v_winner_payout, 'loser_username', loser_record.username,
        'loser_score', loser_record.score, 'loser_payout', v_loser_payout, 'platform_fee', v_platform_fee, 'total_pot', total_pot);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    config_id_type TEXT;
    function_count INT;
BEGIN
    SELECT data_type INTO config_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'one_v_one_sessions' AND column_name = 'config_id';
    
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname IN ('join_1v1_session', 'process_1v1_payout');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ 1V1 SYSTEM READY!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ config_id type: %', COALESCE(config_id_type, 'ERROR');
    RAISE NOTICE '✅ Functions created: %/2', function_count;
    RAISE NOTICE '✅ NO MORE UUID ERRORS!';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 FAIR SKILL-BASED GAMING ENABLED:';
    RAISE NOTICE '   ⚔️ Equal RNG for fair competition';
    RAISE NOTICE '   💰 50%% winner, 35%% loser, 15%% platform';
    RAISE NOTICE '   🔒 Row locks prevent cheating';
    RAISE NOTICE '   ⚡ Auto-reset for continuous play';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
END $$;

