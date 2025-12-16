-- ============================================
-- UPDATE: Link phone verification to user accounts
-- ============================================
-- This adds user_id column to track which user completed registration with each phone

-- Step 1: Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'phone_verification_codes' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.phone_verification_codes 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added user_id column to phone_verification_codes';
  ELSE
    RAISE NOTICE '✅ user_id column already exists';
  END IF;
END $$;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS phone_verification_user_id_idx 
ON public.phone_verification_codes (user_id);

-- Step 3: Create function to link phone to user after registration
CREATE OR REPLACE FUNCTION public.link_phone_to_user(
  p_phone text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_7 text;
BEGIN
  -- Get last 7 digits for matching
  last_7 := right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 7);
  
  -- Update the most recent verification code for this phone to link it to the user
  UPDATE public.phone_verification_codes
  SET user_id = p_user_id
  WHERE verified = true
  AND user_id IS NULL
  AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 7) = last_7
  AND created_at = (
    SELECT MAX(created_at) 
    FROM public.phone_verification_codes 
    WHERE verified = true 
    AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 7) = last_7
  );
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_phone_to_user(text, uuid) TO service_role, postgres;

-- Step 4: Show current state
SELECT 
  'Current verification codes' as info,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE verified = true) as verified,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as linked_to_user
FROM phone_verification_codes;

-- ============================================
-- HOW IT WORKS NOW:
-- ============================================
-- 1. User enters phone → verification code sent → row created with verified=false
-- 2. User enters correct code → verified=true (but user_id is still NULL)
-- 3. User completes registration → user_id is set to their account ID
-- 4. Now that phone is BLOCKED for new registrations
-- 
-- If user verifies code but doesn't complete registration:
-- - verified=true but user_id=NULL
-- - Phone is NOT blocked
-- - User can try again to register with same phone

