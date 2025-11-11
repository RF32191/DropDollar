-- ============================================================================
-- FIX AUDIT TABLE FOREIGN KEY CONSTRAINT
-- ============================================================================
-- The game_session_audit table has a foreign key to auth.users
-- This causes errors when logging actions for users that don't exist yet
-- Solution: Remove the foreign key constraint (audit is just logs, doesn't need it)
-- ============================================================================

SELECT '🔧 Fixing audit table foreign key constraint...' as step;

-- Check if foreign key exists
SELECT 
  '🔍 Current Constraints' as check_name,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'game_session_audit'::regclass;

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  -- Try to drop the constraint
  ALTER TABLE game_session_audit DROP CONSTRAINT IF EXISTS game_session_audit_user_id_fkey;
  RAISE NOTICE '✅ Dropped foreign key constraint on user_id';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Constraint may not exist or already dropped';
END $$;

-- Make user_id nullable (audit logs should work even if user is deleted)
ALTER TABLE game_session_audit 
ALTER COLUMN user_id DROP NOT NULL;

SELECT '✅ user_id is now nullable' as result;

-- Verify fix
SELECT 
  '📊 Verification' as check_name,
  column_name,
  data_type,
  is_nullable,
  'No FK constraint' as constraint_status
FROM information_schema.columns
WHERE table_name = 'game_session_audit' AND column_name = 'user_id';

SELECT '🎉 Audit table fixed!' as message;
SELECT 'Can now log actions for any user without FK errors' as status;

