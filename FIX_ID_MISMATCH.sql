-- ============================================================================
-- FIX ID MISMATCH - Sync auth.users ID to public.users
-- ============================================================================

-- Show the problem
DO $$
DECLARE
  v_auth_id UUID;
  v_public_id UUID;
  v_email TEXT := 'ryanrfermoselle@yahoo.com';
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
  SELECT id INTO v_public_id FROM public.users WHERE email = v_email;
  
  RAISE NOTICE '📊 ID MISMATCH DETECTED:';
  RAISE NOTICE '  Auth ID:   %', v_auth_id;
  RAISE NOTICE '  Public ID: %', v_public_id;
  RAISE NOTICE '';
END $$;

-- Fix: Delete the wrong public user and create with correct ID
DO $$
DECLARE
  v_auth_id UUID;
  v_auth_email TEXT;
  v_auth_created TIMESTAMP WITH TIME ZONE;
  v_old_purchased NUMERIC;
  v_old_won NUMERIC;
BEGIN
  RAISE NOTICE '🔧 FIXING ID MISMATCH...';
  
  -- Get auth user details
  SELECT id, email, created_at 
  INTO v_auth_id, v_auth_email, v_auth_created
  FROM auth.users
  WHERE email = 'ryanrfermoselle@yahoo.com';
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE '❌ User not found in auth.users!';
    RETURN;
  END IF;
  
  RAISE NOTICE '  Auth user found: % (%)', v_auth_email, v_auth_id;
  
  -- Save old token balances if they exist
  SELECT 
    COALESCE(purchased_tokens, 0), 
    COALESCE(won_tokens, 0)
  INTO v_old_purchased, v_old_won
  FROM public.users
  WHERE email = 'ryanrfermoselle@yahoo.com';
  
  IF FOUND THEN
    RAISE NOTICE '  Saving old balances: purchased=%, won=%', v_old_purchased, v_old_won;
  ELSE
    v_old_purchased := 0;
    v_old_won := 0;
  END IF;
  
  -- Delete old public user(s) with this email
  DELETE FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';
  RAISE NOTICE '  ✅ Deleted old public user(s)';
  
  -- Create new user with correct auth ID
  INSERT INTO public.users (
    id,
    email,
    username,
    purchased_tokens,
    won_tokens,
    created_at,
    updated_at
  ) VALUES (
    v_auth_id,
    v_auth_email,
    'ryanrfermoselle',
    v_old_purchased,
    v_old_won,
    v_auth_created,
    NOW()
  );
  
  RAISE NOTICE '  ✅ Created new user with correct ID';
  RAISE NOTICE '';
  RAISE NOTICE '✅ FIX COMPLETE!';
END $$;

-- Verify fix
DO $$
DECLARE
  v_auth_id UUID;
  v_public_id UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'ryanrfermoselle@yahoo.com';
  SELECT id INTO v_public_id FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Auth ID:   %', v_auth_id;
  RAISE NOTICE '  Public ID: %', v_public_id;
  
  IF v_auth_id = v_public_id THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ IDs NOW MATCH!';
    RAISE NOTICE '🚀 Login should work now!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ IDs still dont match - something is wrong';
  END IF;
  RAISE NOTICE '';
END $$;

-- Show final user data
SELECT 'FINAL USER DATA:' as info;
SELECT id, email, username, purchased_tokens, won_tokens, created_at
FROM public.users
WHERE email = 'ryanrfermoselle@yahoo.com';

