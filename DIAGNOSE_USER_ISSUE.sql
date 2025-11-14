-- ============================================================================
-- DIAGNOSE USER ISSUE
-- Check why user profile isn't loading
-- ============================================================================

-- Check auth.users
SELECT 'AUTH USERS:' as info;
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE email ILIKE '%ryanrfermoselle%'
ORDER BY created_at DESC;

-- Check public.users
SELECT 'PUBLIC USERS:' as info;
SELECT id, email, username, purchased_tokens, won_tokens, created_at
FROM public.users
WHERE email ILIKE '%ryanrfermoselle%'
ORDER BY created_at DESC;

-- Check for mismatches
SELECT 'MISMATCHES (in auth but not public):' as info;
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.email ILIKE '%ryanrfermoselle%';

-- Check for duplicates
SELECT 'DUPLICATE EMAILS IN PUBLIC:' as info;
SELECT email, COUNT(*) as count
FROM public.users
WHERE email ILIKE '%ryanrfermoselle%'
GROUP BY email
HAVING COUNT(*) > 1;

-- Fix: Sync this specific user
DO $$
DECLARE
  v_auth_id UUID;
  v_auth_email TEXT;
  v_auth_created TIMESTAMP WITH TIME ZONE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Attempting to sync ryanrfermoselle...';
  
  -- Get auth user
  SELECT id, email, created_at INTO v_auth_id, v_auth_email, v_auth_created
  FROM auth.users
  WHERE email = 'ryanrfermoselle@yahoo.com'
  LIMIT 1;
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE '❌ User not found in auth.users!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Found in auth.users: id=%, email=%', v_auth_id, v_auth_email;
  
  -- Check if exists in public
  IF EXISTS(SELECT 1 FROM public.users WHERE id = v_auth_id) THEN
    RAISE NOTICE '✓ Already exists in public.users';
    RAISE NOTICE '  Updating tokens to ensure defaults...';
    UPDATE public.users 
    SET purchased_tokens = COALESCE(purchased_tokens, 0),
        won_tokens = COALESCE(won_tokens, 0),
        updated_at = NOW()
    WHERE id = v_auth_id;
  ELSE
    RAISE NOTICE '⚠️  NOT in public.users - creating...';
    
    -- Try to insert
    BEGIN
      INSERT INTO public.users (id, email, username, purchased_tokens, won_tokens, created_at, updated_at)
      VALUES (v_auth_id, v_auth_email, 'ryanrfermoselle', 0, 0, v_auth_created, NOW());
      RAISE NOTICE '✅ Created user in public.users';
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE '❌ Email conflict - another user has this email';
        RAISE NOTICE '  Checking for duplicate...';
        
        -- Show the conflicting user
        FOR v_auth_id IN
          SELECT id FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'
        LOOP
          RAISE NOTICE '  Existing user ID: %', v_auth_id;
        END LOOP;
    END;
  END IF;
END $$;

-- Final check
SELECT 'FINAL STATUS:' as info;
SELECT 
  'Auth user exists' as check,
  EXISTS(SELECT 1 FROM auth.users WHERE email = 'ryanrfermoselle@yahoo.com') as result;
SELECT 
  'Public user exists' as check,
  EXISTS(SELECT 1 FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com') as result;
SELECT 
  'IDs match' as check,
  (
    SELECT au.id = pu.id
    FROM auth.users au
    JOIN public.users pu ON au.email = pu.email
    WHERE au.email = 'ryanrfermoselle@yahoo.com'
    LIMIT 1
  ) as result;


