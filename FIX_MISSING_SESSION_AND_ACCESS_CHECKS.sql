-- ============================================================================
-- FIX MISSING SESSION + RUN ACCESS CHECKS
-- Based on your diagnosis: only hs-25-multi-target is missing an active session
-- ============================================================================

-- ============================================
-- PART 1: CREATE MISSING SESSION
-- ============================================

SELECT '🔧 PART 1: Creating missing session for hs-25-multi-target' as step;

DO $$
DECLARE
  v_config RECORD;
  v_new_session_id UUID;
  v_rng_seed INTEGER;
BEGIN
  -- Get the config
  SELECT * INTO v_config 
  FROM hot_sell_configs 
  WHERE id = 'hs-25-multi-target';
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ Config hs-25-multi-target not found!';
    RETURN;
  END IF;
  
  -- Check if session already exists
  IF EXISTS (
    SELECT 1 FROM hot_sell_sessions 
    WHERE config_id = 'hs-25-multi-target' AND status = 'active'
  ) THEN
    RAISE NOTICE '✅ Session already exists for hs-25-multi-target';
    RETURN;
  END IF;
  
  -- Create the session
  v_new_session_id := gen_random_uuid();
  v_rng_seed := floor(random() * 1000000)::INTEGER;
  
  INSERT INTO hot_sell_sessions (
    id,
    config_id,
    prize_pool,
    base_price,
    max_participants,
    participants_count,
    status,
    rng_seed,
    created_at,
    updated_at
  ) VALUES (
    v_new_session_id,
    v_config.id,
    v_config.base_price,
    v_config.base_price,
    v_config.max_participants,
    0,
    'active',
    v_rng_seed,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Created active session for hs-25-multi-target';
  RAISE NOTICE '  Session ID: %', v_new_session_id;
  RAISE NOTICE '  RNG Seed: %', v_rng_seed;
END $$;

-- Verify all configs now have sessions
SELECT 
  '✅ Verification: All configs have active sessions' as check_name,
  COUNT(*) as total_configs,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM hot_sell_sessions s 
      WHERE s.config_id = c.id AND s.status = 'active'
    )
  ) as configs_with_active_sessions,
  CASE 
    WHEN COUNT(*) = COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM hot_sell_sessions s 
        WHERE s.config_id = c.id AND s.status = 'active'
      )
    )
    THEN '✅ ALL CONFIGS HAVE ACTIVE SESSIONS'
    ELSE '⚠️ Still missing some'
  END as status
FROM hot_sell_configs c;

-- ============================================
-- PART 2: RLS & ACCESS CHECKS
-- ============================================

SELECT '🔐 PART 2: Checking RLS policies and access permissions' as step;

-- Check if RLS is enabled
SELECT 
  '📋 RLS Status' as check_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('hot_sell_sessions', 'hot_sell_configs', 'hot_sell_participants', 'users')
ORDER BY tablename;

-- List all policies on hot_sell tables
SELECT 
  '🔒 RLS Policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'hot_sell%'
ORDER BY tablename, policyname;

-- Check if anon role can SELECT
SELECT '👤 Anonymous Access Check' as check_name;
DO $$
BEGIN
  -- Try to check if anon/authenticated roles have access
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'hot_sell_sessions'
      AND cmd = 'SELECT'
      AND 'anon' = ANY(roles) OR 'authenticated' = ANY(roles)
  ) THEN
    RAISE NOTICE '✅ RLS policies allow SELECT on hot_sell_sessions';
  ELSE
    RAISE NOTICE '⚠️ RLS policies might be blocking SELECT';
  END IF;
END $$;

-- ============================================
-- PART 3: USER PROFILE SYNC CHECK
-- ============================================

SELECT '👤 PART 3: Checking user profile sync' as step;

-- Check if you exist in auth.users
SELECT 
  '🔑 Auth Users' as check_name,
  id,
  email,
  created_at,
  confirmed_at,
  CASE 
    WHEN confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '⚠️ Not confirmed'
  END as status
FROM auth.users
WHERE email ILIKE '%ryanrfermoselle%'
ORDER BY created_at DESC
LIMIT 3;

