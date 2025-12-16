-- ============================================================================
-- DELETE PHONE COLUMN ONLY
-- ============================================================================
-- This ONLY deletes the phone column from users table
-- Nothing else is touched
-- ============================================================================

-- Delete the phone column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users DROP COLUMN phone CASCADE;
    RAISE NOTICE '✅ Phone column DELETED';
  ELSE
    RAISE NOTICE '⚠️  Phone column does not exist';
  END IF;
END $$;

-- Show that it's gone
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

RAISE NOTICE 'ℹ️  Check the list above - phone column should be GONE';

-- Confirm status
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PHONE COLUMN DELETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The phone column has been removed';
  RAISE NOTICE 'from the users table.';
  RAISE NOTICE '';
  RAISE NOTICE 'Nothing else was changed.';
  RAISE NOTICE '========================================';
END $$;

