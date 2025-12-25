-- ============================================
-- FIX WINNER TAKES ALL PAYOUT - COMPLETE
-- Run this in Supabase SQL Editor
-- ============================================

-- First, check and fix the column names in winner_takes_all_sessions
DO $$
BEGIN
    -- Add prize_pool column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'winner_takes_all_sessions' 
                   AND column_name = 'prize_pool') THEN
        -- Check if current_pot exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'winner_takes_all_sessions' 
                   AND column_name = 'current_pot') THEN
            ALTER TABLE public.winner_takes_all_sessions RENAME COLUMN current_pot TO prize_pool;
            RAISE NOTICE 'Renamed current_pot to prize_pool';
        ELSE
            ALTER TABLE public.winner_takes_all_sessions ADD COLUMN prize_pool NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added prize_pool column';
        END IF;
    END IF;
    
    -- Add winner_prize column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'winner_takes_all_sessions' 
                   AND column_name = 'winner_prize') THEN
        ALTER TABLE public.winner_takes_all_sessions ADD COLUMN winner_prize NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added winner_prize column';
    END IF;
    
    -- Add platform_fee_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'winner_takes_all_sessions' 
                   AND column_name = 'platform_fee_amount') THEN
        -- Check if platform_fee exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'winner_takes_all_sessions' 
                   AND column_name = 'platform_fee') THEN
            ALTER TABLE public.winner_takes_all_sessions RENAME COLUMN platform_fee TO platform_fee_amount;
            RAISE NOTICE 'Renamed platform_fee to platform_fee_amount';
        ELSE
            ALTER TABLE public.winner_takes_all_sessions ADD COLUMN platform_fee_amount NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added platform_fee_amount column';
        END IF;
    END IF;
END
$$;

-- Drop and recreate the payout function with robust error handling
DROP FUNCTION IF EXISTS public.process_payout_by_config(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
    v_pot NUMERIC;
    v_fee NUMERIC;
    v_payout NUMERIC;
    v_balance NUMERIC;
    v_new_rng INTEGER;
BEGIN
    RAISE NOTICE '🎰 PAYOUT STARTING for config: %', config_id_param;
    
    -- Get session with row lock
    SELECT * INTO v_session
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No session found for config: %', config_id_param;
        RETURN jsonb_build_object('success', false, 'message', 'No session found');
    END IF;
    
    RAISE NOTICE '📋 Session found: id=%, status=%, winner_user_id=%', v_session.id, v_session.status, v_session.winner_user_id;
    
    -- Check if already paid out
    IF v_session.status = 'completed' AND v_session.winner_user_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Already paid out';
        RETURN jsonb_build_object(
            'success', true,
            'already_paid', true,
            'message', 'Already paid out',
            'payout_amount', COALESCE(v_session.winner_prize, 0)
        );
    END IF;
    
    -- Find the winner (highest score)
    SELECT 
        p.user_id,
        p.score,
        COALESCE(p.username, u.username, 'Player') as username
    INTO v_winner
    FROM public.winner_takes_all_participants p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No completed games yet';
        RETURN jsonb_build_object('success', false, 'message', 'No completed games');
    END IF;
    
    RAISE NOTICE '🏆 Winner found: % with score %', v_winner.username, v_winner.score;
    
    -- Get pot amount (handle both column names)
    v_pot := COALESCE(v_session.prize_pool, 0);
    
    IF v_pot <= 0 THEN
        RAISE NOTICE '❌ Prize pool empty: %', v_pot;
        RETURN jsonb_build_object('success', false, 'message', 'Prize pool empty');
    END IF;
    
    -- Calculate payouts (85% to winner, 15% platform fee)
    v_fee := v_pot * 0.15;
    v_payout := v_pot - v_fee;
    
    RAISE NOTICE '💰 Pot: %, Fee: %, Payout: %', v_pot, v_fee, v_payout;
    
    -- Pay the winner - add to won_tokens
    UPDATE public.users
    SET 
        won_tokens = COALESCE(won_tokens, 0) + v_payout,
        updated_at = NOW()
    WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Failed to update winner tokens';
        RETURN jsonb_build_object('success', false, 'message', 'Failed to pay winner');
    END IF;
    
    RAISE NOTICE '✅ Winner paid! New balance: %', v_balance;
    
    -- Record the transaction
    BEGIN
        INSERT INTO public.token_transactions (
            user_id, transaction_type, amount, balance_after, description, created_at
        ) VALUES (
            v_winner.user_id, 'game_win', v_payout, v_balance, 
            'Winner Takes All - ' || v_winner.username || ' won!', NOW()
        );
        RAISE NOTICE '✅ Transaction recorded';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Transaction log failed (non-fatal): %', SQLERRM;
    END;
    
    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        winner_prize = v_payout,
        platform_fee_amount = v_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RAISE NOTICE '✅ Session marked completed';
    
    -- Auto-reset for next game
    v_new_rng := floor(random() * 99999 + 1)::integer;
    
    -- Clear participants
    DELETE FROM public.winner_takes_all_participants 
    WHERE session_id = v_session.id;
    
    -- Reset session
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_prize = 0,
        platform_fee_amount = 0,
        completed_at = NULL,
        rng_seed = v_new_rng,
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RAISE NOTICE '✅ Session reset - ready for next game!';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payout complete!',
        'winner_username', v_winner.username,
        'winner_score', v_winner.score,
        'payout_amount', v_payout,
        'platform_fee', v_fee,
        'total_pot', v_pot
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR in payout: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Enable RLS but allow the function to bypass it
ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "wta_sessions_all" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "wta_sessions_select" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "wta_sessions_update" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "wta_sessions_delete" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "wta_participants_all" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "wta_participants_select" ON public.winner_takes_all_participants;

-- Create permissive policies
CREATE POLICY "wta_sessions_all" ON public.winner_takes_all_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "wta_participants_all" ON public.winner_takes_all_participants
    FOR ALL USING (true) WITH CHECK (true);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.process_payout_by_config(TEXT) TO authenticated, anon, service_role;
GRANT ALL ON public.winner_takes_all_sessions TO authenticated, anon, service_role;
GRANT ALL ON public.winner_takes_all_participants TO authenticated, anon, service_role;
GRANT ALL ON public.users TO authenticated, anon, service_role;
GRANT ALL ON public.token_transactions TO authenticated, anon, service_role;

-- Also fix the user profile access issue
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_all" ON public.users;

CREATE POLICY "users_select_all" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify the function exists
SELECT 'process_payout_by_config function created successfully' as status
WHERE EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'process_payout_by_config'
);