-- Check if you exist in public.users
SELECT 
  '👤 Public Users' as check_name,
  id,
  email,
  username,
  purchased_tokens,
  won_tokens,
  created_at
FROM public.users
WHERE email ILIKE '%ryanrfermoselle%'
ORDER BY created_at DESC
LIMIT 3;

-- Check for ID mismatch
DO $$
DECLARE
  v_auth_id UUID;
  v_public_id UUID;
  v_email TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 USER ID SYNC CHECK';
  RAISE NOTICE '========================================';
  
  -- Find your auth user
  SELECT id, email INTO v_auth_id, v_email
  FROM auth.users
  WHERE email ILIKE '%ryanrfermoselle%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE '❌ No auth user found matching ryanrfermoselle';
    RETURN;
  END IF;
  
  RAISE NOTICE '📧 Email: %', v_email;
  RAISE NOTICE '🔑 Auth ID: %', v_auth_id;
  
  -- Check public.users
  SELECT id INTO v_public_id
  FROM public.users
  WHERE email = v_email;
  
  IF v_public_id IS NULL THEN
    RAISE NOTICE '❌ NOT FOUND in public.users';
    RAISE NOTICE '   Run FIX_ID_MISMATCH.sql to create user record';
  ELSIF v_auth_id = v_public_id THEN
    RAISE NOTICE '✅ IDs MATCH - User sync is good!';
    RAISE NOTICE '🔑 Public ID: %', v_public_id;
  ELSE
    RAISE NOTICE '❌ ID MISMATCH';
    RAISE NOTICE '🔑 Auth ID:   %', v_auth_id;
    RAISE NOTICE '🔑 Public ID: %', v_public_id;
    RAISE NOTICE '   Run FIX_ID_MISMATCH.sql to fix';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PART 4: TEST RPC ACCESS
-- ============================================

SELECT '🧪 PART 4: Testing RPC function access' as step;

-- Check if get_all_hot_sell_sessions function exists
SELECT 
  '📞 RPC Functions' as check_name,
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_all_hot_sell_sessions',
    'hs_join_v2',
    'update_hot_sell_score',
    'process_hot_sell_payout_complete'
  )
ORDER BY routine_name;

-- ============================================
-- FINAL SUMMARY
-- ============================================

SELECT '🎯 FINAL SUMMARY' as step;

DO $$
DECLARE
  v_active_sessions INTEGER;
  v_total_configs INTEGER;
  v_user_synced BOOLEAN;
  v_auth_id UUID;
  v_public_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DIAGNOSTIC SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Check sessions
  SELECT COUNT(*) INTO v_active_sessions
  FROM hot_sell_sessions
  WHERE status = 'active';
  
  SELECT COUNT(*) INTO v_total_configs
  FROM hot_sell_configs;
  
  RAISE NOTICE '🎮 Game Sessions: % active / % configs', v_active_sessions, v_total_configs;
  IF v_active_sessions >= v_total_configs THEN
    RAISE NOTICE '   ✅ All configs have active sessions';
  ELSE
    RAISE NOTICE '   ⚠️ Some configs missing sessions';
  END IF;
  
  -- Check user sync
  SELECT au.id, pu.id INTO v_auth_id, v_public_id
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE au.email ILIKE '%ryanrfermoselle%'
  LIMIT 1;
  
  v_user_synced := (v_auth_id IS NOT NULL AND v_public_id IS NOT NULL AND v_auth_id = v_public_id);
  
  RAISE NOTICE '👤 User Profile: %', 
    CASE 
      WHEN v_user_synced THEN '✅ Synced correctly'
      ELSE '❌ NOT synced - run FIX_ID_MISMATCH.sql'
    END;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🚀 NEXT STEPS';
  RAISE NOTICE '========================================';
  
  IF NOT v_user_synced THEN
    RAISE NOTICE '1. Run FIX_ID_MISMATCH.sql to sync user profile';
  END IF;
  
  RAISE NOTICE '2. Share these with AI for further diagnosis:';
  RAISE NOTICE '   - Browser console logs';
  RAISE NOTICE '   - Network tab errors (RPC calls)';
  RAISE NOTICE '   - Which page isn''t loading';
  RAISE NOTICE '';
END $$;

SELECT '✅ DIAGNOSTIC COMPLETE!' as result;

