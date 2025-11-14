-- ============================================================================
-- SYNC USERS FOR LOGIN
-- Ensures all auth.users have corresponding public.users entries
-- ============================================================================

-- Check current sync status
DO $$
DECLARE
  v_auth_count INT;
  v_public_count INT;
  v_missing_count INT;
BEGIN
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_public_count FROM public.users;
  SELECT COUNT(*) INTO v_missing_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  RAISE NOTICE '📊 Current Status:';
  RAISE NOTICE '  Auth users: %', v_auth_count;
  RAISE NOTICE '  Public users: %', v_public_count;
  RAISE NOTICE '  Missing in public: %', v_missing_count;
END $$;

-- Sync missing users from auth to public
DO $$
DECLARE
  v_auth_user RECORD;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Syncing users...';
  
  FOR v_auth_user IN
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        username,
        purchased_tokens,
        won_tokens,
        created_at,
        updated_at
      ) VALUES (
        v_auth_user.id,
        v_auth_user.email,
        COALESCE(split_part(v_auth_user.email, '@', 1), 'user_' || substring(v_auth_user.id::TEXT from 1 for 8)),
        0,
        0,
        v_auth_user.created_at,
        NOW()
      );
      
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ Synced: %', v_auth_user.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ⚠️  Error syncing %: %', v_auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  IF v_count = 0 THEN
    RAISE NOTICE '  ✅ All users already synced';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Synced % users', v_count;
  END IF;
END $$;

-- Final status
DO $$
DECLARE
  v_auth_count INT;
  v_public_count INT;
BEGIN
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_public_count FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 FINAL STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth users: %', v_auth_count;
  RAISE NOTICE 'Public users: %', v_public_count;
  RAISE NOTICE '';
  
  IF v_auth_count = v_public_count THEN
    RAISE NOTICE '✅ All users synced - login should work!';
  ELSE
    RAISE NOTICE '⚠️  Mismatch detected - % missing', ABS(v_auth_count - v_public_count);
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Try logging in now at https://www.drop-dollar.com';
  RAISE NOTICE '';
END $$;


