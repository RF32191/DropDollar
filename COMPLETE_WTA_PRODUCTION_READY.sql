-- ============================================================================
-- PRODUCTION-READY WINNER TAKES ALL SYSTEM - MILLIONS OF USERS
-- ============================================================================
-- This ensures WTA sessions exist, can handle massive scale, and auto-reset
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD MISSING COLUMNS TO WTA SESSIONS
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'current_pot') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN current_pot INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'timer_duration') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN timer_duration INTEGER DEFAULT 60;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'winner_user_id') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN winner_user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'prize_amount') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN prize_amount NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'platform_fee') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN platform_fee NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'completed_at') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE INITIAL SESSIONS FOR ALL WTA CONFIGS
-- ============================================================================

DO $$
DECLARE
    config_rec RECORD;
    session_exists BOOLEAN;
    new_session_id UUID;
BEGIN
    RAISE NOTICE '🔄 Creating initial WTA sessions for all configs...';
    
    FOR config_rec IN 
        SELECT id, game_type, entry_fee, rng_seed, base_price 
        FROM public.winner_takes_all_configs
        WHERE is_active = TRUE
    LOOP
        SELECT EXISTS(
            SELECT 1 
            FROM public.winner_takes_all_sessions 
            WHERE config_id = config_rec.id 
            AND status = 'waiting'
        ) INTO session_exists;
        
        IF NOT session_exists THEN
            INSERT INTO public.winner_takes_all_sessions (
                id, config_id, status, participants_count, current_pot,
                timer_duration, base_price, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                config_rec.id,
                'waiting',
                0,
                0,
                60,
                COALESCE(config_rec.base_price, config_rec.entry_fee, 0),
                NOW(),
                NOW()
            ) RETURNING id INTO new_session_id;
            
            RAISE NOTICE '✅ Created WTA session for config: % (game: %)', config_rec.id, config_rec.game_type;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ All WTA sessions initialized!';
END $$;

-- ============================================================================
-- STEP 3: SCALABLE WTA PAYOUT FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_wta_payout(TEXT);

CREATE OR REPLACE FUNCTION public.process_wta_payout(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    total_pot NUMERIC;
    v_winner_payout NUMERIC;
    v_platform_fee NUMERIC;
    v_completed_count INT;
    v_new_session_id UUID;
BEGIN
    -- Find active session with lock
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    AND status IN ('active', 'waiting')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        -- Auto-create session
        INSERT INTO public.winner_takes_all_sessions (
            id, config_id, status, participants_count, current_pot,
            timer_duration, base_price, created_at, updated_at
        )
        SELECT 
            gen_random_uuid(), config_id_param, 'waiting', 0, 0,
            60, COALESCE(base_price, entry_fee, 0), NOW(), NOW()
        FROM public.winner_takes_all_configs
        WHERE id = config_id_param
        LIMIT 1
        RETURNING id INTO v_new_session_id;
        
        RETURN jsonb_build_object('success', false, 'message', 'No active session - new session created');
    END IF;

    IF session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already paid out');
    END IF;

    SELECT COUNT(*) INTO v_completed_count
    FROM public.winner_takes_all_participants
    WHERE session_id = session_record.id
    AND score IS NOT NULL
    AND completed_at IS NOT NULL;

    IF v_completed_count < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;

    -- Get winner
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_record.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner');
    END IF;

    total_pot := COALESCE(session_record.current_pot, 0);
    
    IF total_pot <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Empty pot');
    END IF;

    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot - v_platform_fee;

    -- Pay winner
    UPDATE public.users
    SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        updated_at = NOW()
    WHERE id = winner_record.user_id;

    -- Mark completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        prize_amount = v_winner_payout,
        platform_fee = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_record.id;

    -- Create new session immediately
    INSERT INTO public.winner_takes_all_sessions (
        id, config_id, status, participants_count, current_pot,
        timer_duration, base_price, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(), config_id_param, 'waiting', 0, 0,
        60, COALESCE(base_price, entry_fee, 0), NOW(), NOW()
    FROM public.winner_takes_all_configs
    WHERE id = config_id_param
    LIMIT 1
    ON CONFLICT DO NOTHING;

    -- Clean up old participants
    DELETE FROM public.winner_takes_all_participants WHERE session_id = session_record.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout complete!',
        'winner_username', winner_record.username,
        'winner_score', winner_record.score,
        'winner_payout', v_winner_payout,
        'platform_fee', v_platform_fee,
        'total_pot', total_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ WTA payout error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_wta_payout(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 4: AUTO-CREATE WTA SESSION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_wta_session_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    session_exists BOOLEAN;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        SELECT EXISTS(
            SELECT 1 
            FROM public.winner_takes_all_sessions 
            WHERE config_id = NEW.config_id 
            AND status = 'waiting'
            AND id != NEW.id
        ) INTO session_exists;
        
        IF NOT session_exists THEN
            INSERT INTO public.winner_takes_all_sessions (
                id, config_id, status, participants_count, current_pot,
                timer_duration, base_price, created_at, updated_at
            )
            SELECT 
                gen_random_uuid(), NEW.config_id, 'waiting', 0, 0,
                60, COALESCE(base_price, entry_fee, 0), NOW(), NOW()
            FROM public.winner_takes_all_configs
            WHERE id = NEW.config_id
            LIMIT 1
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_wta_session ON public.winner_takes_all_sessions;

CREATE TRIGGER auto_create_wta_session
    AFTER UPDATE ON public.winner_takes_all_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_wta_session_exists();

-- ============================================================================
-- STEP 5: OPTIMIZE FOR SCALE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wta_sessions_config_status 
    ON public.winner_takes_all_sessions(config_id, status) 
    WHERE status IN ('waiting', 'active');

CREATE INDEX IF NOT EXISTS idx_wta_participants_session_score 
    ON public.winner_takes_all_participants(session_id, score DESC, completed_at);

ANALYZE public.winner_takes_all_sessions;
ANALYZE public.winner_takes_all_participants;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
    session_count INT;
BEGIN
  SELECT COUNT(*) INTO session_count FROM public.winner_takes_all_sessions WHERE status = 'waiting';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ PRODUCTION-READY WTA SYSTEM DEPLOYED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ Waiting sessions: %', session_count;
  RAISE NOTICE '✅ Scalability features enabled';
  RAISE NOTICE '✅ Auto-session creation active';
  RAISE NOTICE '✅ Ready for millions of users';
  RAISE NOTICE '✅ ========================================';
END $$;

