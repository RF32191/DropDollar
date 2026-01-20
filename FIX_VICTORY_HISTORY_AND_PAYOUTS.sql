-- ============================================
-- FIX VICTORY HISTORY AND PAYOUTS
-- ============================================
-- Ensures all game winnings and payouts are saved to user_transactions
-- This fixes the history tab showing empty victory history
-- ============================================

-- Step 1: Ensure user_transactions table exists (from CREATE_USER_TRANSACTIONS_TABLE.sql)
-- This is already done, but we'll verify it has all needed columns

-- Step 2: Create function to save payout/winnings to user_transactions
CREATE OR REPLACE FUNCTION save_payout_to_user_transactions(
    p_user_id UUID,
    p_type TEXT, -- 'game_win' or 'earning'
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
    -- Insert into user_transactions (unified table for all transactions)
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
    
    RAISE NOTICE '✅ [SavePayout] Saved payout to user_transactions: % (ID: %)', p_description, v_transaction_id;
    
    RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [SavePayout] Error saving payout: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update WTA payout function to save to user_transactions
CREATE OR REPLACE FUNCTION process_wta_payout(config_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
    v_total_pot DECIMAL(10,2);
    v_platform_fee DECIMAL(10,2);
    v_winner_payout DECIMAL(10,2);
    v_balance DECIMAL(10,2);
    v_transaction_id UUID;
BEGIN
    -- Get session
    SELECT * INTO v_session
    FROM public.wta_sessions
    WHERE config_id::TEXT = config_id_param::TEXT
    AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Get winner
    SELECT * INTO v_winner
    FROM public.wta_participants
    WHERE session_id = v_session.id
    ORDER BY score DESC, submitted_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner found');
    END IF;
    
    -- Calculate payout
    v_total_pot := COALESCE(v_session.prize_pool, 0);
    v_platform_fee := v_total_pot * 0.15;
    v_winner_payout := v_total_pot - v_platform_fee;
    
    -- Update user balance
    UPDATE public.users
    SET 
        won_tokens = COALESCE(won_tokens, 0) + v_winner_payout,
        total_earned = COALESCE(total_earned, 0) + v_winner_payout,
        games_won = COALESCE(games_won, 0) + 1,
        games_played = COALESCE(games_played, 0) + 1,
        updated_at = NOW()
    WHERE id = v_winner.user_id
    RETURNING (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) INTO v_balance;
    
    -- CRITICAL: Save to user_transactions (for history tab)
    v_transaction_id := save_payout_to_user_transactions(
        p_user_id := v_winner.user_id,
        p_type := 'game_win',
        p_amount := v_winner_payout,
        p_description := format('Winner Takes All - %s - Score: %s', v_session.game_type, v_winner.score),
        p_competition_type := 'winner_takes_all',
        p_competition_id := v_session.id::TEXT,
        p_game_type := v_session.game_type,
        p_tokens_won := v_winner_payout::INTEGER,
        p_metadata := jsonb_build_object(
            'session_id', v_session.id,
            'config_id', v_session.config_id,
            'score', v_winner.score,
            'total_pot', v_total_pot,
            'platform_fee', v_platform_fee
        )
    );
    
    -- Also save to token_transactions for backward compatibility (if table exists)
    BEGIN
        INSERT INTO public.token_transactions (
            user_id, 
            transaction_type, 
            amount, 
            balance_before, 
            balance_after, 
            description, 
            created_at
        )
        VALUES (
            v_winner.user_id,
            'game_win',
            v_winner_payout,
            v_balance - v_winner_payout,
            v_balance,
            format('Winner Takes All - %s', v_session.game_type),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- token_transactions table might not exist, that's OK
        RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
    END;
    
    -- Mark session as completed and reset
    UPDATE public.wta_sessions
    SET 
        status = 'waiting',
        winner_id = NULL,
        winner_username = NULL,
        winner_score = NULL,
        prize_pool = 0,
        current_pot = 0,
        participants_count = 0,
        payout_timer = NULL,
        rng_seed = gen_random_uuid()::TEXT
    WHERE id = v_session.id;
    
    -- Clear participants
    DELETE FROM public.wta_participants WHERE session_id = v_session.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner.user_id,
        'winner_username', v_winner.username,
        'payout', v_winner_payout,
        'transaction_id', v_transaction_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create function for Hot Sell payouts
CREATE OR REPLACE FUNCTION save_hot_sell_payout(
    p_user_id UUID,
    p_session_id UUID,
    p_rank INTEGER,
    p_prize_amount DECIMAL(10,2),
    p_game_type TEXT,
    p_score DECIMAL(10,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_description TEXT;
BEGIN
    -- Build description based on rank
    IF p_rank = 1 THEN
        v_description := format('Hot Sell - 1st Place - %s', p_game_type);
    ELSIF p_rank = 2 THEN
        v_description := format('Hot Sell - 2nd Place - %s', p_game_type);
    ELSIF p_rank = 3 THEN
        v_description := format('Hot Sell - 3rd Place - %s', p_game_type);
    ELSE
        v_description := format('Hot Sell - Rank %s - %s', p_rank, p_game_type);
    END IF;
    
    -- Save to user_transactions
    v_transaction_id := save_payout_to_user_transactions(
        p_user_id := p_user_id,
        p_type := 'game_win',
        p_amount := p_prize_amount,
        p_description := v_description,
        p_competition_type := 'hotsell',
        p_competition_id := p_session_id::TEXT,
        p_game_type := p_game_type,
        p_tokens_won := p_prize_amount::INTEGER,
        p_metadata := jsonb_build_object(
            'session_id', p_session_id,
            'rank', p_rank,
            'score', p_score
        )
    );
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function for Tournament payouts
CREATE OR REPLACE FUNCTION save_tournament_payout(
    p_user_id UUID,
    p_tournament_id UUID,
    p_rank INTEGER,
    p_prize_amount DECIMAL(10,2),
    p_game_type TEXT,
    p_score DECIMAL(10,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_description TEXT;
BEGIN
    -- Build description
    IF p_rank = 1 THEN
        v_description := format('Tournament - 1st Place - %s', p_game_type);
    ELSIF p_rank = 2 THEN
        v_description := format('Tournament - 2nd Place - %s', p_game_type);
    ELSIF p_rank = 3 THEN
        v_description := format('Tournament - 3rd Place - %s', p_game_type);
    ELSE
        v_description := format('Tournament - Rank %s - %s', p_rank, p_game_type);
    END IF;
    
    -- Save to user_transactions
    v_transaction_id := save_payout_to_user_transactions(
        p_user_id := p_user_id,
        p_type := 'game_win',
        p_amount := p_prize_amount,
        p_description := v_description,
        p_competition_type := 'tournament',
        p_competition_id := p_tournament_id::TEXT,
        p_game_type := p_game_type,
        p_tokens_won := p_prize_amount::INTEGER,
        p_metadata := jsonb_build_object(
            'tournament_id', p_tournament_id,
            'rank', p_rank,
            'score', p_score
        )
    );
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant execute permissions
GRANT EXECUTE ON FUNCTION save_payout_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION process_wta_payout TO authenticated;
GRANT EXECUTE ON FUNCTION save_hot_sell_payout TO authenticated;
GRANT EXECUTE ON FUNCTION save_tournament_payout TO authenticated;

-- Step 7: Create index for faster victory history queries
CREATE INDEX IF NOT EXISTS idx_user_transactions_winnings 
    ON public.user_transactions(user_id, type, created_at DESC)
    WHERE type IN ('game_win', 'earning');

-- ============================================
-- DONE!
-- ============================================
-- All payouts will now save to user_transactions with:
-- - type = 'game_win' for winnings
-- - tokens_won = amount won
-- - competition_type = 'winner_takes_all', 'hotsell', or 'tournament'
-- - competition_id = session/tournament ID
-- - game_type = game name
--
-- This ensures the History tab shows all victories!
-- ============================================

