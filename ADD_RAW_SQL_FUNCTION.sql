-- ============================================
-- Add Raw SQL Insert Function (Ultimate Fallback)
-- ============================================
-- This is a simple function that just does the insert

-- Drop if exists
DROP FUNCTION IF EXISTS public.save_phone_raw(uuid, text);

-- Create simple insert function
CREATE OR REPLACE FUNCTION public.save_phone_raw(
  p_user_id uuid,
  p_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_phones (user_id, phone_number, verified, created_at)
  VALUES (p_user_id, p_phone, true, now());
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Insert failed: %', SQLERRM;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_phone_raw(uuid, text) TO service_role, postgres;

-- Also grant direct insert permissions to service role on user_phones
GRANT ALL ON public.user_phones TO service_role;
GRANT ALL ON public.user_phones TO postgres;

-- Test it
DO $$
DECLARE
  test_user_id uuid;
  result boolean;
BEGIN
  -- Get a real user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No users found to test with';
  ELSE
    -- Try the function
    SELECT public.save_phone_raw(test_user_id, '+19997776666') INTO result;
    
    IF result THEN
      RAISE NOTICE '✅ save_phone_raw works! Result: %', result;
      -- Clean up
      DELETE FROM public.user_phones WHERE phone_number = '+19997776666';
      RAISE NOTICE '✅ Test cleaned up';
    ELSE
      RAISE NOTICE '❌ save_phone_raw failed';
    END IF;
  END IF;
END $$;

-- Show what's in the table
SELECT 
  'Current phones' as info,
  COUNT(*) as total
FROM public.user_phones;

