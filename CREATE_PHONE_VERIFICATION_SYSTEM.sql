-- ============================================================================
-- PHONE VERIFICATION SYSTEM (NO TWILIO REQUIRED)
-- ============================================================================
-- Creates a database-backed phone verification system that works with any
-- SMS provider or in development mode without external services
-- ============================================================================

-- ============================================================================
-- STEP 1: Create phone verification codes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL, -- Normalized version for lookup
  code TEXT NOT NULL, -- 6-digit verification code
  attempts INTEGER DEFAULT 0, -- Number of verification attempts
  max_attempts INTEGER DEFAULT 5, -- Maximum attempts allowed
  expires_at TIMESTAMPTZ NOT NULL, -- Code expiration time (10 minutes)
  verified BOOLEAN DEFAULT FALSE, -- Whether code has been verified
  verified_at TIMESTAMPTZ, -- When code was verified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET, -- IP address of requester
  user_agent TEXT -- User agent of requester
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone_normalized ON public.phone_verification_codes (phone_normalized, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_verification_code ON public.phone_verification_codes (code, phone_normalized) WHERE verified = FALSE;
CREATE INDEX IF NOT EXISTS idx_phone_verification_expires ON public.phone_verification_codes (expires_at) WHERE verified = FALSE;

-- Enable RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert verification codes (for registration)
CREATE POLICY "Anyone can create verification codes" ON public.phone_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Anyone can verify codes (for registration)
CREATE POLICY "Anyone can verify codes" ON public.phone_verification_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Service role can view all codes (for admin/debugging)
CREATE POLICY "Service can view all codes" ON public.phone_verification_codes
  FOR SELECT
  USING (true);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created phone_verification_codes table with RLS';
END $$;

-- ============================================================================
-- STEP 2: Create function to generate verification code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_phone_verification_code(
  phone_param TEXT,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_phone TEXT;
  verification_code TEXT;
  expires_at_time TIMESTAMPTZ;
BEGIN
  -- Normalize phone number
  normalized_phone := public.normalize_phone_number(phone_param);
  
  IF normalized_phone IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- Generate 6-digit code
  verification_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Set expiration (10 minutes from now)
  expires_at_time := NOW() + INTERVAL '10 minutes';
  
  -- Invalidate any existing unverified codes for this phone
  UPDATE public.phone_verification_codes
  SET verified = TRUE
  WHERE phone_normalized = normalized_phone
    AND verified = FALSE
    AND expires_at > NOW();
  
  -- Insert new verification code
  INSERT INTO public.phone_verification_codes (
    phone,
    phone_normalized,
    code,
    expires_at,
    ip_address,
    user_agent
  )
  VALUES (
    phone_param,
    normalized_phone,
    verification_code,
    expires_at_time,
    ip_address_param,
    user_agent_param
  );
  
  RETURN verification_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_phone_verification_code(TEXT, INET, TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created generate_phone_verification_code() function';
END $$;

-- ============================================================================
-- STEP 3: Create function to verify code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_phone_code(
  phone_param TEXT,
  code_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_phone TEXT;
  code_record RECORD;
BEGIN
  -- Normalize phone number
  normalized_phone := public.normalize_phone_number(phone_param);
  
  IF normalized_phone IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Find unverified, non-expired code
  SELECT * INTO code_record
  FROM public.phone_verification_codes
  WHERE phone_normalized = normalized_phone
    AND code = code_param
    AND verified = FALSE
    AND expires_at > NOW()
    AND attempts < max_attempts
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no code found, increment attempts on most recent code (for security)
  IF code_record IS NULL THEN
    UPDATE public.phone_verification_codes
    SET attempts = attempts + 1
    WHERE phone_normalized = normalized_phone
      AND verified = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN FALSE;
  END IF;
  
  -- Check if too many attempts
  IF code_record.attempts >= code_record.max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Verify the code
  UPDATE public.phone_verification_codes
  SET verified = TRUE,
      verified_at = NOW(),
      attempts = attempts + 1
  WHERE id = code_record.id;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_phone_code(TEXT, TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created verify_phone_code() function';
END $$;

-- ============================================================================
-- STEP 4: Create function to check if phone is verified
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_phone_verified(phone_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_phone TEXT;
BEGIN
  -- Normalize phone number
  normalized_phone := public.normalize_phone_number(phone_param);
  
  IF normalized_phone IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if there's a verified code within the last 24 hours
  RETURN EXISTS (
    SELECT 1
    FROM public.phone_verification_codes
    WHERE phone_normalized = normalized_phone
      AND verified = TRUE
      AND verified_at > NOW() - INTERVAL '24 hours'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_phone_verified(TEXT) TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created is_phone_verified() function';
END $$;

-- ============================================================================
-- STEP 5: Create cleanup function for expired codes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete codes older than 24 hours
  DELETE FROM public.phone_verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes() TO authenticated, anon, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created cleanup_expired_verification_codes() function';
END $$;

-- ============================================================================
-- STEP 6: Create trigger to auto-cleanup expired codes (optional)
-- ============================================================================

-- Note: This requires pg_cron extension. If not available, run cleanup manually or via cron job.

DO $$ 
BEGIN
  -- Try to create a scheduled job (requires pg_cron extension)
  BEGIN
    PERFORM cron.schedule(
      'cleanup-expired-phone-codes',
      '0 * * * *', -- Every hour
      $$SELECT public.cleanup_expired_verification_codes()$$
    );
    RAISE NOTICE '✅ Created scheduled cleanup job (requires pg_cron extension)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not create scheduled job (pg_cron not available). Run cleanup manually or via external cron.';
  END;
END $$;

-- ============================================================================
-- STEP 7: Summary
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📱 PHONE VERIFICATION SYSTEM READY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Features:';
  RAISE NOTICE '  - Database-backed verification codes';
  RAISE NOTICE '  - No external SMS service required';
  RAISE NOTICE '  - Works with any SMS provider API';
  RAISE NOTICE '  - Development mode support';
  RAISE NOTICE '  - Automatic code expiration (10 minutes)';
  RAISE NOTICE '  - Attempt limiting (5 attempts max)';
  RAISE NOTICE '  - Verification tracking (24 hour validity)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Functions Created:';
  RAISE NOTICE '  - generate_phone_verification_code(phone, ip, user_agent)';
  RAISE NOTICE '  - verify_phone_code(phone, code)';
  RAISE NOTICE '  - is_phone_verified(phone)';
  RAISE NOTICE '  - cleanup_expired_verification_codes()';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Usage:';
  RAISE NOTICE '  1. Call generate_phone_verification_code() to create code';
  RAISE NOTICE '  2. Send code via SMS (any provider) or display in dev mode';
  RAISE NOTICE '  3. Call verify_phone_code() to verify user input';
  RAISE NOTICE '  4. Check is_phone_verified() before allowing registration';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

