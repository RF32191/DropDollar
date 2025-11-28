-- ============================================================================
-- 🔧 FIX WTA: Find and DROP ALL triggers
-- ============================================================================

-- Step 1: List ALL triggers on winner_takes_all_sessions
SELECT '📋 ALL TRIGGERS ON SESSIONS TABLE:' as info;
SELECT tgname as trigger_name, tgtype, tgenabled
FROM pg_trigger 
WHERE tgrelid = 'winner_takes_all_sessions'::regclass
AND NOT tgisinternal;

-- Step 2: List ALL triggers on participants table
SELECT '📋 ALL TRIGGERS ON PARTICIPANTS TABLE:' as info;
SELECT tgname as trigger_name
FROM pg_trigger 
WHERE tgrelid = 'winner_takes_all_participants'::regclass
AND NOT tgisinternal;

-- Step 3: Drop EVERY trigger on sessions (by name patterns)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'winner_takes_all_sessions'::regclass
        AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON winner_takes_all_sessions', r.tgname);
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;

-- Step 4: Drop EVERY trigger on participants
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'winner_takes_all_participants'::regclass
        AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON winner_takes_all_participants', r.tgname);
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;

-- Step 5: Also drop known trigger functions
DROP FUNCTION IF EXISTS auto_start_wta_timer() CASCADE;
DROP FUNCTION IF EXISTS wta_timer_trigger() CASCADE;
DROP FUNCTION IF EXISTS wta_payout_trigger() CASCADE;
DROP FUNCTION IF EXISTS wta_auto_payout() CASCADE;
DROP FUNCTION IF EXISTS trigger_wta_payout() CASCADE;
DROP FUNCTION IF EXISTS wta_complete_handler() CASCADE;
DROP FUNCTION IF EXISTS handle_wta_completion() CASCADE;
DROP FUNCTION IF EXISTS on_wta_session_update() CASCADE;

-- Step 6: Verify no triggers remain
SELECT '✅ TRIGGERS AFTER CLEANUP:' as info;
SELECT COUNT(*) as remaining_triggers
FROM pg_trigger 
WHERE tgrelid = 'winner_takes_all_sessions'::regclass
AND NOT tgisinternal;

-- Step 7: Reset sessions to ensure clean state
DELETE FROM winner_takes_all_participants;

UPDATE winner_takes_all_sessions SET
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Step 8: Recreate payout function without any trigger references
DROP FUNCTION IF EXISTS public.process_payout_by_config(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_s RECORD; 
    v_win RECORD; 
    v_pot NUMERIC; 
    v_fee NUMERIC; 
    v_pay NUMERIC; 
    v_bal NUMERIC; 
    v_rng INT;
BEGIN
    -- Get session
    SELECT * INTO v_s 
    FROM winner_takes_all_sessions 
    WHERE config_id = config_id_param 
    ORDER BY created_at DESC LIMIT 1 
    FOR UPDATE;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;
    
    -- Check if already paid
    IF v_s.status = 'completed' AND v_s.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true, 
            'already_paid', true, 
            'payout_amount', v_s.winner_prize
        );
    END IF;
    
    -- Get winner (highest score)
    SELECT p.user_id, p.score, COALESCE(p.username, 'Player') as username 
    INTO v_win
    FROM winner_takes_all_participants p 
    WHERE p.session_id = v_s.id AND p.score IS NOT NULL 
    ORDER BY p.score DESC LIMIT 1;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'message', 'No scores yet');
    END IF;
    
    -- Calculate payout
    v_pot := COALESCE(v_s.prize_pool, 0); 
    IF v_pot <= 0 THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;
    
    v_fee := v_pot * 0.15; 
    v_pay := v_pot - v_fee;
    
    -- Pay winner
    UPDATE users SET won_tokens = COALESCE(won_tokens,0) + v_pay WHERE id = v_win.user_id
    RETURNING (COALESCE(purchased_tokens,0) + COALESCE(won_tokens,0)) INTO v_bal;
    
    -- Record transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (v_win.user_id, 'game_win', v_pay, v_bal, 'WTA Winner: ' || config_id_param, NOW());
    
    -- Mark session completed (NO TRIGGER WILL FIRE - they're all gone!)
    UPDATE winner_takes_all_sessions SET 
        status = 'completed', 
        winner_user_id = v_win.user_id, 
        winner_prize = v_pay,
        platform_fee_amount = v_fee, 
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_s.id;
    
    -- Auto-reset for next round
    v_rng := floor(random() * 99999 + 1)::integer;
    
    DELETE FROM winner_takes_all_participants WHERE session_id = v_s.id;
    
    UPDATE winner_takes_all_sessions SET 
        status = 'waiting', 
        participants_count = 0, 
        prize_pool = 0,
        timer_started_at = NULL, 
        winner_user_id = NULL, 
        winner_prize = 0, 
        platform_fee_amount = 0, 
        completed_at = NULL, 
        rng_seed = v_rng, 
        updated_at = NOW() 
    WHERE id = v_s.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'winner_username', v_win.username, 
        'payout_amount', v_pay,
        'winner_score', v_win.score,
        'platform_fee', v_fee
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;

-- Step 9: Verify
SELECT '✅ SESSIONS RESET:' as info;
SELECT id::TEXT, config_id, status, participants_count, prize_pool 
FROM winner_takes_all_sessions LIMIT 5;

SELECT '
============================================
✅ ALL TRIGGERS REMOVED!
============================================
- Found and dropped ALL triggers
- Dropped all trigger functions
- Sessions reset
- Payout function recreated clean
============================================
' as done;

