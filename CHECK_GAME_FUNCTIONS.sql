-- ============================================
-- ADD TRANSACTION TRACKING TO ALL GAMES
-- ============================================
-- This updates ALL game join functions to track entry fees
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Create helper function to save entry fees
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
        p_entry_fee,
        p_description,
        'completed',
        p_competition_type,
        p_competition_id,
        p_game_type,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_entry_fee_to_user_transactions TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Helper function created!';
END;
$$;

-- STEP 2: Check which game functions exist
-- ============================================
DO $$
DECLARE
    v_coin_play_exists BOOLEAN;
    v_wta_exists BOOLEAN;
    v_hotsell_exists BOOLEAN;
    v_1v1_exists BOOLEAN;
BEGIN
    -- Check if functions exist
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'coin_play_join_v2'
    ) INTO v_coin_play_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'wta_join_v2'
    ) INTO v_wta_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'hs_join_v2'
    ) INTO v_hotsell_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'join_1v1_session'
    ) INTO v_1v1_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 GAME FUNCTIONS STATUS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Coin Play: %', CASE WHEN v_coin_play_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
    RAISE NOTICE 'WTA: %', CASE WHEN v_wta_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
    RAISE NOTICE 'Hot Sell: %', CASE WHEN v_hotsell_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
    RAISE NOTICE '1v1: %', CASE WHEN v_1v1_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    IF v_coin_play_exists THEN
        RAISE NOTICE '⚠️  Coin Play function exists - it already has tracking';
    END IF;
    
    IF NOT v_wta_exists THEN
        RAISE NOTICE '⚠️  WTA function NOT found - please provide the function name';
    END IF;
    
    IF NOT v_hotsell_exists THEN
        RAISE NOTICE '⚠️  Hot Sell function NOT found - please provide the function name';
    END IF;
    
    IF NOT v_1v1_exists THEN
        RAISE NOTICE '⚠️  1v1 function NOT found - please provide the function name';
    END IF;
END;
$$;

-- STEP 3: Instructions
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Check the output above to see which functions exist';
    RAISE NOTICE '2. For each game that exists, we need to add this code:';
    RAISE NOTICE '';
    RAISE NOTICE '   -- CRITICAL: Save to user_transactions';
    RAISE NOTICE '   v_transaction_id := save_entry_fee_to_user_transactions(';
    RAISE NOTICE '       p_user_id := [user_id_variable],';
    RAISE NOTICE '       p_entry_fee := [fee_amount],';
    RAISE NOTICE '       p_description := format(''[Game Name] Entry Fee''),';
    RAISE NOTICE '       p_competition_type := ''[coin_play|winner_takes_all|hotsell|1v1]'',';
    RAISE NOTICE '       p_competition_id := [session_id]::TEXT,';
    RAISE NOTICE '       p_game_type := [game_type_variable],';
    RAISE NOTICE '       p_metadata := jsonb_build_object(...)';
    RAISE NOTICE '   );';
    RAISE NOTICE '';
    RAISE NOTICE '3. This line should be added RIGHT AFTER the token deduction';
    RAISE NOTICE '4. Send me the game function names that exist so I can create';
    RAISE NOTICE '   the exact SQL updates for each one';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END;
$$;

