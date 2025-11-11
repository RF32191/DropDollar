-- ============================================
-- VERIFY 3: Check User Profile Sync
-- ============================================

-- Show auth.users (change email if needed)
SELECT 
  '🔑 Auth Users' as check_name,
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE email ILIKE '%ryanrfermoselle%'
ORDER BY created_at DESC
LIMIT 3;

-- Show public.users
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

-- Check for ID sync
SELECT 
  '🔍 ID Sync Check' as check_name,
  au.id as auth_id,
  pu.id as public_id,
  au.email,
  CASE 
    WHEN pu.id IS NULL THEN '❌ NOT IN PUBLIC.USERS - Run FIX_ID_MISMATCH.sql'
    WHEN au.id = pu.id THEN '✅ IDs MATCH - Profile sync OK'
    ELSE '❌ ID MISMATCH - Run FIX_ID_MISMATCH.sql'
  END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email ILIKE '%ryanrfermoselle%'
ORDER BY au.created_at DESC
LIMIT 1;

