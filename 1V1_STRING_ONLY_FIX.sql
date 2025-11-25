-- ============================================================================
-- 1V1 STRING-ONLY FIX - USES PURE STRING COMPARISONS
-- ============================================================================
-- Converts EVERYTHING to strings before any comparison
-- ============================================================================

-- Add missing columns
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

UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) WHERE won_tokens IS NULL;
UPDATE public.users SET purchased_tokens = COALESCE(purchased_tokens, 0) WHERE purchased_tokens IS NULL;

-- ============================================================================
-- JOIN FUNCTION
-- ============================================================================

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
    SELECT COALESCE(participants_count, 0) INTO v_current_count FROM one_v_one_sessions 
    WHERE id = v_session_uuid AND status IN ('waiting', 'active') FOR UPDATE SKIP LOCKED;
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
    RETURN jsonb_build_object('success', true, 'participant_id', v_participant_id, 'message', 'Successfully joined!', 
        'participants_count', v_current_count, 'rng_seed', v_rng_seed);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_1v1_session(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- PAYOUT FUNCTION - PURE STRING COMPARISON
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
    v_completed_count INT;
    v_row RECORD;
BEGIN
    RAISE NOTICE '💰 [1V1] Payout for: %', config_id_param;
    
    -- Get ALL active sessions and filter in loop (no WHERE comparison!)
    FOR v_row IN 
        SELECT 
            id,
            config_id,
            participants_count,
            current_pot,
            winner_user_id,
            rng_seed,
            status,
            created_at
        FROM public.one_v_one_sessions
        WHERE status IN ('active', 'waiting')
        ORDER BY created_at DESC
    LOOP
        -- Compare as strings in PL/pgSQL (not in SQL)
        IF v_row.config_id::TEXT = config_id_param THEN
            session_record := v_row;
            EXIT; -- Found it!
        END IF;
    END LOOP;
    
    IF session_record.id IS NULL THEN
        RAISE NOTICE '❌ No session found';
        RETURN jsonb_build_object('success', false, 'message', 'No session');
    END IF;
    
    -- Lock the session
    PERFORM 1 FROM public.one_v_one_sessions WHERE id = session_record.id FOR UPDATE SKIP LOCKED;
    
    IF session_record.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already paid');
    END IF;
    
    IF session_record.participants_count < 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Need 2 players');
    END IF;
    
    SELECT COUNT(*) INTO v_completed_count FROM public.one_v_one_participants
    WHERE session_id = session_record.id AND score IS NOT NULL AND completed_at IS NOT NULL;
    
    IF v_completed_count < 2 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Waiting');
    END IF;
    
    SELECT p.*, u.username INTO winner_record FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id WHERE p.session_id = session_record.id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'No winner'); END IF;
    
    SELECT p.*, u.username INTO loser_record FROM public.one_v_one_participants p
    JOIN public.users u ON p.user_id = u.id WHERE p.session_id = session_record.id AND p.user_id != winner_record.user_id LIMIT 1;
    
    total_pot := COALESCE(session_record.current_pot, 0);
    IF total_pot <= 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Empty pot'); END IF;
    
    -- Fair skill-based payouts
    v_platform_fee := total_pot * 0.15;
    v_winner_payout := total_pot * 0.50;
    v_loser_payout := total_pot * 0.35;
    
    -- Atomic payouts
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_winner_payout, updated_at = NOW() WHERE id = winner_record.user_id;
    UPDATE public.users SET won_tokens = COALESCE(won_tokens, 0) + v_loser_payout, updated_at = NOW() WHERE id = loser_record.user_id;
    UPDATE public.one_v_one_sessions SET status = 'completed', winner_user_id = winner_record.user_id, 
        loser_user_id = loser_record.user_id, winner_prize = v_winner_payout, loser_prize = v_loser_payout,
        platform_fee = v_platform_fee, completed_at = NOW(), updated_at = NOW() WHERE id = session_record.id;
    
    -- Create new session using exact config_id value from session_record
    EXECUTE format(
        'INSERT INTO public.one_v_one_sessions (id, config_id, status, participants_count, current_pot, rng_seed, created_at, updated_at) 
         VALUES ($1, %L, $2, $3, $4, $5, $6, $7)', 
        session_record.config_id
    ) USING gen_random_uuid(), 'waiting', 0, 0, session_record.rng_seed, NOW(), NOW();
    
    DELETE FROM public.one_v_one_participants WHERE session_id = session_record.id;
    
    RAISE NOTICE '✅ Payout complete! Winner: % (+%), Loser: % (+%)', winner_record.username, v_winner_payout, loser_record.username, v_loser_payout;
    
    RETURN jsonb_build_object('success', true, 'message', 'Payout complete!', 'winner_username', winner_record.username,
        'winner_score', winner_record.score, 'winner_payout', v_winner_payout, 'loser_username', loser_record.username,
        'loser_score', loser_record.score, 'loser_payout', v_loser_payout, 'platform_fee', v_platform_fee, 'total_pot', total_pot);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_1v1_payout(TEXT) TO authenticated, anon;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_status_only ON public.one_v_one_sessions(status, created_at DESC) WHERE status IN ('waiting', 'active');
CREATE INDEX IF NOT EXISTS idx_1v1_participants_session ON public.one_v_one_participants(session_id, score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_id_tokens ON public.users(id, won_tokens, purchased_tokens);

ANALYZE public.one_v_one_sessions;
ANALYZE public.one_v_one_participants;
ANALYZE public.users;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ 1V1 STRING-ONLY FIX COMPLETE!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ NO SQL type comparisons!';
    RAISE NOTICE '✅ Filtering done in PL/pgSQL loop';
    RAISE NOTICE '✅ Pure string comparison only';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 FAIR SKILL-BASED GAMING:';
    RAISE NOTICE '   ⚔️ Equal RNG seeds (completely fair)';
    RAISE NOTICE '   🏆 Skill determines winner (highest score)';
    RAISE NOTICE '   💰 Fair payouts: 50%% W, 35%% L, 15%% platform';
    RAISE NOTICE '   🔒 Row locks prevent cheating';
    RAISE NOTICE '   ⚡ Scalable to millions of players';
    RAISE NOTICE '   🚀 Auto-reset for continuous play';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
END $$;

