-- ============================================================================
-- COMPLETE SKILL-BASED GAMING ADMIN TOOLS
-- ============================================================================
-- This SQL creates admin functions for monitoring and reviewing:
-- 
-- ✅ View suspicious sessions
-- ✅ Review and approve/reject payouts
-- ✅ Ban/unban users
-- ✅ View rate limit violations
-- ✅ Generate compliance reports
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: get_suspicious_sessions (Admin Monitoring)
-- ============================================================================
-- Returns all sessions with high suspicion scores

DROP FUNCTION IF EXISTS get_suspicious_sessions(INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION get_suspicious_sessions(min_suspicion INTEGER DEFAULT 60)
RETURNS TABLE (
  session_id TEXT,
  user_id UUID,
  user_email TEXT,
  game_type TEXT,
  suspicion_score INTEGER,
  client_score DECIMAL(10,2),
  server_score DECIMAL(10,2),
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.session_id,
    gs.user_id,
    u.email,
    gs.game_type,
    gs.suspicion_score,
    gs.client_score,
    gs.server_score,
    gs.status,
    gs.created_at
  FROM public.game_sessions gs
  JOIN auth.users u ON u.id = gs.user_id
  WHERE gs.suspicion_score >= min_suspicion
  ORDER BY gs.suspicion_score DESC, gs.created_at DESC
  LIMIT 100;
END;
$$;

-- ============================================================================
-- FUNCTION 2: get_pending_payout_reviews (Admin Review Queue)
-- ============================================================================
-- Returns all payouts pending admin review

DROP FUNCTION IF EXISTS get_pending_payout_reviews() CASCADE;

CREATE OR REPLACE FUNCTION get_pending_payout_reviews()
RETURNS TABLE (
  payout_id UUID,
  user_id UUID,
  user_email TEXT,
  competition_type TEXT,
  prize_amount DECIMAL(10,2),
  final_score DECIMAL(10,2),
  suspicion_score INTEGER,
  validation_status TEXT,
  awarded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    u.email,
    p.competition_type,
    p.prize_amount,
    p.final_score,
    p.suspicion_score,
    p.validation_status,
    p.awarded_at
  FROM public.payout_audit_trail p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.validation_status IN ('pending', 'under_review')
  ORDER BY p.suspicion_score DESC, p.awarded_at DESC
  LIMIT 100;
END;
$$;

-- ============================================================================
-- FUNCTION 3: approve_payout (Admin Action)
-- ============================================================================
-- Approves a payout after review

DROP FUNCTION IF EXISTS approve_payout(UUID, UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION approve_payout(
  payout_id_param UUID,
  admin_id_param UUID,
  admin_notes_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payout_record RECORD;
BEGIN
  -- Get payout details
  SELECT * INTO payout_record
  FROM public.payout_audit_trail
  WHERE id = payout_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Payout not found');
  END IF;
  
  -- Update payout status
  UPDATE public.payout_audit_trail
  SET 
    validation_status = 'approved',
    is_validated = TRUE,
    validator_id = admin_id_param,
    validated_at = NOW(),
    notes = COALESCE(notes, '') || E'\n[APPROVED] ' || admin_notes_param
  WHERE id = payout_id_param;
  
  -- Award tokens to user's WON wallet
  UPDATE public.users
  SET 
    won_tokens = COALESCE(won_tokens, 0) + payout_record.prize_amount,
    updated_at = NOW()
  WHERE id = payout_record.user_id;
  
  -- Clear any anti-cheat flags for this session
  UPDATE public.anti_cheat_logs
  SET 
    action_taken = 'cleared',
    reviewed_at = NOW(),
    reviewed_by = admin_id_param,
    admin_notes = admin_notes_param
  WHERE session_id = payout_record.session_id;
  
  RAISE NOTICE '✅ Payout approved: % tokens to user %', payout_record.prize_amount, payout_record.user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Payout approved and tokens awarded',
    'prize_amount', payout_record.prize_amount
  );
END;
$$;

-- ============================================================================
-- FUNCTION 4: reject_payout (Admin Action)
-- ============================================================================
-- Rejects a payout due to cheating/fraud

DROP FUNCTION IF EXISTS reject_payout(UUID, UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION reject_payout(
  payout_id_param UUID,
  admin_id_param UUID,
  rejection_reason_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payout_record RECORD;
BEGIN
  -- Get payout details
  SELECT * INTO payout_record
  FROM public.payout_audit_trail
  WHERE id = payout_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Payout not found');
  END IF;
  
  -- Update payout status
  UPDATE public.payout_audit_trail
  SET 
    validation_status = 'rejected',
    is_validated = FALSE,
    validator_id = admin_id_param,
    validated_at = NOW(),
    notes = COALESCE(notes, '') || E'\n[REJECTED] ' || rejection_reason_param
  WHERE id = payout_id_param;
  
  -- Mark anti-cheat logs
  UPDATE public.anti_cheat_logs
  SET 
    action_taken = 'prize_withheld',
    reviewed_at = NOW(),
    reviewed_by = admin_id_param,
    admin_notes = rejection_reason_param
  WHERE session_id = payout_record.session_id;
  
  -- Increment user's suspicious flag counter
  UPDATE public.user_rate_limits
  SET 
    suspicious_flags_count = suspicious_flags_count + 1,
    last_flag_at = NOW()
  WHERE user_id = payout_record.user_id;
  
  RAISE NOTICE '❌ Payout rejected for user %: %', payout_record.user_id, rejection_reason_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Payout rejected',
    'reason', rejection_reason_param
  );
END;
$$;

-- ============================================================================
-- FUNCTION 5: ban_user (Admin Action)
-- ============================================================================
-- Bans a user for cheating

DROP FUNCTION IF EXISTS ban_user(UUID, UUID, INTEGER, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION ban_user(
  user_id_param UUID,
  admin_id_param UUID,
  days_param INTEGER,
  reason_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ban_until TIMESTAMPTZ;
BEGIN
  ban_until := NOW() + (days_param || ' days')::INTERVAL;
  
  -- Ensure rate limit record exists
  INSERT INTO public.user_rate_limits (user_id, updated_at)
  VALUES (user_id_param, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Ban user
  UPDATE public.user_rate_limits
  SET 
    is_banned = TRUE,
    banned_until = ban_until,
    ban_reason = reason_param,
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RAISE NOTICE '🚫 User % banned until % (reason: %)', user_id_param, ban_until, reason_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User banned',
    'banned_until', ban_until,
    'reason', reason_param
  );
END;
$$;

-- ============================================================================
-- FUNCTION 6: unban_user (Admin Action)
-- ============================================================================
-- Unbans a user

DROP FUNCTION IF EXISTS unban_user(UUID, UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION unban_user(
  user_id_param UUID,
  admin_id_param UUID,
  notes_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Unban user
  UPDATE public.user_rate_limits
  SET 
    is_banned = FALSE,
    banned_until = NULL,
    ban_reason = NULL,
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RAISE NOTICE '✅ User % unbanned by admin %', user_id_param, admin_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User unbanned',
    'notes', notes_param
  );
END;
$$;

-- ============================================================================
-- FUNCTION 7: get_user_compliance_report (Admin Report)
-- ============================================================================
-- Generates a compliance report for a specific user

DROP FUNCTION IF EXISTS get_user_compliance_report(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_compliance_report(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  rate_limit_record RECORD;
  total_games INTEGER;
  total_flags INTEGER;
  total_payouts DECIMAL(10,2);
  avg_suspicion DECIMAL(5,2);
  report JSON;
BEGIN
  -- Get user details
  SELECT * INTO user_record
  FROM public.users
  WHERE id = user_id_param;
  
  -- Get rate limit details
  SELECT * INTO rate_limit_record
  FROM public.user_rate_limits
  WHERE user_id = user_id_param;
  
  -- Calculate statistics
  SELECT COUNT(*) INTO total_games
  FROM public.game_sessions
  WHERE user_id = user_id_param;
  
  SELECT COUNT(*) INTO total_flags
  FROM public.anti_cheat_logs
  WHERE user_id = user_id_param;
  
  SELECT COALESCE(SUM(prize_amount), 0) INTO total_payouts
  FROM public.payout_audit_trail
  WHERE user_id = user_id_param AND validation_status = 'approved';
  
  SELECT COALESCE(AVG(suspicion_score), 0) INTO avg_suspicion
  FROM public.game_sessions
  WHERE user_id = user_id_param;
  
  -- Build report
  report := json_build_object(
    'user_id', user_id_param,
    'email', user_record.email,
    'purchased_tokens', COALESCE(user_record.purchased_tokens, 0),
    'won_tokens', COALESCE(user_record.won_tokens, 0),
    'total_games_played', total_games,
    'total_flags', total_flags,
    'total_payouts_received', total_payouts,
    'average_suspicion_score', avg_suspicion,
    'is_banned', COALESCE(rate_limit_record.is_banned, FALSE),
    'banned_until', rate_limit_record.banned_until,
    'ban_reason', rate_limit_record.ban_reason,
    'suspicious_flags_count', COALESCE(rate_limit_record.suspicious_flags_count, 0),
    'games_played_today', COALESCE(rate_limit_record.games_played_today, 0)
  );
  
  RETURN report;
END;
$$;

-- ============================================================================
-- FUNCTION 8: get_daily_compliance_stats (Admin Dashboard)
-- ============================================================================
-- Returns daily statistics for compliance monitoring

DROP FUNCTION IF EXISTS get_daily_compliance_stats() CASCADE;

CREATE OR REPLACE FUNCTION get_daily_compliance_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSON;
  games_today INTEGER;
  flags_today INTEGER;
  payouts_pending INTEGER;
  users_banned INTEGER;
BEGIN
  -- Games played today
  SELECT COUNT(*) INTO games_today
  FROM public.game_sessions
  WHERE created_at >= NOW() - INTERVAL '24 hours';
  
  -- Flags today
  SELECT COUNT(*) INTO flags_today
  FROM public.anti_cheat_logs
  WHERE flagged_at >= NOW() - INTERVAL '24 hours';
  
  -- Pending payouts
  SELECT COUNT(*) INTO payouts_pending
  FROM public.payout_audit_trail
  WHERE validation_status IN ('pending', 'under_review');
  
  -- Currently banned users
  SELECT COUNT(*) INTO users_banned
  FROM public.user_rate_limits
  WHERE is_banned = TRUE AND (banned_until IS NULL OR banned_until > NOW());
  
  stats := json_build_object(
    'games_played_today', games_today,
    'flags_raised_today', flags_today,
    'payouts_pending_review', payouts_pending,
    'users_currently_banned', users_banned,
    'report_generated_at', NOW()
  );
  
  RETURN stats;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all admin functions
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
  'get_suspicious_sessions',
  'get_pending_payout_reviews',
  'approve_payout',
  'reject_payout',
  'ban_user',
  'unban_user',
  'get_user_compliance_report',
  'get_daily_compliance_stats'
)
ORDER BY proname;

-- ============================================================================
-- DONE - STEP 4!
-- ============================================================================
-- ✅ get_suspicious_sessions: View flagged games
-- ✅ get_pending_payout_reviews: Review queue for admins
-- ✅ approve_payout: Approve and award prizes
-- ✅ reject_payout: Reject fraudulent wins
-- ✅ ban_user: Ban cheaters
-- ✅ unban_user: Unban after review
-- ✅ get_user_compliance_report: Detailed user audit
-- ✅ get_daily_compliance_stats: Dashboard statistics
-- ============================================================================

SELECT 'STEP 4 COMPLETE: All admin tools created!' as status;

