-- ============================================================================
-- COMPLETE SKILL-BASED GAMING FUNCTIONS - ALL VALIDATION & SECURITY
-- ============================================================================
-- This SQL creates all helper functions for skill-based gaming:
-- 
-- ✅ spend_tokens (dual wallet - purchased first)
-- ✅ check_rate_limit (prevent abuse)
-- ✅ validate_session_not_expired (ensure fairness)
-- ✅ log_suspicious_activity (admin alerts)
-- ✅ update_rate_limits (track usage)
-- ✅ create_payout_audit (track prize distribution)
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: spend_tokens (Dual Wallet System)
-- ============================================================================
-- ALWAYS spends purchased tokens first, then won tokens
-- This is critical for legal compliance!

DROP FUNCTION IF EXISTS spend_tokens(UUID, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION spend_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  purchased_spent DECIMAL(10,2),
  won_spent DECIMAL(10,2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_purchased DECIMAL(10,2);
  current_won DECIMAL(10,2);
  total_available DECIMAL(10,2);
  purchased_to_spend DECIMAL(10,2);
  won_to_spend DECIMAL(10,2);
BEGIN
  -- Get current balances
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO current_purchased, current_won
  FROM public.users
  WHERE id = user_id_param;
  
  total_available := current_purchased + current_won;
  
  -- Check if user has enough tokens
  IF total_available < amount THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::DECIMAL(10,2), 
      0::DECIMAL(10,2),
      'Insufficient tokens. Need ' || amount::TEXT || ', have ' || total_available::TEXT;
    RETURN;
  END IF;
  
  -- ALWAYS SPEND PURCHASED TOKENS FIRST! (Legal requirement)
  IF current_purchased >= amount THEN
    purchased_to_spend := amount;
    won_to_spend := 0;
  ELSE
    purchased_to_spend := current_purchased;
    won_to_spend := amount - current_purchased;
  END IF;
  
  -- Update balances
  UPDATE public.users
  SET 
    purchased_tokens = purchased_tokens - purchased_to_spend,
    won_tokens = won_tokens - won_to_spend,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  RAISE NOTICE '💰 Spent % tokens (purchased: %, won: %)', amount, purchased_to_spend, won_to_spend;
  
  RETURN QUERY SELECT 
    TRUE, 
    purchased_to_spend, 
    won_to_spend,
    'Successfully spent ' || amount::TEXT || ' tokens';
END;
$$;

GRANT EXECUTE ON FUNCTION spend_tokens(UUID, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- FUNCTION 2: check_rate_limit (Prevent Abuse)
-- ============================================================================
-- Checks if user is allowed to play another game
-- Returns: { allowed: BOOLEAN, reason: TEXT }

DROP FUNCTION IF EXISTS check_rate_limit(UUID) CASCADE;

CREATE OR REPLACE FUNCTION check_rate_limit(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate_record RECORD;
  games_last_hour INTEGER;
  is_currently_banned BOOLEAN;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.user_rate_limits (user_id, updated_at)
  VALUES (user_id_param, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO rate_record
  FROM public.user_rate_limits
  WHERE user_id = user_id_param;
  
  -- Check if banned
  IF rate_record.is_banned THEN
    IF rate_record.banned_until IS NULL OR rate_record.banned_until > NOW() THEN
      RETURN json_build_object(
        'allowed', false,
        'reason', 'Account temporarily suspended: ' || COALESCE(rate_record.ban_reason, 'Suspicious activity detected')
      );
    ELSE
      -- Ban expired, unban user
      UPDATE public.user_rate_limits
      SET is_banned = FALSE, banned_until = NULL, ban_reason = NULL
      WHERE user_id = user_id_param;
    END IF;
  END IF;
  
  -- Check hourly limit (max 30 games per hour)
  IF rate_record.last_game_at IS NOT NULL AND 
     rate_record.last_game_at > NOW() - INTERVAL '1 hour' THEN
    games_last_hour := rate_record.games_played_last_hour;
    IF games_last_hour >= 30 THEN
      RETURN json_build_object(
        'allowed', false,
        'reason', 'Rate limit exceeded. Maximum 30 games per hour. Please wait.'
      );
    END IF;
  END IF;
  
  -- Check daily limit (max 200 games per day)
  IF rate_record.daily_reset_at < NOW() - INTERVAL '24 hours' THEN
    -- Reset daily counter
    UPDATE public.user_rate_limits
    SET 
      games_played_today = 0,
      daily_reset_at = NOW()
    WHERE user_id = user_id_param;
  ELSIF rate_record.games_played_today >= 200 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Daily limit reached. Maximum 200 games per day.'
    );
  END IF;
  
  -- All checks passed
  RETURN json_build_object('allowed', true, 'reason', '');
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(UUID) TO authenticated, anon;

-- ============================================================================
-- FUNCTION 3: update_rate_limits (Track Usage)
-- ============================================================================
-- Called after each game is played

DROP FUNCTION IF EXISTS update_rate_limits(UUID) CASCADE;

CREATE OR REPLACE FUNCTION update_rate_limits(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure record exists
  INSERT INTO public.user_rate_limits (user_id, updated_at)
  VALUES (user_id_param, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update counters
  UPDATE public.user_rate_limits
  SET 
    games_played_last_hour = CASE 
      WHEN last_game_at IS NULL OR last_game_at < NOW() - INTERVAL '1 hour' 
      THEN 1 
      ELSE games_played_last_hour + 1 
    END,
    games_played_today = games_played_today + 1,
    last_game_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RAISE NOTICE '📊 Rate limits updated for user %', user_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION update_rate_limits(UUID) TO authenticated, anon;

-- ============================================================================
-- FUNCTION 4: log_suspicious_activity (Admin Alerts)
-- ============================================================================
-- Logs suspicious gameplay for admin review

DROP FUNCTION IF EXISTS log_suspicious_activity(UUID, TEXT, TEXT, INTEGER, TEXT[], DECIMAL, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION log_suspicious_activity(
  user_id_param UUID,
  session_id_param TEXT,
  game_type_param TEXT,
  suspicion_score_param INTEGER,
  reasons_param TEXT[],
  client_score_param DECIMAL(10,2),
  server_score_param DECIMAL(10,2)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Insert into anti_cheat_logs
  INSERT INTO public.anti_cheat_logs (
    user_id,
    session_id,
    game_type,
    suspicion_score,
    reasons,
    client_score,
    server_score,
    flagged_at
  ) VALUES (
    user_id_param,
    session_id_param,
    game_type_param,
    suspicion_score_param,
    reasons_param,
    client_score_param,
    server_score_param,
    NOW()
  )
  RETURNING id INTO log_id;
  
  -- If suspicion is very high, increment user's flag counter
  IF suspicion_score_param >= 80 THEN
    UPDATE public.user_rate_limits
    SET 
      suspicious_flags_count = suspicious_flags_count + 1,
      last_flag_at = NOW()
    WHERE user_id = user_id_param;
    
    -- Auto-ban if 3+ high-suspicion flags
    UPDATE public.user_rate_limits
    SET 
      is_banned = TRUE,
      banned_until = NOW() + INTERVAL '7 days',
      ban_reason = 'Multiple suspicious activity detections - automatic review required'
    WHERE user_id = user_id_param
      AND suspicious_flags_count >= 3
      AND is_banned = FALSE;
  END IF;
  
  RAISE NOTICE '🚨 Suspicious activity logged: % (score: %)', session_id_param, suspicion_score_param;
  
  RETURN log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_suspicious_activity(UUID, TEXT, TEXT, INTEGER, TEXT[], DECIMAL, DECIMAL) TO authenticated, anon;

-- ============================================================================
-- FUNCTION 5: create_payout_audit (Track Prize Distribution)
-- ============================================================================
-- Creates audit trail for every prize payout

DROP FUNCTION IF EXISTS create_payout_audit(UUID, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, INTEGER, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION create_payout_audit(
  user_id_param UUID,
  session_id_param TEXT,
  competition_type_param TEXT,
  prize_amount_param DECIMAL(10,2),
  entry_fee_param DECIMAL(10,2),
  platform_fee_param DECIMAL(10,2),
  final_score_param DECIMAL(10,2),
  rank_param INTEGER,
  total_participants_param INTEGER,
  suspicion_score_param INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
  validation_status_value TEXT;
BEGIN
  -- Determine validation status based on suspicion score
  IF suspicion_score_param >= 80 THEN
    validation_status_value := 'rejected';
  ELSIF suspicion_score_param >= 60 THEN
    validation_status_value := 'under_review';
  ELSE
    validation_status_value := 'approved';
  END IF;
  
  -- Insert audit record
  INSERT INTO public.payout_audit_trail (
    user_id,
    session_id,
    competition_type,
    prize_amount,
    entry_fee,
    platform_fee,
    final_score,
    rank,
    total_participants,
    suspicion_score,
    validation_status,
    is_validated,
    awarded_at
  ) VALUES (
    user_id_param,
    session_id_param,
    competition_type_param,
    prize_amount_param,
    entry_fee_param,
    platform_fee_param,
    final_score_param,
    rank_param,
    total_participants_param,
    suspicion_score_param,
    validation_status_value,
    suspicion_score_param < 60, -- Auto-validate if low suspicion
    NOW()
  )
  RETURNING id INTO audit_id;
  
  RAISE NOTICE '💵 Payout audit created: % tokens (status: %)', prize_amount_param, validation_status_value;
  
  RETURN audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_payout_audit(UUID, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, INTEGER, INTEGER, INTEGER) TO authenticated, anon;

-- ============================================================================
-- FUNCTION 6: validate_session_not_expired (Ensure Fairness)
-- ============================================================================
-- Checks if a game session is still valid (not expired)

DROP FUNCTION IF EXISTS validate_session_not_expired(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION validate_session_not_expired(session_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT * INTO session_record
  FROM public.game_sessions
  WHERE session_id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'Session not found'
    );
  END IF;
  
  IF session_record.expires_at < NOW() THEN
    -- Mark as expired
    UPDATE public.game_sessions
    SET status = 'expired'
    WHERE session_id = session_id_param;
    
    RETURN json_build_object(
      'valid', false,
      'reason', 'Session expired'
    );
  END IF;
  
  IF session_record.status != 'active' THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'Session already ' || session_record.status
    );
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'rng_seed', session_record.rng_seed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_session_not_expired(TEXT) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all created functions
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
  'spend_tokens',
  'check_rate_limit',
  'update_rate_limits',
  'log_suspicious_activity',
  'create_payout_audit',
  'validate_session_not_expired'
)
ORDER BY proname;

-- ============================================================================
-- DONE - STEP 2!
-- ============================================================================
-- ✅ spend_tokens: Dual wallet system (purchased first)
-- ✅ check_rate_limit: Prevent abuse (30/hour, 200/day limits)
-- ✅ update_rate_limits: Track user gameplay
-- ✅ log_suspicious_activity: Admin alerts for cheating
-- ✅ create_payout_audit: Track all prize distributions
-- ✅ validate_session_not_expired: Ensure fairness
-- ============================================================================

SELECT 'STEP 2 COMPLETE: All validation functions created!' as status;

