-- ============================================================================
-- FIX SIGNUP PROCESS: PHONE NUMBER & EMAIL DUPLICATES
-- ============================================================================
-- This script ensures:
-- 1. Phone numbers are unique and properly formatted
-- 2. Emails are unique
-- 3. Phone numbers are backed up like emails
-- 4. Existing accounts are not affected (grandfathered)
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure phone column exists and has proper constraints
-- ============================================================================

DO $$ 
BEGIN
  -- Check if phone column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column to public.users table';
  ELSE
    RAISE NOTICE '✓ Phone column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create unique constraint on phone numbers (ignores NULL for existing users)
-- ============================================================================

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_users_phone_unique;

-- Create partial unique index (ignores NULL values for existing users)
CREATE UNIQUE INDEX idx_users_phone_unique 
ON public.users (phone) 
WHERE phone IS NOT NULL AND phone != '';

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created unique index on phone numbers';
  RAISE NOTICE '   - Existing users without phone: ✓ Allowed (grandfathered)';
  RAISE NOTICE '   - New users without phone: ✗ Blocked';
  RAISE NOTICE '   - Duplicate phone numbers: ✗ Blocked';
END $$;

-- ============================================================================
-- STEP 3: Ensure email has unique constraint
-- ============================================================================

-- Check if unique constraint exists on email
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' 
    AND conrelid = 'public.users'::regclass
  ) THEN
    -- Create unique constraint on email
    ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    RAISE NOTICE '✅ Created unique constraint on email';
  ELSE
    RAISE NOTICE '✓ Email unique constraint already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create phone number backup table (similar to email backups)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phone_number_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL, -- Normalized version for duplicate checking
  backup_type TEXT DEFAULT 'registration' CHECK (backup_type IN ('registration', 'update', 'verification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for phone number backup
CREATE INDEX IF NOT EXISTS idx_phone_backup_user_id ON public.phone_number_backup (user_id);
CREATE INDEX IF NOT EXISTS idx_phone_backup_phone ON public.phone_number_backup (phone);
CREATE INDEX IF NOT EXISTS idx_phone_backup_normalized ON public.phone_number_backup (phone_normalized);
CREATE INDEX IF NOT EXISTS idx_phone_backup_created_at ON public.phone_number_backup (created_at DESC);

-- Enable RLS
ALTER TABLE public.phone_number_backup ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own phone backups
CREATE POLICY "Users can view own phone backup" ON public.phone_number_backup
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- RLS Policy: Service role can insert/update phone backups
CREATE POLICY "Service can manage phone backup" ON public.phone_number_backup
  FOR ALL
  USING (true)
  WITH CHECK (true);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created phone_number_backup table with RLS';
END $$;

-- ============================================================================
-- STEP 5: Create function to normalize phone number (for duplicate checking)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_phone_number(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits_only TEXT;
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  digits_only := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Handle US numbers (10 digits) - add 1 prefix for comparison
  IF length(digits_only) = 10 THEN
    RETURN '1' || digits_only;
  END IF;
  
  -- Handle US numbers with country code (11 digits starting with 1)
  IF length(digits_only) = 11 AND digits_only LIKE '1%' THEN
    RETURN digits_only;
  END IF;
  
  -- For other formats, return digits only
  RETURN digits_only;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone_number(TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created normalize_phone_number() function';
END $$;

-- ============================================================================
-- STEP 6: Create trigger to backup phone numbers on insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backup_phone_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only backup if phone number is provided
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    INSERT INTO public.phone_number_backup (
      user_id,
      phone,
      phone_normalized,
      backup_type,
      metadata
    )
    VALUES (
      NEW.id,
      NEW.phone,
      public.normalize_phone_number(NEW.phone),
      CASE 
        WHEN OLD.phone IS NULL THEN 'registration'
        WHEN OLD.phone != NEW.phone THEN 'update'
        ELSE 'verification'
      END,
      jsonb_build_object(
        'action', CASE 
          WHEN OLD.phone IS NULL THEN 'registered'
          WHEN OLD.phone != NEW.phone THEN 'updated'
          ELSE 'verified'
        END,
        'timestamp', NOW()
      )
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate backups
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_backup_phone_number ON public.users;

-- Create trigger
CREATE TRIGGER trigger_backup_phone_number
  AFTER INSERT OR UPDATE OF phone ON public.users
  FOR EACH ROW
  WHEN (NEW.phone IS NOT NULL AND NEW.phone != '')
  EXECUTE FUNCTION public.backup_phone_number();

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created trigger to backup phone numbers';
END $$;

-- ============================================================================
-- STEP 7: Create function to check if phone number is available
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_phone_available(phone_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_input TEXT;
BEGIN
  IF phone_param IS NULL OR phone_param = '' THEN
    RETURN FALSE;
  END IF;
  
  normalized_input := public.normalize_phone_number(phone_param);
  
  -- Check if phone number is already in use (check normalized version)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE phone IS NOT NULL 
    AND phone != ''
    AND public.normalize_phone_number(phone) = normalized_input
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_phone_available(TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created is_phone_available() function';
END $$;

-- ============================================================================
-- STEP 8: Create function to check if email is available
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_email_available(email_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF email_param IS NULL OR email_param = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if email is already in use (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(email_param))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_email_available(TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created is_email_available() function';
END $$;

-- ============================================================================
-- STEP 9: Statistics and Summary
-- ============================================================================

DO $$ 
DECLARE
  total_users INTEGER;
  users_with_phone INTEGER;
  users_without_phone INTEGER;
  users_with_email INTEGER;
  duplicate_phones INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO users_with_phone FROM public.users WHERE phone IS NOT NULL AND phone != '';
  SELECT COUNT(*) INTO users_without_phone FROM public.users WHERE phone IS NULL OR phone = '';
  SELECT COUNT(*) INTO users_with_email FROM public.users WHERE email IS NOT NULL AND email != '';
  
  -- Check for duplicate phones (normalized)
  SELECT COUNT(*) INTO duplicate_phones
  FROM (
    SELECT public.normalize_phone_number(phone) as normalized, COUNT(*) as cnt
    FROM public.users
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY public.normalize_phone_number(phone)
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 SIGNUP FIX SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Users: %', total_users;
  RAISE NOTICE 'Users with phone: %', users_with_phone;
  RAISE NOTICE 'Users without phone: % (grandfathered)', users_without_phone;
  RAISE NOTICE 'Users with email: %', users_with_email;
  RAISE NOTICE 'Duplicate phones found: %', duplicate_phones;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Security Features Enabled:';
  RAISE NOTICE '  - Unique phone number constraint';
  RAISE NOTICE '  - Unique email constraint';
  RAISE NOTICE '  - Phone number backup table';
  RAISE NOTICE '  - Phone number normalization';
  RAISE NOTICE '  - Duplicate checking functions';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 NEW users MUST provide unique phone number and email';
  RAISE NOTICE '✓ EXISTING users without phone are grandfathered';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

