-- ============================================
-- COMPLETE TRANSACTION TRACKING - DEPLOY THIS
-- ============================================
-- This file updates ALL game functions to track transactions
-- Run this ONCE in Supabase SQL Editor
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 DEPLOYING TRANSACTION TRACKING';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 1: CREATE HELPER FUNCTIONS (if not exist)
-- ============================================

CREATE OR REPLACE FUNCTION save_entry_fee_to_user_transactions(
    p_user_id UUID,
    p_entry_fee DECIMAL(10,2),
    p_description TEXT,
    p_competition_type TEXT DEFAULT NULL,
    p_competition_id TEXT DEFAULT NULL,
    p_game_type TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    INSERT INTO public.user_transactions (
        user_id,
        type,
        amount,
        description,
        status,
        competition_type,
        competition_id,
        game_type,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        'entry_fee',
        -p_entry_fee,
        p_description,
        'completed',
        p_competition_type,
        p_competition_id,
        p_game_type,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    RAISE NOTICE '✅ [SaveEntryFee] Saved: % (ID: %)', p_description, v_transaction_id;
    RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [SaveEntryFee] Error: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION save_payout_to_user_transactions(
    p_user_id UUID,
    p_type TEXT,
    p_amount DECIMAL(10,2),
    p_description TEXT,
    p_competition_type TEXT DEFAULT NULL,
    p_competition_id TEXT DEFAULT NULL,
    p_game_type TEXT DEFAULT NULL,
    p_tokens_won INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    INSERT INTO public.user_transactions (
        user_id,
        type,
        amount,
        description,
        status,
        tokens_won,
        competition_type,
        competition_id,
        game_type,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        p_description,
        'completed',
        COALESCE(p_tokens_won, p_amount::INTEGER),
        p_competition_type,
        p_competition_id,
        p_game_type,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    RAISE NOTICE '✅ [SavePayout] Saved: % (ID: %)', p_description, v_transaction_id;
    RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [SavePayout] Error: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: CREATE QUERY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_user_all_transactions(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    status TEXT,
    competition_type TEXT,
    competition_id TEXT,
    game_type TEXT,
    tokens_purchased INTEGER,
    tokens_won INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.id,
        ut.type,
        ut.amount,
        ut.description,
        ut.status,
        ut.competition_type,
        ut.competition_id,
        ut.game_type,
        ut.tokens_purchased,
        ut.tokens_won,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    ORDER BY ut.created_at DESC
    LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: UPDATE COIN PLAY JOIN FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.coin_play_join_v2(
    p_session UUID,
    p_user UUID,
    p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_id TEXT;
    v_purchased_tokens NUMERIC;
    v_won_tokens NUMERIC;
    v_total_tokens NUMERIC;
    v_participants_count INTEGER;
    v_max_participants INTEGER;
    v_session_status TEXT;
    v_min_participants INTEGER;
    v_game_type TEXT;
BEGIN
    -- Get session details
    SELECT cps.config_id, cps.participants_count, cps.status, cpc.game_type
    INTO v_config_id, v_participants_count, v_session_status, v_game_type
    FROM public.coin_play_sessions cps
    LEFT JOIN public.coin_play_configs cpc ON cps.config_id = cpc.id
    WHERE cps.id = p_session;

    IF v_config_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    IF v_session_status NOT IN ('waiting', 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is no longer accepting participants');
    END IF;

    SELECT max_participants, min_participants
    INTO v_max_participants, v_min_participants
    FROM public.coin_play_configs
    WHERE id = v_config_id;

    SELECT COUNT(*) INTO v_participants_count
    FROM public.coin_play_participants
    WHERE session_id = p_session;

    IF (v_participants_count + 1) > v_max_participants THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is full');
    END IF;
    
    UPDATE public.coin_play_sessions
    SET participants_count = v_participants_count
    WHERE id = p_session AND participants_count != v_participants_count;

    IF EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = p_session AND user_id = p_user
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_purchased_tokens, v_won_tokens
    FROM public.users
    WHERE id = p_user;

    v_total_tokens := v_purchased_tokens + v_won_tokens;

    IF v_total_tokens < p_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    -- Deduct entry fee (prioritize purchased tokens first)
    IF v_purchased_tokens >= p_fee THEN
        UPDATE public.users
        SET purchased_tokens = purchased_tokens - p_fee
        WHERE id = p_user;
    ELSE
        UPDATE public.users
        SET 
            purchased_tokens = 0,
            won_tokens = won_tokens - (p_fee - v_purchased_tokens)
        WHERE id = p_user;
    END IF;

    -- ✅ SAVE ENTRY FEE TO TRANSACTION HISTORY
    PERFORM save_entry_fee_to_user_transactions(
        p_user_id := p_user,
        p_entry_fee := p_fee,
        p_description := format('Coin Play Entry - %s', COALESCE(v_game_type, 'Game')),
        p_competition_type := 'coin_play',
        p_competition_id := p_session::TEXT,
        p_game_type := v_game_type,
        p_metadata := jsonb_build_object('session_id', p_session, 'entry_fee', p_fee)
    );

    INSERT INTO public.coin_play_participants (session_id, user_id, username)
    SELECT p_session, p_user, COALESCE(u.username, u.email, 'Player')
    FROM public.users u
    WHERE u.id = p_user;

    UPDATE public.coin_play_sessions
    SET 
        participants_count = participants_count + 1,
        prize_pool = prize_pool + p_fee
    WHERE id = p_session;

    IF v_session_status = 'waiting' AND (v_participants_count + 1) >= v_min_participants THEN
        UPDATE public.coin_play_sessions
        SET 
            status = 'active',
            timer_started_at = COALESCE(timer_started_at, NOW())
        WHERE id = p_session;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined session');
END;
$$;

-- ============================================
-- STEP 4: UPDATE WTA JOIN FUNCTION
-- ============================================

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
    v_game_type TEXT;
BEGIN
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
    END;
    
    RAISE NOTICE '🎮 WTA_JOIN_V2: session=%, user=%', v_session_uuid, p_user;
    
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
    
    SELECT 
        COALESCE(s.participants_count, 0),
        COALESCE(c.max_participants, 10),
        c.game_type
    INTO v_current_count, v_max_participants, v_game_type
    FROM winner_takes_all_sessions s
    LEFT JOIN winner_takes_all_configs c ON s.config_id = c.id
    WHERE s.id = v_session_uuid
    AND s.status IN ('waiting', 'active');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or inactive');
    END IF;
    
    v_max_participants := COALESCE(v_max_participants, 10);
    
    IF EXISTS(
        SELECT 1 FROM winner_takes_all_participants 
        WHERE session_id = v_session_uuid
        AND user_id = p_user
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;
    
    IF v_purchased >= p_fee THEN
        UPDATE users
        SET purchased_tokens = purchased_tokens - p_fee
        WHERE id = p_user;
    ELSE
        UPDATE users
        SET 
            purchased_tokens = 0,
            won_tokens = won_tokens - (p_fee - v_purchased)
        WHERE id = p_user;
    END IF;

    -- ✅ SAVE ENTRY FEE TO TRANSACTION HISTORY
    PERFORM save_entry_fee_to_user_transactions(
        p_user_id := p_user,
        p_entry_fee := p_fee,
        p_description := format('Winner Takes All Entry - %s', COALESCE(v_game_type, 'Game')),
        p_competition_type := 'winner_takes_all',
        p_competition_id := v_session_uuid::TEXT,
        p_game_type := v_game_type,
        p_metadata := jsonb_build_object('session_id', v_session_uuid)
    );

    SELECT username INTO v_username FROM users WHERE id = p_user;
    SELECT rng_seed INTO v_rng_seed FROM winner_takes_all_sessions WHERE id = v_session_uuid;
    
    v_participant_id := gen_random_uuid();
    INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, v_username, NOW());
    
    UPDATE winner_takes_all_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        prize_pool = COALESCE(prize_pool, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wta_join_v2 error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'System error: ' || SQLERRM);
END;
$$;

-- ============================================
-- STEP 5: UPDATE HOT SELL JOIN FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.hs_join_v2(
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
    v_game_type TEXT;
BEGIN
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
    END;
    
    RAISE NOTICE '🎮 HS_JOIN_V2: session=%, user=%', v_session_uuid, p_user;
    
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
    
    SELECT c.game_type
    INTO v_game_type
    FROM hot_sell_sessions s
    LEFT JOIN hot_sell_configs c ON s.config_id = c.id
    WHERE s.id = v_session_uuid AND s.status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or inactive');
    END IF;
    
    IF EXISTS(
        SELECT 1 FROM hot_sell_participants 
        WHERE session_id = v_session_uuid
        AND user_id = p_user
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    IF v_purchased >= p_fee THEN
        UPDATE users
        SET purchased_tokens = purchased_tokens - p_fee
        WHERE id = p_user;
    ELSE
        UPDATE users
        SET 
            purchased_tokens = 0,
            won_tokens = won_tokens - (p_fee - v_purchased)
        WHERE id = p_user;
    END IF;

    -- ✅ SAVE ENTRY FEE TO TRANSACTION HISTORY
    PERFORM save_entry_fee_to_user_transactions(
        p_user_id := p_user,
        p_entry_fee := p_fee,
        p_description := format('Hot Sell Entry - %s', COALESCE(v_game_type, 'Game')),
        p_competition_type := 'hotsell',
        p_competition_id := v_session_uuid::TEXT,
        p_game_type := v_game_type,
        p_metadata := jsonb_build_object('session_id', v_session_uuid)
    );

    SELECT rng_seed INTO v_rng_seed FROM hot_sell_sessions WHERE id = v_session_uuid;
    
    v_participant_id := gen_random_uuid();
    INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at)
    VALUES (v_participant_id, v_session_uuid, p_user, NOW());
    
    UPDATE hot_sell_sessions
    SET 
        participants_count = COALESCE(participants_count, 0) + 1,
        current_pot = COALESCE(current_pot, 0) + p_fee,
        updated_at = NOW()
    WHERE id = v_session_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined',
        'session_id', v_session_uuid::TEXT,
        'participant_id', v_participant_id::TEXT,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'hs_join_v2 error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'System error: ' || SQLERRM);
END;
$$;

-- ============================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION save_entry_fee_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION save_payout_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_all_transactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION coin_play_join_v2(UUID, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION wta_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION hs_join_v2(TEXT, UUID, NUMERIC) TO authenticated, anon;

-- ============================================
-- DONE!
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRANSACTION TRACKING DEPLOYED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was updated:';
    RAISE NOTICE '   ✅ Helper functions created';
    RAISE NOTICE '   ✅ Query function created';
    RAISE NOTICE '   ✅ Coin Play join updated';
    RAISE NOTICE '   ✅ WTA join updated';
    RAISE NOTICE '   ✅ Hot Sell join updated';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 Next steps:';
    RAISE NOTICE '   1. Play ONE test game';
    RAISE NOTICE '   2. Check Purchase History tab';
    RAISE NOTICE '   3. Verify entry fee shows up';
    RAISE NOTICE '';
END $$;

SELECT '✅ TRANSACTION TRACKING DEPLOYED - Play a test game to verify!' as status;

