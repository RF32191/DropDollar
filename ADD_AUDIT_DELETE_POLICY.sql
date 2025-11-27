-- ============================================
-- 🗑️ Add Delete Policy for Audit Logs
-- ============================================
-- Run this in Supabase SQL Editor
-- Allows admin to delete audit logs
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Allow admin to delete audit logs" ON public.game_audit_log;

-- Create delete policy for admin
CREATE POLICY "Allow admin to delete audit logs"
ON public.game_audit_log
FOR DELETE
TO authenticated
USING (
    -- Only allow admin (rf32191@gmail.com) to delete
    auth.jwt() ->> 'email' = 'rf32191@gmail.com'
);

-- Verify policy was created
SELECT 
    '✅ DELETE POLICY ADDED!' as status,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'game_audit_log' AND cmd = 'DELETE';

