-- ============================================================================
-- FIX: Add INSERT policy for game_audit_log
-- ============================================================================
-- Problem: RLS was blocking inserts even with SECURITY DEFINER
-- Solution: Allow authenticated users to insert audit logs
-- ============================================================================

-- Grant INSERT permission to authenticated users
GRANT INSERT ON public.game_audit_log TO authenticated;

-- Create permissive INSERT policy
CREATE POLICY IF NOT EXISTS "users_can_insert_audit_log"
ON public.game_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure the service role can insert (for backend functions)
GRANT INSERT ON public.game_audit_log TO service_role;

-- Test it immediately
SELECT frontend_log_game_completion_standalone(
    'policy_test',
    'practice',
    3333,
    88.8,
    0.4,
    60,
    '{"test": "after_policy_fix"}'::jsonb
) as result;

-- Check if it was created
SELECT 
    game_type,
    score,
    username,
    created_at
FROM game_audit_log
WHERE game_type = 'policy_test'
ORDER BY created_at DESC
LIMIT 1;

-- Count total logs (should increase)
SELECT COUNT(*) as total_logs FROM game_audit_log;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ INSERT POLICY ADDED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '1. Granted INSERT permission to authenticated';
    RAISE NOTICE '2. Created permissive INSERT policy';
    RAISE NOTICE '3. Granted INSERT to service_role';
    RAISE NOTICE '';
    RAISE NOTICE 'Check results above:';
    RAISE NOTICE '- First result should show success=true';
    RAISE NOTICE '- Second result should show policy_test record';
    RAISE NOTICE '- Third result should show count = 3 or more';
    RAISE NOTICE '';
    RAISE NOTICE 'If this works: THE AUDIT SYSTEM IS FIXED!';
    RAISE NOTICE '';
END $$;

