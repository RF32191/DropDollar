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
-- PART 2: WTA (WINNER TAKES ALL) ENTRY FEES
-- ============================================

-- Drop existing wta_join_v2 functions to avoid conflicts
DROP FUNCTION IF EXISTS wta_join_v2(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS wta_join_v2(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS wta_join_v2(TEXT, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS wta_join_v2(TEXT, TEXT, NUMERIC);

-- Update wta_join_v2 to save entry fees
CREATE OR REPLACE FUNCTION wta_join_v2(
    p_session TEXT,
    p_user UUID,
    p_fee DECIMAL(10,2)
)
RETURNS JSONB AS $$
DECLARE
  v_session UUID;
  v_purchased DECIMAL(10,2);
  v_won DECIMAL(10,2);
  v_participant_id UUID;
  v_hour INT;
  v_day INT;
  v_rng INT;
  v_session_record RECORD;
  v_transaction_id UUID;
BEGIN
  RAISE NOTICE '🎮 wta_join_v2: session=%, user=%, fee=%', p_session, p_user, p_fee;
  
  v_session := p_session::UUID;
  
  -- Rate limit check
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0) 
  INTO v_hour, v_day 
  FROM user_rate_limits 
  WHERE user_id = p_user;
  
  IF v_hour >= 30 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr'); 
  END IF;
  
  IF v_day >= 200 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day'); 
  END IF;
  
  -- Get user tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0) 
  INTO v_purchased, v_won 
  FROM users 
  WHERE id = p_user;
  
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('success', false, 'message', 'User not found'); 
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens'); 
  END IF;
  
  -- Get session info
  SELECT * INTO v_session_record
  FROM winner_takes_all_sessions 
  WHERE id = v_session AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  IF EXISTS(SELECT 1 FROM winner_takes_all_participants WHERE session_id = v_session AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens (purchased first, then won)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
  END IF;
  
  -- CRITICAL: Save entry fee to user_transactions
  v_transaction_id := save_entry_fee_to_user_transactions(
      p_user_id := p_user,
      p_entry_fee := p_fee,
      p_description := format('Winner Takes All Entry Fee - %s', COALESCE(v_session_record.game_type, 'Game')),
      p_competition_type := 'winner_takes_all',
      p_competition_id := v_session::TEXT,
      p_game_type := v_session_record.game_type,
      p_metadata := jsonb_build_object(
          'session_id', v_session,
          'config_id', v_session_record.config_id,
          'entry_fee', p_fee
      )
  );
  
  -- Also save to token_transactions for backward compatibility
  BEGIN
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, (v_purchased + v_won) - p_fee, format('WTA Entry - %s', COALESCE(v_session_record.game_type, 'Game')), NOW());
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
  END;
  
  -- Get RNG seed
  SELECT rng_seed INTO v_rng FROM winner_takes_all_sessions WHERE id = v_session;
  
  -- Add participant
  v_participant_id := gen_random_uuid();
  INSERT INTO winner_takes_all_participants (id, session_id, user_id, joined_at) 
  VALUES (v_participant_id, v_session, p_user, NOW());
  
  -- Update session
  UPDATE winner_takes_all_sessions SET
      participants_count = COALESCE(participants_count,0) + 1,
      prize_pool = COALESCE(prize_pool,0) + p_fee,
      current_pot = COALESCE(current_pot,0) + p_fee,
      updated_at = NOW()
  WHERE id = v_session;
  
  RETURN jsonb_build_object(
      'success', true, 
      'rng_seed', v_rng,
      'transaction_id', v_transaction_id
  );
  
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: HOT SELL ENTRY FEES
-- ============================================

-- Drop existing hs_join_v2 functions
DROP FUNCTION IF EXISTS hs_join_v2(TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS hs_join_v2(TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS hs_join_v2(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS hs_join_v2(UUID, UUID, NUMERIC);

-- Update hs_join_v2 to save entry fees
CREATE OR REPLACE FUNCTION hs_join_v2(
    p_session TEXT,
    p_user UUID,
    p_fee DECIMAL(10,2)
)
RETURNS JSONB AS $$
DECLARE
  v_session_uuid UUID;
  v_purchased DECIMAL(10,2);
  v_won DECIMAL(10,2);
  v_participant_id UUID;
  v_hour INT;
  v_day INT;
  v_rng INT;
  v_session_record RECORD;
  v_transaction_id UUID;
BEGIN
  RAISE NOTICE '🎮 hs_join_v2: session=%, user=%, fee=%', p_session, p_user, p_fee;
  
  BEGIN
    v_session_uuid := p_session::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
  END;
  
  -- Rate limit check
  SELECT COALESCE(games_last_hour,0), COALESCE(games_last_day,0) 
  INTO v_hour, v_day 
  FROM user_rate_limits 
  WHERE user_id = p_user;
  
  IF v_hour >= 30 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 30/hr'); 
  END IF;
  
  IF v_day >= 200 THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit: 200/day'); 
  END IF;
  
  -- Get user tokens
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0) 
  INTO v_purchased, v_won 
  FROM users 
  WHERE id = p_user;
  
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('success', false, 'message', 'User not found'); 
  END IF;
  
  IF (v_purchased + v_won) < p_fee THEN 
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens'); 
  END IF;
  
  -- Get session info
  SELECT * INTO v_session_record
  FROM hot_sell_sessions 
  WHERE id = v_session_uuid AND status IN ('waiting', 'active');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;
  
  IF EXISTS(SELECT 1 FROM hot_sell_participants WHERE session_id = v_session_uuid AND user_id = p_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;
  
  -- Deduct tokens (purchased first, then won)
  IF v_purchased >= p_fee THEN
    UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  ELSE
    UPDATE users SET purchased_tokens = 0, won_tokens = won_tokens - (p_fee - v_purchased) WHERE id = p_user;
  END IF;
  
  -- CRITICAL: Save entry fee to user_transactions
  v_transaction_id := save_entry_fee_to_user_transactions(
      p_user_id := p_user,
      p_entry_fee := p_fee,
      p_description := format('Hot Sell Entry Fee - %s', COALESCE(v_session_record.game_type, 'Game')),
      p_competition_type := 'hotsell',
      p_competition_id := v_session_uuid::TEXT,
      p_game_type := v_session_record.game_type,
      p_metadata := jsonb_build_object(
          'session_id', v_session_uuid,
          'config_id', v_session_record.config_id,
          'entry_fee', p_fee
      )
  );
  
  -- Also save to token_transactions for backward compatibility
  BEGIN
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, (v_purchased + v_won) - p_fee, format('Hot Sell Entry - %s', COALESCE(v_session_record.game_type, 'Game')), NOW());
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
  END;
  
  -- Get RNG seed
  SELECT rng_seed INTO v_rng FROM hot_sell_sessions WHERE id = v_session_uuid;
  
  -- Add participant
  v_participant_id := gen_random_uuid();
  INSERT INTO hot_sell_participants (id, session_id, user_id, joined_at) 
  VALUES (v_participant_id, v_session_uuid, p_user, NOW());
  
  -- Update session
  UPDATE hot_sell_sessions SET
      participants_count = COALESCE(participants_count,0) + 1,
      prize_pool = COALESCE(prize_pool,0) + p_fee,
      updated_at = NOW()
  WHERE id = v_session_uuid;
  
  RETURN jsonb_build_object(
      'success', true, 
      'rng_seed', v_rng,
      'transaction_id', v_transaction_id
  );
  
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: WTA PAYOUTS (Already in FIX_VICTORY_HISTORY_AND_PAYOUTS.sql)
-- But ensure it uses save_payout_to_user_transactions
-- ============================================

-- Update process_wta_payout to use helper function
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
    
    -- CRITICAL: Save payout to user_transactions
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
    
    -- Also save to token_transactions for backward compatibility
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

-- ============================================
-- PART 5: HOT SELL PAYOUTS
-- ============================================

-- Update Hot Sell payout function (if it exists)
-- This function should be called when Hot Sell session completes
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

-- ============================================
-- PART 6: TOURNAMENT PAYOUTS
-- ============================================

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

-- ============================================
-- PART 7: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION save_entry_fee_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION save_payout_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION wta_join_v2(TEXT, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION hs_join_v2(TEXT, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION process_wta_payout(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION save_hot_sell_payout(UUID, UUID, INTEGER, DECIMAL, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION save_tournament_payout(UUID, UUID, INTEGER, DECIMAL, TEXT, DECIMAL) TO authenticated;

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
-- History tab will now show:
--   1. All Purchases (green)
--   2. All Victories (yellow)
--   3. All Entry Fees/Deductions (red)
--   4. Complete Transaction History (all combined)
-- ============================================

