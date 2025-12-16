-- ============================================
-- QUICK FIX: Recreate Function with Better Logic
-- ============================================
-- This ensures the function works regardless of format issues

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.check_phone_exists(text);

CREATE OR REPLACE FUNCTION public.check_phone_exists(phone_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  phone_exists boolean;
  normalized_phone text;
BEGIN
  -- Normalize the input phone number
  -- Remove all non-digits
  normalized_phone := regexp_replace(phone_to_check, '[^0-9]', '', 'g');
  
  -- If it's 10 digits, add 1 prefix
  IF length(normalized_phone) = 10 THEN
    normalized_phone := '1' || normalized_phone;
  END IF;
  
  -- Now check against all possible formats in database
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_phones 
    WHERE 
      -- Exact match
      phone_number = phone_to_check
      OR
      -- Match with + added
      phone_number = '+' || phone_to_check
      OR
      -- Match normalized (digits only, with +1)
      phone_number = '+' || normalized_phone
      OR
      -- Match normalized (digits only, no +)
      phone_number = normalized_phone
      OR
      -- Match with just digits from database phone
      regexp_replace(phone_number, '[^0-9]', '', 'g') = normalized_phone
  ) INTO phone_exists;
  
  RETURN phone_exists;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO anon;

-- Test it
SELECT 
  'Function test' as test,
  public.check_phone_exists('+15551234567') as test1,
  public.check_phone_exists('15551234567') as test2,
  public.check_phone_exists('5551234567') as test3;

-- Show what's in the table
SELECT 
  'Phones in database' as info,
  phone_number,
  created_at
FROM public.user_phones
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- This function now checks MULTIPLE formats:
-- ============================================
-- 1. Exact match
-- 2. With + prefix added
-- 3. Normalized to +1XXXXXXXXXX
-- 4. Without + prefix
-- 5. Comparing just digits
--
-- So it will find the phone NO MATTER what format it's stored in!

