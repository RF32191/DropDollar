-- ============================================
-- FIX WTA ENTRY FEES TO SAVE TO user_transactions
-- ============================================
-- Updates WTA join function to save entry fees to user_transactions
-- This ensures entry fees show up in the history tab
-- ============================================

-- Step 1: Create helper function to save entry fee to user_transactions
CREATE OR REPLACE FUNCTION save_entry_fee_to_user_transactions(
    p_user_id UUID,
    p_entry_fee DECIMAL(10,2),
    p_description TEXT,
    p_competition_type TEXT DEFAULT 'winner_takes_all',
    p_competition_id TEXT DEFAULT NULL,
    p_game_type TEXT DEFAULT NULL,
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
        competition_type,
        competition_id,
        game_type,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        'entry_fee', -- Transaction type for entry fees
        -p_entry_fee, -- Negative amount (deduction)
        p_description,
        'completed',
        p_competition_type,
        p_competition_id,
        p_game_type,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    RAISE NOTICE '✅ [SaveEntryFee] Saved entry fee to user_transactions: % (ID: %)', p_description, v_transaction_id;
    
    RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [SaveEntryFee] Error saving entry fee: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update wta_join_v2 function to save to user_transactions
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
  RAISE NOTICE '🎮 wta_join_v2 called: session=%, user=%, fee=%', p_session, p_user, p_fee;
  
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
  
  -- CRITICAL: Save to user_transactions (for history tab)
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
  
  -- Also save to token_transactions for backward compatibility (if table exists)
  BEGIN
    INSERT INTO token_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
    VALUES (p_user, 'game_entry', -p_fee, (v_purchased + v_won) - p_fee, format('WTA Entry - %s', COALESCE(v_session_record.game_type, 'Game')), NOW());
  EXCEPTION WHEN OTHERS THEN
    -- token_transactions table might not exist, that's OK
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

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION save_entry_fee_to_user_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION wta_join_v2 TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- WTA entry fees will now save to user_transactions with:
-- - type = 'entry_fee'
-- - amount = negative entry fee (shows as deduction)
-- - competition_type = 'winner_takes_all'
-- - competition_id = session ID
-- - game_type = game name
--
-- This ensures entry fees show up in the "Game Entries & Token Deductions" section!
-- ============================================

