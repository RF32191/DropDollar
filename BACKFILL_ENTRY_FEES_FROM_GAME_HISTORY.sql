-- ============================================
-- BACKFILL MISSING ENTRY FEES FROM GAME HISTORY
-- ============================================
-- This creates transaction records for all past games
-- by looking at game_history and determining entry fees
-- ============================================

DO $$
DECLARE
    v_game_record RECORD;
    v_entry_fee DECIMAL(10,2);
    v_competition_type TEXT;
    v_transaction_id UUID;
    v_total_backfilled INTEGER := 0;
    v_user_id UUID := '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'; -- Your user ID
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 BACKFILLING ENTRY FEES FROM GAME HISTORY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Loop through all games in game_history for this user
    FOR v_game_record IN (
        SELECT 
            gh.id,
            gh.user_id,
            gh.game_type,
            gh."mode" as game_mode,  -- Alias 'mode' to avoid reserved word issues
            gh.score,
            gh.tokens_wagered,
            gh.tokens_won,
            gh.metadata,
            gh.created_at
        FROM public.game_history gh
        WHERE gh.user_id = v_user_id
        AND gh."mode" = 'competition' -- Only competition games (not practice)
        ORDER BY gh.created_at ASC
    ) LOOP
        -- Check if we already have a transaction for this game
        IF EXISTS (
            SELECT 1 FROM public.user_transactions ut
            WHERE ut.user_id = v_user_id
            AND ut.metadata->>'game_history_id' = v_game_record.id::TEXT
        ) THEN
            -- Already have a transaction for this game, skip
            CONTINUE;
        END IF;
        
        -- Determine entry fee and competition type based on game metadata
        v_entry_fee := COALESCE(v_game_record.tokens_wagered, 1.00);
        
        -- Determine competition type from metadata or game type
        IF v_game_record.metadata->>'competition_type' IS NOT NULL THEN
            v_competition_type := v_game_record.metadata->>'competition_type';
        ELSIF v_game_record.metadata->>'session_type' = 'coin_play' THEN
            v_competition_type := 'coin_play';
            v_entry_fee := 0.25; -- Coin Play is always 0.25
        ELSIF v_game_record.metadata->>'session_type' = 'winner_takes_all' THEN
            v_competition_type := 'winner_takes_all';
            v_entry_fee := COALESCE(v_entry_fee, 1.00);
        ELSIF v_game_record.metadata->>'session_type' = 'hotsell' THEN
            v_competition_type := 'hotsell';
            v_entry_fee := COALESCE(v_entry_fee, 1.00);
        ELSIF v_game_record.metadata->>'session_type' = '1v1' THEN
            v_competition_type := '1v1';
            -- 1v1 fees vary: check metadata or use tokens_wagered
            IF v_game_record.tokens_wagered IS NOT NULL THEN
                v_entry_fee := v_game_record.tokens_wagered;
            ELSE
                v_entry_fee := 1.00; -- Default to $1 if not specified
            END IF;
        ELSE
            -- Unknown competition type, try to infer from tokens_wagered
            v_competition_type := 'competition';
            v_entry_fee := COALESCE(v_entry_fee, 1.00);
        END IF;
        
        -- Create transaction record
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
            v_user_id,
            'entry_fee',
            -v_entry_fee, -- Negative because it's a deduction
            format('%s Entry Fee - %s', 
                CASE 
                    WHEN v_competition_type = 'coin_play' THEN 'Coin Play'
                    WHEN v_competition_type = 'winner_takes_all' THEN 'Winner Takes All'
                    WHEN v_competition_type = 'hotsell' THEN 'Hot Sell'
                    WHEN v_competition_type = '1v1' THEN '1v1'
                    ELSE 'Competition'
                END,
                v_game_record.game_type
            ),
            'completed',
            v_competition_type,
            v_game_record.metadata->>'session_id',
            v_game_record.game_type,
            jsonb_build_object(
                'game_history_id', v_game_record.id,
                'backfilled', true,
                'original_timestamp', v_game_record.created_at,
                'entry_fee', v_entry_fee,
                'score', v_game_record.score
            ),
            v_game_record.created_at -- Use original game timestamp
        )
        RETURNING id INTO v_transaction_id;
        
        v_total_backfilled := v_total_backfilled + 1;
        
        IF v_total_backfilled <= 5 THEN
            RAISE NOTICE '✅ Backfilled: % - $% (%)', 
                v_game_record.game_type, 
                v_entry_fee, 
                v_competition_type;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ BACKFILL COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total entry fees backfilled: %', v_total_backfilled;
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Refresh your browser to see all entry fees!';
    RAISE NOTICE '========================================';
END;
$$;

-- Verify the results
DO $$
DECLARE
    v_user_id UUID := '52c0b177-e93f-4b4d-bedc-8ccd89044b4f';
    v_total_games INTEGER;
    v_total_transactions INTEGER;
    v_entry_fee_transactions INTEGER;
    v_purchase_transactions INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_games
    FROM public.game_history
    WHERE user_id = v_user_id AND "mode" = 'competition';
    
    SELECT COUNT(*) INTO v_total_transactions
    FROM public.user_transactions
    WHERE user_id = v_user_id;
    
    SELECT COUNT(*) INTO v_entry_fee_transactions
    FROM public.user_transactions
    WHERE user_id = v_user_id AND type = 'entry_fee';
    
    SELECT COUNT(*) INTO v_purchase_transactions
    FROM public.user_transactions
    WHERE user_id = v_user_id AND type IN ('token_purchase', 'purchase');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 FINAL COUNTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total competition games played: %', v_total_games;
    RAISE NOTICE 'Total transactions: %', v_total_transactions;
    RAISE NOTICE 'Entry fee transactions: %', v_entry_fee_transactions;
    RAISE NOTICE 'Purchase transactions: %', v_purchase_transactions;
    RAISE NOTICE '========================================';
END;
$$;

