-- ============================================================================
-- PROPER FIX FOR AUDIT LOG RLS PERMISSIONS
-- This fixes the "permission denied for table users" error
-- ============================================================================

-- ============================================================================
-- STEP 1: Create helper function to check if user is admin
-- Using SECURITY DEFINER so it can access auth.users safely
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'rf32191@gmail.com'
  );
END;
$$;

-- ============================================================================
-- STEP 2: Recreate RLS policies using the helper function
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON game_audit_log;

-- Users can view their own logs
CREATE POLICY "Users can view own audit logs"
  ON game_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can view ALL logs (using helper function)
CREATE POLICY "Admin can view all audit logs"
  ON game_audit_log FOR SELECT
  USING (is_admin());

-- Allow inserts (for audit logging)
CREATE POLICY "Service role can insert audit logs"
  ON game_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STEP 3: Fix other tables' RLS the same way
-- ============================================================================

-- Security alerts
DROP POLICY IF EXISTS "Admin can view all security alerts" ON game_security_alerts;

CREATE POLICY "Admin can view all security alerts"
  ON game_security_alerts FOR SELECT
  USING (is_admin());

-- Admin notifications
DROP POLICY IF EXISTS "Admin can view own notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admin can update own notifications" ON admin_notifications;

CREATE POLICY "Admin can view own notifications"
  ON admin_notifications FOR SELECT
  USING (is_admin() OR admin_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Service role can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update own notifications"
  ON admin_notifications FOR UPDATE
  USING (is_admin() OR admin_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================================================
-- STEP 4: Test the fix
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS POLICIES FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Testing if queries work...';
END $$;

-- Test query (should work now)
SELECT 
  COUNT(*) as total_audit_logs,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as most_recent
FROM game_audit_log;

-- Show recent logs
SELECT 
  username,
  game_type,
  score,
  score_rating,
  threat_level,
  created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to Admin Dashboard → Audit Logs tab';
  RAISE NOTICE '2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)';
  RAISE NOTICE '3. You should see ALL audit logs now!';
  RAISE NOTICE '';
  RAISE NOTICE 'If you still get permission errors:';
  RAISE NOTICE '  - Log out and log back in';
  RAISE NOTICE '  - Clear browser cache completely';
  RAISE NOTICE '  - Try Incognito/Private mode';
  RAISE NOTICE '';
END $$;

