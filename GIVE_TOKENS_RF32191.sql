-- ============================================================================
-- GIVE 4000 TOKENS TO rf32191@gmail.com
-- ============================================================================
-- Admin credit for testing purposes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '💰 GIVING 4000 TOKENS TO rf32191@gmail.com';
    RAISE NOTICE '========================================';
END $$;

-- Check current balance
DO $$
DECLARE
    v_current_purchased NUMERIC;
    v_current_won NUMERIC;
    v_total NUMERIC;
BEGIN
    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_current_purchased, v_current_won
    FROM public.users
    WHERE email = 'rf32191@gmail.com';

    v_total := v_current_purchased + v_current_won;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Current Balance:';
    RAISE NOTICE '   Purchased Tokens: %', v_current_purchased;
    RAISE NOTICE '   Won Tokens: %', v_current_won;
    RAISE NOTICE '   Total: %', v_total;
    RAISE NOTICE '';
END $$;

-- Add 4000 tokens
UPDATE public.users
SET 
    purchased_tokens = COALESCE(purchased_tokens, 0) + 4000,
    updated_at = NOW()
WHERE email = 'rf32191@gmail.com';

-- Verify new balance
DO $$
DECLARE
    v_new_purchased NUMERIC;
    v_new_won NUMERIC;
    v_new_total NUMERIC;
    v_rows_updated INTEGER;
BEGIN
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RAISE NOTICE '❌ ERROR: User rf32191@gmail.com not found!';
        RAISE NOTICE '';
        RAISE NOTICE '💡 Please ensure the user exists in the database.';
        RETURN;
    END IF;

    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_new_purchased, v_new_won
    FROM public.users
    WHERE email = 'rf32191@gmail.com';

    v_new_total := v_new_purchased + v_new_won;

    RAISE NOTICE '';
    RAISE NOTICE '✅ TOKENS ADDED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 New Balance:';
    RAISE NOTICE '   Purchased Tokens: %', v_new_purchased;
    RAISE NOTICE '   Won Tokens: %', v_new_won;
    RAISE NOTICE '   Total: %', v_new_total;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Added 4000 tokens!';
    RAISE NOTICE '';
END $$;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TOKEN CREDIT COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 User can now:';
    RAISE NOTICE '   - Join tournaments';
    RAISE NOTICE '   - Create ad campaigns';
    RAISE NOTICE '   - Play Coin Play (25¢ = 0.25 tokens)';
    RAISE NOTICE '   - Play Winner Takes All ($1 = 1 token)';
    RAISE NOTICE '';
END $$;

