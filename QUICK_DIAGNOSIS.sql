-- ============================================================================
-- QUICK DIAGNOSIS - Run this FIRST to see what's wrong
-- ============================================================================

-- 1. Check if you have active game sessions
SELECT '🎮 ACTIVE GAME SESSIONS:' as check_name;
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  (SELECT COUNT(*) FROM hot_sell_configs) as total_configs,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'active') = 0 
    THEN '❌ NO ACTIVE SESSIONS - Run RUN_ALL_PHASES_SIMPLE.sql'
    WHEN COUNT(*) FILTER (WHERE status = 'active') < (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '⚠️ MISSING SOME - Run RUN_ALL_PHASES_SIMPLE.sql'
    ELSE '✅ ALL GOOD'
  END as status
FROM hot_sell_sessions;

-- 2. Check your user ID sync
SELECT '👤 USER ID SYNC:' as check_name;
DO $$
DECLARE
  v_auth_id UUID;
  v_public_id UUID;
  v_email TEXT := 'ryanrfermoselle@yahoo.com'; -- Change this to your email if different
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
  SELECT id INTO v_public_id FROM public.users WHERE email = v_email;
  
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email: %', v_email;
  RAISE NOTICE '🔑 Auth ID:   %', v_auth_id;
  RAISE NOTICE '🔑 Public ID: %', v_public_id;
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE '❌ NOT FOUND IN AUTH.USERS';
  ELSIF v_public_id IS NULL THEN
    RAISE NOTICE '❌ NOT FOUND IN PUBLIC.USERS - Run FIX_ID_MISMATCH.sql';
  ELSIF v_auth_id = v_public_id THEN
    RAISE NOTICE '✅ IDs MATCH - User sync is good!';
  ELSE
    RAISE NOTICE '❌ ID MISMATCH - Run FIX_ID_MISMATCH.sql';
  END IF;
  RAISE NOTICE '';
END $$;

-- 3. Show what needs to be fixed
SELECT '🔧 FIXES NEEDED:' as summary;
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FILTER (WHERE status = 'active') FROM hot_sell_sessions) = 0
    THEN '1. Run RUN_ALL_PHASES_SIMPLE.sql (for game sessions)'
    ELSE '1. ✅ Game sessions OK'
  END as fix_1;
  
SELECT 
  CASE 
    WHEN NOT EXISTS(
      SELECT 1 FROM auth.users au 
      JOIN public.users pu ON au.id = pu.id 
      WHERE au.email = 'ryanrfermoselle@yahoo.com' -- Change to your email
    )
    THEN '2. Run FIX_ID_MISMATCH.sql (for user profile)'
    ELSE '2. ✅ User profile OK'
  END as fix_2;

SELECT '✅ Copy one or both SQL files to Supabase and run them!' as next_step;

