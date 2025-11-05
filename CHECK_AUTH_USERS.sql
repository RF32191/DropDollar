-- ============================================================================
-- CHECK SUPABASE AUTH USERS
-- This checks if you actually have an account in Supabase Auth
-- ============================================================================

-- STEP 1: Check if your email exists in auth.users
-- CHANGE THIS EMAIL TO YOURS!
DO $$
DECLARE
  v_email TEXT := 'ryanrfermoselle@yahoo.com'; -- ← CHANGE THIS!
  v_auth_user_id UUID;
  v_auth_user_created TIMESTAMP;
  v_auth_confirmed BOOLEAN;
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'CHECKING SUPABASE AUTH FOR: %', v_email;
  RAISE NOTICE '======================================';
  
  -- Check auth.users table
  SELECT id, created_at, email_confirmed_at IS NOT NULL
  INTO v_auth_user_id, v_auth_user_created, v_auth_confirmed
  FROM auth.users
  WHERE email = v_email;
  
  IF v_auth_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Account EXISTS in Supabase Auth';
    RAISE NOTICE '   User ID: %', v_auth_user_id;
    RAISE NOTICE '   Created: %', v_auth_user_created;
    RAISE NOTICE '   Email Confirmed: %', v_auth_confirmed;
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Your account exists!';
    RAISE NOTICE '   If login fails, your PASSWORD is incorrect.';
    RAISE NOTICE '   Use "Forgot Password" to reset it.';
  ELSE
    RAISE NOTICE '❌ Account DOES NOT EXIST in Supabase Auth';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 YOU NEED TO REGISTER FIRST!';
    RAISE NOTICE '   Go to: https://www.drop-dollar.com/auth/register';
    RAISE NOTICE '   Create an account with this email: %', v_email;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ NOTE: We cannot see your password in Supabase Auth.';
    RAISE NOTICE '   Only you know your password.';
  END IF;
  
  RAISE NOTICE '======================================';
END $$;

-- STEP 2: List ALL auth users (to see if ANY accounts exist)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- STEP 3: Check public.users to see profiles without auth
SELECT 
  u.id,
  u.email,
  u.username,
  u.purchased_tokens,
  u.won_tokens,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id) 
    THEN '✅ Has Auth Account'
    ELSE '❌ NO AUTH ACCOUNT'
  END as auth_status
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 10;

