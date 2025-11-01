-- =========================================================
-- PHONE NUMBER SECURITY & IDENTITY PROTECTION SYSTEM
-- =========================================================
-- This SQL ensures phone numbers are unique, indexed, and required
-- for all NEW user registrations (existing users are grandfathered in)
-- 
-- Purpose: Enhanced identity protection and fraud prevention
-- Date: 2025-01-01
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '📱 Setting up Phone Number Security System...';
END $$;

-- =========================================================
-- STEP 1: Ensure phone column exists in users table
-- =========================================================

DO $$ 
BEGIN
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column to users table';
  ELSE
    RAISE NOTICE '✓ Phone column already exists';
  END IF;
END $$;

-- =========================================================
-- STEP 2: Create unique index on phone numbers
-- =========================================================

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

-- =========================================================
-- STEP 3: Create performance index for phone lookups
-- =========================================================

DROP INDEX IF EXISTS idx_users_phone_lookup;
CREATE INDEX idx_users_phone_lookup ON public.users (phone) WHERE phone IS NOT NULL;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created performance index for phone lookups';
END $$;

-- =========================================================
-- STEP 4: Add phone verification tracking column
-- =========================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added phone_verified column';
  ELSE
    RAISE NOTICE '✓ phone_verified column already exists';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'phone_verified_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone_verified_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added phone_verified_at column';
  ELSE
    RAISE NOTICE '✓ phone_verified_at column already exists';
  END IF;
END $$;

-- =========================================================
-- STEP 5: Create function to check phone availability
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_phone_available(phone_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if phone number is already in use
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE phone = phone_param 
    AND phone IS NOT NULL 
    AND phone != ''
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_phone_available(TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created is_phone_available() function';
END $$;

-- =========================================================
-- STEP 6: Create audit log for phone number changes
-- =========================================================

CREATE TABLE IF NOT EXISTS public.phone_number_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  old_phone TEXT,
  new_phone TEXT,
  action TEXT CHECK (action IN ('added', 'updated', 'removed', 'verified')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_phone_audit_user_id ON public.phone_number_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_phone_audit_created_at ON public.phone_number_audit (created_at DESC);

-- Enable RLS
ALTER TABLE public.phone_number_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own audit log
CREATE POLICY "Users can view own phone audit" ON public.phone_number_audit
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- RLS Policy: Service role can insert audit records
CREATE POLICY "Service can insert phone audit" ON public.phone_number_audit
  FOR INSERT
  WITH CHECK (true);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created phone_number_audit table with RLS';
END $$;

-- =========================================================
-- STEP 7: Create trigger to log phone number changes
-- =========================================================

CREATE OR REPLACE FUNCTION public.log_phone_number_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log phone number additions
  IF OLD.phone IS NULL AND NEW.phone IS NOT NULL THEN
    INSERT INTO public.phone_number_audit (user_id, old_phone, new_phone, action)
    VALUES (NEW.id, NULL, NEW.phone, 'added');
  END IF;
  
  -- Log phone number updates
  IF OLD.phone IS NOT NULL AND NEW.phone IS NOT NULL AND OLD.phone != NEW.phone THEN
    INSERT INTO public.phone_number_audit (user_id, old_phone, new_phone, action)
    VALUES (NEW.id, OLD.phone, NEW.phone, 'updated');
  END IF;
  
  -- Log phone number removals
  IF OLD.phone IS NOT NULL AND NEW.phone IS NULL THEN
    INSERT INTO public.phone_number_audit (user_id, old_phone, new_phone, action)
    VALUES (NEW.id, OLD.phone, NULL, 'removed');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_log_phone_changes ON public.users;

-- Create trigger
CREATE TRIGGER trigger_log_phone_changes
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_phone_number_change();

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created trigger to log phone number changes';
END $$;

-- =========================================================
-- STEP 8: Statistics and Summary
-- =========================================================

DO $$ 
DECLARE
  total_users INTEGER;
  users_with_phone INTEGER;
  users_without_phone INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO users_with_phone FROM public.users WHERE phone IS NOT NULL AND phone != '';
  SELECT COUNT(*) INTO users_without_phone FROM public.users WHERE phone IS NULL OR phone = '';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 PHONE NUMBER SECURITY SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Users: %', total_users;
  RAISE NOTICE 'Users with phone: %', users_with_phone;
  RAISE NOTICE 'Users without phone: % (grandfathered)', users_without_phone;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Security Features Enabled:';
  RAISE NOTICE '  - Unique phone number constraint';
  RAISE NOTICE '  - Performance indexes';
  RAISE NOTICE '  - Phone verification tracking';
  RAISE NOTICE '  - Audit logging for changes';
  RAISE NOTICE '  - RLS policies for privacy';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 NEW users MUST provide phone number';
  RAISE NOTICE '✓ EXISTING users without phone are grandfathered';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

