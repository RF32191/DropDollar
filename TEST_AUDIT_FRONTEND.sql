-- ============================================================================
-- TEST AUDIT FRONTEND CONNECTION
-- Run this AFTER deploying DEPLOY_AUDIT_NO_DEADLOCK.sql
-- This will verify the audit system is working
-- ============================================================================

-- 1. Check if tables exist
SELECT 
  'game_audit_log exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'game_audit_log'
  ) as passed;

SELECT 
  'game_security_alerts exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'game_security_alerts'
  ) as passed;

SELECT 
  'admin_notifications exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'admin_notifications'
  ) as passed;

-- 2. Check if main function exists
SELECT 
  'frontend_log_game_completion function exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_name = 'frontend_log_game_completion'
  ) as passed;

-- 3. Check RLS policies
SELECT 
  'RLS policies on game_audit_log' as check_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'game_audit_log';

-- 4. Get admin user ID (rf32191@gmail.com)
SELECT 
  'Admin user ID' as check_name,
  id,
  email
FROM auth.users
WHERE email = 'rf32191@gmail.com';

-- 5. Check if there are any audit logs
SELECT 
  'Total audit logs' as check_name,
  COUNT(*) as log_count
FROM game_audit_log;

-- 6. Show recent audit logs (if any)
SELECT 
  'Recent audit logs' as info,
  username,
  game_type,
  score,
  score_rating,
  threat_level,
  played_at
FROM game_audit_log
ORDER BY played_at DESC
LIMIT 5;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- All "passed" should be TRUE
-- Policy count should be 3
-- Admin user should show rf32191@gmail.com with a UUID
-- Log count starts at 0 (will increase as you play games)
-- ============================================================================

-- If all checks pass, try inserting a test log:
-- (Only run this if tables exist!)

/*
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'rf32191@gmail.com' LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Admin user not found!';
  ELSE
    -- Insert test audit log
    INSERT INTO game_audit_log (
      user_id, 
      username, 
      game_type, 
      game_mode, 
      score, 
      accuracy,
      score_rating
    ) VALUES (
      v_admin_id,
      'TEST_USER',
      'test_game',
      'practice',
      1000,
      95.5,
      8
    );
    
    RAISE NOTICE '✅ Test log inserted! Check Admin Dashboard → Audit Logs';
  END IF;
END $$;
*/

-- To run the test insert, uncomment the section above (remove /* and */)

