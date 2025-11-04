-- ============================================================================
-- FIX USER_RATE_LIMITS FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This fixes the foreign key constraint error when creating rate limit records
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE public.user_rate_limits 
DROP CONSTRAINT IF EXISTS user_rate_limits_user_id_fkey;

-- Recreate the constraint with ON DELETE CASCADE and proper reference
ALTER TABLE public.user_rate_limits
ADD CONSTRAINT user_rate_limits_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- Verify the constraint
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table
FROM pg_constraint
WHERE conname = 'user_rate_limits_user_id_fkey';

-- ============================================================================
-- Test the fix by checking rate limits for a real user
-- ============================================================================

-- Get a sample user to test
DO $$
DECLARE
  test_user_id UUID;
  test_result JSON;
BEGIN
  -- Get first user from public.users
  SELECT id INTO test_user_id FROM public.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test check_rate_limit
    SELECT check_rate_limit(test_user_id) INTO test_result;
    RAISE NOTICE '✅ Test successful! Rate limit check result: %', test_result;
  ELSE
    RAISE NOTICE '⚠️ No users found in public.users table';
  END IF;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ Foreign key constraint fixed
-- ✅ Now references public.users instead of auth.users
-- ✅ ON DELETE CASCADE ensures cleanup when users are deleted
-- ============================================================================

SELECT '✅ user_rate_limits constraint fixed!' as status;

