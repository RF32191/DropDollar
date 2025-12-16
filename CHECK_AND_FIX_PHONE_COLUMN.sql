-- ============================================================================
-- CHECK AND FIX PHONE COLUMN IN USERS TABLE
-- ============================================================================
-- This script ensures the phone column exists and is properly configured
-- Run this in Supabase SQL Editor to diagnose phone storage issues
-- ============================================================================

-- Step 1: Check if phone column exists and its current configuration
DO $$ 
DECLARE
  phone_column_exists BOOLEAN;
  phone_data_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) INTO phone_column_exists;
  
  IF phone_column_exists THEN
    SELECT data_type INTO phone_data_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone';
    
    RAISE NOTICE '✅ Phone column exists in users table';
    RAISE NOTICE '   Data type: %', phone_data_type;
  ELSE
    RAISE NOTICE '❌ Phone column does NOT exist in users table';
  END IF;
END $$;

-- Step 2: Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column to users table';
  END IF;
END $$;

-- Step 3: Check for any triggers that might be affecting the phone column
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'public'
  AND action_statement LIKE '%phone%';

RAISE NOTICE 'ℹ️  Checking for triggers that affect phone column...';

-- Step 4: Check current phone values
DO $$
DECLARE
  total_users INTEGER;
  users_with_phone INTEGER;
  users_without_phone INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO users_with_phone FROM public.users WHERE phone IS NOT NULL AND phone != '';
  SELECT COUNT(*) INTO users_without_phone FROM public.users WHERE phone IS NULL OR phone = '';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 PHONE COLUMN STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users with phone: %', users_with_phone;
  RAISE NOTICE 'Users without phone: %', users_without_phone;
  RAISE NOTICE '========================================';
END $$;

-- Step 5: Show sample of users with and without phone numbers
SELECT 
  id,
  username,
  email,
  phone,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

RAISE NOTICE 'ℹ️  Showing last 10 users (check console output above)';

-- Step 6: Check if unique constraint/index exists on phone
DO $$
DECLARE
  phone_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND indexname LIKE '%phone%'
  ) INTO phone_index_exists;
  
  IF phone_index_exists THEN
    RAISE NOTICE '✅ Phone index exists';
  ELSE
    RAISE NOTICE '⚠️  No phone index found - run FIX_SIGNUP_PHONE_EMAIL_DUPLICATES.sql';
  END IF;
END $$;

-- Step 7: List all phone indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND indexname LIKE '%phone%';

RAISE NOTICE 'ℹ️  Phone-related indexes listed above';

-- Step 8: Check RLS policies on users table
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';

RAISE NOTICE 'ℹ️  RLS policies on users table listed above';

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSTIC COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ What to check:';
  RAISE NOTICE '1. Is phone column present? (see above)';
  RAISE NOTICE '2. Are users WITHOUT phone = recent registrations?';
  RAISE NOTICE '3. Check Vercel logs for phone storage errors';
  RAISE NOTICE '4. If phone is NULL for new users, check trigger/policy';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Next steps:';
  RAISE NOTICE '1. If phone column missing: Run FIX_SIGNUP_PHONE_EMAIL_DUPLICATES.sql';
  RAISE NOTICE '2. If triggers interfering: Review trigger code';
  RAISE NOTICE '3. If RLS blocking: Check service role key is used in API';
  RAISE NOTICE '4. Try registering a new account and check logs';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

