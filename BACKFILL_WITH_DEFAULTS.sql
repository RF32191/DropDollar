-- ============================================
-- BACKFILL WITH SMART DEFAULTS
-- ============================================
-- Since old games have NULL tokens_wagered,
-- we'll use smart defaults based on what we know
-- ============================================

DO $$
DECLARE
    v_game_record RECORD;
    v_entry_fee DECIMAL(10,2);
    v_transaction_id UUID;
    v_total_backfilled INTEGER := 0;
    v_user_id UUID := '52c0b177-e93f-4b4d-bedc-8ccd89044b4f';
    v_competition_type TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 BACKFILLING WITH SMART DEFAULTS';
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
        
        -- SMART DEFAULTS: Use metadata first, then tokens_wagered, then defaults
        
        -- Check for Coin Play (always 0.25)
        IF v_game_record.metadata->>'session_type' = 'coin_play' OR
           v_game_record.game_type LIKE '%coin%' THEN
            v_entry_fee := 0.25;
            v_competition_type := 'coin_play';
            
        -- Check for WTA (always 1.00)
        ELSIF v_game_record.metadata->>'session_type' = 'winner_takes_all' OR
              v_game_record.metadata->>'competition_type' = 'winner_takes_all' OR
              v_game_record.game_type LIKE '%wta%' THEN
            v_entry_fee := 1.00;
            v_competition_type := 'winner_takes_all';
            
        -- Check for Hot Sell (always 1.00)
        ELSIF v_game_record.metadata->>'session_type' = 'hotsell' OR
              v_game_record.metadata->>'competition_type' = 'hotsell' OR
              v_game_record.game_type LIKE '%hot%sell%' THEN
            v_entry_fee := 1.00;
            v_competition_type := 'hotsell';
            
        -- Check for 1v1 (use tokens_wagered, default to 1.00)
        ELSIF v_game_record.metadata->>'session_type' = '1v1' OR
              v_game_record.metadata->>'competition_type' = '1v1' OR
              v_game_record.game_type LIKE '%1v1%' THEN
            -- For 1v1, if tokens_wagered is NULL or 0, default to 1.00
            v_entry_fee := COALESCE(NULLIF(v_game_record.tokens_wagered, 0), 1.00);
            v_competition_type := '1v1';
            
        -- Everything else: use tokens_wagered or default to 1.00
        ELSE
            v_entry_fee := COALESCE(NULLIF(v_game_record.tokens_wagered, 0), 1.00);
            v_competition_type := 'competition';
        END IF;
        
        -- Create transaction
        INSERT INTO public.user_transactions (
            user_id, type, amount, description, status,
            competition_type, game_type, metadata, created_at
        ) VALUES (
            v_user_id,
            'entry_fee',
            -v_entry_fee,
            'Game Entry - ' || v_game_record.game_type || ' ($' || v_entry_fee || ')',
            'completed',
            v_competition_type,
            v_game_record.game_type,
            jsonb_build_object(
                'game_history_id', v_game_record.id,
                'backfilled', true,
                'entry_fee', v_entry_fee,
                'original_tokens_wagered', v_game_record.tokens_wagered
            ),
            v_game_record.created_at
        )
        RETURNING id INTO v_transaction_id;
        
        v_total_backfilled := v_total_backfilled + 1;
        
        IF v_total_backfilled <= 10 THEN
            RAISE NOTICE '✅ % - $% (type: %)', 
                v_game_record.game_type, 
                v_entry_fee,
                v_competition_type;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DONE! Backfilled % games', v_total_backfilled;
    RAISE NOTICE '========================================';
END;
$$;

