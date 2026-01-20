-- ============================================
-- ADD TRANSACTION TRACKING TO 1V1 GAMES
-- ============================================
-- This adds transaction tracking to the 1v1 join function
-- Run this in Supabase SQL Editor AFTER running FIX_PURCHASE_HISTORY_NOW.sql
-- ============================================

-- Get the current join_1v1_session function and add tracking
-- This will be inserted RIGHT AFTER the token deduction

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_source_code TEXT;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'join_1v1_session'
    ) INTO v_function_exists;
    
    IF NOT v_function_exists THEN
        RAISE EXCEPTION '❌ join_1v1_session function not found! Cannot add tracking.';
    END IF;
    
    RAISE NOTICE '✅ join_1v1_session function found';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📋 MANUAL STEPS REQUIRED:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. In Supabase, go to Database → Functions';
    RAISE NOTICE '2. Find and open "join_1v1_session"';
    RAISE NOTICE '3. Look for the line that deducts tokens (usually UPDATE users SET tokens = ...)';
    RAISE NOTICE '4. RIGHT AFTER the token deduction, add this code:';
    RAISE NOTICE '';
    RAISE NOTICE '   -- CRITICAL: Save to user_transactions (for history tab)';
    RAISE NOTICE '   v_transaction_id := save_entry_fee_to_user_transactions(';
    RAISE NOTICE '       p_user_id := p_user,';
    RAISE NOTICE '       p_entry_fee := p_entry_fee_param,';
    RAISE NOTICE '       p_description := format(''1v1 Competition Entry''),';
    RAISE NOTICE '       p_competition_type := ''1v1'',';
    RAISE NOTICE '       p_competition_id := v_session_uuid::TEXT,';
    RAISE NOTICE '       p_game_type := v_game_type,';
    RAISE NOTICE '       p_metadata := jsonb_build_object(';
    RAISE NOTICE '           ''session_id'', v_session_uuid,';
    RAISE NOTICE '           ''config_id'', v_config_id,';
    RAISE NOTICE '           ''entry_fee'', p_entry_fee_param';
    RAISE NOTICE '       )';
    RAISE NOTICE '   );';
    RAISE NOTICE '';
    RAISE NOTICE '5. Make sure you declare v_transaction_id UUID; at the top of the function';
    RAISE NOTICE '6. Click "Confirm" to save the function';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📝 EXAMPLE OF WHERE TO INSERT:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'BEFORE:';
    RAISE NOTICE '  -- Deduct entry fee from user';
    RAISE NOTICE '  UPDATE users SET tokens = tokens - p_entry_fee_param';
    RAISE NOTICE '  WHERE id = p_user;';
    RAISE NOTICE '';
    RAISE NOTICE '  RETURN json_build_object(...);';
    RAISE NOTICE '';
    RAISE NOTICE 'AFTER:';
    RAISE NOTICE '  -- Deduct entry fee from user';
    RAISE NOTICE '  UPDATE users SET tokens = tokens - p_entry_fee_param';
    RAISE NOTICE '  WHERE id = p_user;';
    RAISE NOTICE '';
    RAISE NOTICE '  -- CRITICAL: Save to user_transactions';
    RAISE NOTICE '  v_transaction_id := save_entry_fee_to_user_transactions(...);';
    RAISE NOTICE '';
    RAISE NOTICE '  RETURN json_build_object(...);';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END;
$$;

