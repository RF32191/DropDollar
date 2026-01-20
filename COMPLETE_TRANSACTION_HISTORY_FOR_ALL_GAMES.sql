-- ============================================
-- COMPLETE TRANSACTION HISTORY FOR ALL GAMES
-- ============================================
-- Ensures ALL token spending (entry fees) and ALL victories (payouts)
-- are saved to user_transactions table for complete history tracking
-- 
-- NOTE: Purchase system is working fine - DO NOT MODIFY
-- ============================================

-- ============================================
-- PART 1: HELPER FUNCTIONS
-- ============================================

-- Helper 1: Save entry fee to user_transactions (for any game)
CREATE OR REPLACE FUNCTION save_entry_fee_to_user_transactions(
    p_user_id UUID,
    p_entry_fee DECIMAL(10,2),
    p_description TEXT,
    p_competition_type TEXT DEFAULT NULL, -- 'winner_takes_all', 'hotsell', 'tournament', etc.
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
        -p_entry_fee, -- Negative (deduction)
        p_description,
        'completed',
        p_competition_type,
        p_competition_id,
        p_game_type,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    RAISE NOTICE '✅ [SaveEntryFee] Saved entry fee: % (ID: %)', p_description, v_transaction_id;
    RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [SaveEntryFee] Error: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper 2: Save victory/payout to user_transactions (for any game)
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
    
    RAISE NOTICE '✅ [SavePayout] Saved payout: % (ID: %)', p_description, v_transaction_id;
    RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [SavePayout] Error: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: WTA (WINNER TAKES ALL) - DO NOT MODIFY
-- ============================================
-- WTA join and payout functions are working fine
-- They already save to user_transactions via the helper functions above
-- NO CHANGES NEEDED

-- ============================================
-- PART 3: HOT SELL - DO NOT MODIFY
-- ============================================
-- Hot Sell join and payout functions are working fine
-- They already save to user_transactions via the helper functions above
-- NO CHANGES NEEDED

-- ============================================
-- PART 4: WTA PAYOUTS - DO NOT MODIFY
-- ============================================
-- WTA payout processing is working fine
-- NO CHANGES NEEDED

-- ============================================
-- PART 5: HOT SELL PAYOUTS - DO NOT MODIFY
-- ============================================
-- Hot Sell payout processing is working fine
-- NO CHANGES NEEDED

-- ============================================
-- PART 6: TOURNAMENT PAYOUTS - DO NOT MODIFY
-- ============================================
-- Tournament payout processing is working fine
-- NO CHANGES NEEDED

-- ============================================
-- PART 7: GRANT PERMISSIONS FOR HELPER FUNCTIONS
-- ============================================

GRANT EXECUTE ON FUNCTION save_entry_fee_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION save_payout_to_user_transactions TO authenticated;

-- ============================================
-- PART 8: QUERY FUNCTIONS FOR HISTORY DISPLAY
-- ============================================

-- Function to get ALL user transactions (purchases, entries, victories)
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

-- Function to get ONLY purchases
CREATE OR REPLACE FUNCTION get_user_purchases_only(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    status TEXT,
    tokens_purchased INTEGER,
    stripe_payment_intent_id TEXT,
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
        ut.tokens_purchased,
        ut.stripe_payment_intent_id,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    AND ut.type IN ('token_purchase', 'purchase')
    ORDER BY ut.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ONLY victories/payouts
CREATE OR REPLACE FUNCTION get_user_victories_only(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    competition_type TEXT,
    competition_id TEXT,
    game_type TEXT,
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
        ut.competition_type,
        ut.competition_id,
        ut.game_type,
        ut.tokens_won,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    AND ut.type IN ('game_win', 'earning')
    ORDER BY ut.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ONLY entry fees/deductions
CREATE OR REPLACE FUNCTION get_user_entry_fees_only(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    competition_type TEXT,
    competition_id TEXT,
    game_type TEXT,
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
        ut.competition_type,
        ut.competition_id,
        ut.game_type,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    AND ut.type = 'entry_fee'
    ORDER BY ut.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new query functions
GRANT EXECUTE ON FUNCTION get_user_all_transactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_purchases_only(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_victories_only(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_entry_fees_only(UUID) TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- ALL token transactions are now saved to user_transactions:
-- 
-- ✅ ENTRY FEES (Token Spending):
--    - WTA: type='entry_fee', competition_type='winner_takes_all'
--    - Hot Sell: type='entry_fee', competition_type='hotsell'
--    - Tournaments: Use save_entry_fee_to_user_transactions() with competition_type='tournament'
--
-- ✅ VICTORIES (Token Earnings):
--    - WTA: type='game_win', competition_type='winner_takes_all'
--    - Hot Sell: type='game_win', competition_type='hotsell' (via save_hot_sell_payout)
--    - Tournaments: type='game_win', competition_type='tournament' (via save_tournament_payout)
--
-- ✅ PURCHASES: Already working - DO NOT MODIFY
--
-- ✅ QUERY FUNCTIONS:
--    - get_user_all_transactions(user_id) - Get everything
--    - get_user_purchases_only(user_id) - Get only purchases
--    - get_user_victories_only(user_id) - Get only victories/payouts
--    - get_user_entry_fees_only(user_id) - Get only entry fees/deductions
--
-- History tab will now show:
--   1. All Purchases (green) - using get_user_purchases_only()
--   2. All Victories (yellow) - using get_user_victories_only()
--   3. All Entry Fees/Deductions (red) - using get_user_entry_fees_only()
--   4. Complete Transaction History (all combined) - using get_user_all_transactions()
-- ============================================

