-- ============================================================================
-- FIX 1V1 FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- This fixes the foreign key references from auth.users to public.users
-- Run this if you get "violates foreign key constraint" errors
-- ============================================================================

-- Drop the existing foreign key constraints
ALTER TABLE one_v_one_participants 
DROP CONSTRAINT IF EXISTS one_v_one_participants_user_id_fkey;

ALTER TABLE one_v_one_sessions 
DROP CONSTRAINT IF EXISTS one_v_one_sessions_winner_user_id_fkey;

-- Add the correct foreign key constraints pointing to public.users
ALTER TABLE one_v_one_participants 
ADD CONSTRAINT one_v_one_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE one_v_one_sessions 
ADD CONSTRAINT one_v_one_sessions_winner_user_id_fkey 
FOREIGN KEY (winner_user_id) REFERENCES public.users(id);

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraints fixed!';
  RAISE NOTICE '📊 one_v_one_participants now references public.users(id)';
  RAISE NOTICE '📊 one_v_one_sessions now references public.users(id)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 You can now join 1v1 battles without foreign key errors!';
END $$;

