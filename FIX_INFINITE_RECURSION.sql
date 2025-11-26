-- ============================================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- The is_admin() function was causing infinite loops
-- ============================================================================

-- Drop the problematic is_admin function
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Drop all existing policies on game_audit_log
DROP POLICY IF EXISTS "Users can view own audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON game_audit_log;

-- Create simple, non-recursive policies
-- Users can view their own logs
CREATE POLICY "Users can view own audit logs"
  ON game_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can view ALL logs (direct email check, no function)
CREATE POLICY "Admin can view all audit logs"
  ON game_audit_log FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'
    )
  );

-- Allow inserts from authenticated users
CREATE POLICY "Service role can insert audit logs"
  ON game_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Test query (should work without recursion error now)
SELECT 
  COUNT(*) as total_logs,
  MAX(created_at) as most_recent
FROM game_audit_log;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RECURSION ERROR FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin dashboard should now load without errors.';
  RAISE NOTICE 'Refresh the page and the 403/500 errors should be gone.';
  RAISE NOTICE '';
END $$;

