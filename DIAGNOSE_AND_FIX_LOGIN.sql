-- ============================================================================
-- DIAGNOSE AND FIX LOGIN ISSUES
-- This will check your account and create it if needed
-- ============================================================================

-- STEP 1: Check if your account exists in auth.users (Supabase Auth)
-- Replace 'YOUR_EMAIL_HERE' with your actual email
DO $$
DECLARE
  v_email TEXT := 'ryanrfermoselle@yahoo.com'; -- CHANGE THIS TO YOUR EMAIL
  v_auth_user_id UUID;
  v_public_user_exists BOOLEAN;
  v_profile_id UUID;
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'STEP 1: Checking Supabase Auth Users';
  RAISE NOTICE '======================================';
  
  -- Check if user exists in auth.users
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_auth_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Found in auth.users - ID: %', v_auth_user_id;
  ELSE
    RAISE NOTICE '❌ NOT found in auth.users';
    RAISE NOTICE '⚠️ User needs to sign up first at https://www.drop-dollar.com/auth/register';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'STEP 2: Checking public.users Table';
  RAISE NOTICE '======================================';
  
  -- Check if user exists in public.users
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE email = v_email
  ) INTO v_public_user_exists;
  
  IF v_public_user_exists THEN
    SELECT id INTO v_profile_id FROM public.users WHERE email = v_email;
    RAISE NOTICE '✅ Found in public.users - ID: %', v_profile_id;
    
    -- Show current tokens
    DECLARE
      v_purchased NUMERIC;
      v_won NUMERIC;
    BEGIN
      SELECT purchased_tokens, won_tokens 
      INTO v_purchased, v_won
      FROM public.users 
      WHERE email = v_email;
      
      RAISE NOTICE '💰 Purchased tokens: %', COALESCE(v_purchased, 0);
      RAISE NOTICE '🏆 Won tokens: %', COALESCE(v_won, 0);
      RAISE NOTICE '💎 Total: %', COALESCE(v_purchased, 0) + COALESCE(v_won, 0);
    END;
  ELSE
    RAISE NOTICE '❌ NOT found in public.users';
    RAISE NOTICE '🔄 Creating profile in public.users...';
    
    -- Create the user profile
    INSERT INTO public.users (
      id,
      email,
      username,
      first_name,
      last_name,
      purchased_tokens,
      won_tokens,
      balance,
      total_spent,
      total_earned,
      games_played,
      games_won,
      is_active,
      role,
      created_at,
      updated_at,
      last_login
    ) VALUES (
      v_auth_user_id,
      v_email,
      split_part(v_email, '@', 1), -- username from email
      '',
      '',
      0, -- purchased_tokens
      0, -- won_tokens
      0, -- balance
      0, -- total_spent
      0, -- total_earned
      0, -- games_played
      0, -- games_won
      true, -- is_active
      'buyer', -- role
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Profile created successfully!';
    RAISE NOTICE '💰 Starting tokens: 0';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ DIAGNOSIS COMPLETE';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'You can now try logging in at:';
  RAISE NOTICE 'https://www.drop-dollar.com/auth/login';
  
END $$;

-- STEP 3: Verify the profile is correct
-- Replace with your email
SELECT 
  id,
  email,
  username,
  purchased_tokens,
  won_tokens,
  (purchased_tokens + won_tokens) as total_tokens,
  is_active,
  created_at,
  last_login
FROM public.users
WHERE email = 'ryanrfermoselle@yahoo.com' -- CHANGE THIS
LIMIT 1;

-- ============================================================================
-- FOR MULTIPLE ACCOUNTS - Run this for each email
-- ============================================================================

-- Uncomment and run for each account:

/*
-- Account 2
DO $$
DECLARE
  v_email TEXT := 'ryanfermoselle@yahoo.com'; -- Second email
  v_auth_user_id UUID;
BEGIN
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_email;
  
  IF v_auth_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
    INSERT INTO public.users (
      id, email, username, purchased_tokens, won_tokens, balance,
      total_spent, total_earned, games_played, games_won, is_active, role,
      created_at, updated_at, last_login
    ) VALUES (
      v_auth_user_id, v_email, split_part(v_email, '@', 1),
      0, 0, 0, 0, 0, 0, 0, true, 'buyer',
      NOW(), NOW(), NOW()
    );
    RAISE NOTICE '✅ Created profile for: %', v_email;
  END IF;
END $$;

-- Account 3
DO $$
DECLARE
  v_email TEXT := 'rf32191@gmail.com'; -- Third email
  v_auth_user_id UUID;
BEGIN
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_email;
  
  IF v_auth_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
    INSERT INTO public.users (
      id, email, username, purchased_tokens, won_tokens, balance,
      total_spent, total_earned, games_played, games_won, is_active, role,
      created_at, updated_at, last_login
    ) VALUES (
      v_auth_user_id, v_email, split_part(v_email, '@', 1),
      0, 0, 0, 0, 0, 0, 0, true, 'buyer',
      NOW(), NOW(), NOW()
    );
    RAISE NOTICE '✅ Created profile for: %', v_email;
  END IF;
END $$;
*/

