-- =========================================================
-- DIAGNOSTIC: Check Users Table Structure
-- =========================================================
-- Run this to see your current users table structure
-- =========================================================

-- Check if public.users table exists
SELECT 
  'public.users exists: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN '✅ YES' ELSE '❌ NO' END as table_status;

-- List all columns in public.users (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if auth.users exists (Supabase auth table)
SELECT 
  'auth.users exists: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN '✅ YES' ELSE '❌ NO' END as auth_table_status;

-- List all columns in auth.users (if accessible)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Count records in each table
SELECT 
  'public.users' as table_name,
  COUNT(*) as record_count
FROM public.users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
UNION ALL
SELECT 
  'auth.users' as table_name,
  COUNT(*) as record_count
FROM auth.users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users');

