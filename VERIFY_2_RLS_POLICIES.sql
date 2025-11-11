-- ============================================
-- VERIFY 2: Check RLS and Policies
-- ============================================

-- Check if RLS is enabled
SELECT 
  '🔐 RLS Enabled?' as check_name,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '⚠️ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('hot_sell_sessions', 'hot_sell_configs', 'hot_sell_participants', 'users')
ORDER BY tablename;

-- List all policies on hot_sell tables
SELECT 
  '🔒 RLS Policies' as check_name,
  tablename,
  policyname,
  CASE 
    WHEN 'anon' = ANY(roles) THEN '✅ Allows anon'
    WHEN 'authenticated' = ANY(roles) THEN '✅ Allows authenticated'
    WHEN 'public' = ANY(roles) THEN '✅ Allows public'
    ELSE '⚠️ Restricted: ' || array_to_string(roles, ', ')
  END as access,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'hot_sell%'
ORDER BY tablename, policyname;

-- Check if there are NO policies (which would block everything)
SELECT 
  '⚠️ Tables with NO Policies' as check_name,
  t.tablename,
  'No SELECT policies - will block reads!' as warning
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'hot_sell%'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' 
      AND p.tablename = t.tablename 
      AND p.cmd = 'SELECT'
  )
ORDER BY t.tablename;

