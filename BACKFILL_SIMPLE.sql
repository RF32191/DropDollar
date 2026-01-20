-- ============================================
-- BACKFILL ENTRY FEES - SIMPLE VERSION
-- ============================================
-- Just backfills ALL games with entry fees
-- No complex filtering
-- ============================================

DO $$
DECLARE
    v_game_record RECORD;
    v_entry_fee DECIMAL(10,2);
    v_transaction_id UUID;
    v_total_backfilled INTEGER := 0;
    v_user_id UUID := '52c0b177-e93f-4b4d-bedc-8ccd89044b4f';
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 BACKFILLING ENTRY FEES';
    RAISE NOTICE '========================================';
    
    -- Loop through ALL games
    FOR v_game_record IN 
        SELECT id, user_id, game_type, score, tokens_wagered, metadata, created_at
        FROM public.game_history
        WHERE user_id = v_user_id
        ORDER BY created_at ASC
    LOOP
        -- Skip if we already have a transaction
        IF EXISTS (
            SELECT 1 FROM public.user_transactions
            WHERE user_id = v_user_id
            AND metadata->>'game_history_id' = v_game_record.id::TEXT
        ) THEN
            CONTINUE;
        END IF;
        
        -- Determine entry fee (use tokens_wagered or default to 0.25)
        v_entry_fee := COALESCE(v_game_record.tokens_wagered, 0.25);
        
        -- Create transaction
        INSERT INTO public.user_transactions (
            user_id, type, amount, description, status,
            competition_type, game_type, metadata, created_at
        ) VALUES (
            v_user_id,
            'entry_fee',
            -v_entry_fee,
            'Game Entry - ' || v_game_record.game_type,
            'completed',
            'competition',
            v_game_record.game_type,
            jsonb_build_object(
                'game_history_id', v_game_record.id,
                'backfilled', true,
                'entry_fee', v_entry_fee
            ),
            v_game_record.created_at
        )
        RETURNING id INTO v_transaction_id;
        
        v_total_backfilled := v_total_backfilled + 1;
        
        IF v_total_backfilled <= 5 THEN
            RAISE NOTICE '✅ Backfilled: % - $%', v_game_record.game_type, v_entry_fee;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DONE! Backfilled % games', v_total_backfilled;
    RAISE NOTICE '========================================';
END;
$$;

