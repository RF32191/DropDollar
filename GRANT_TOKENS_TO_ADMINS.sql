-- ============================================================================
-- GRANT 300 PURCHASED TOKENS TO ADMIN ACCOUNTS
-- ============================================================================
-- Direct update to purchased_tokens (bypasses token_transactions constraints)
-- ============================================================================

-- Update purchased_tokens for specified admin accounts
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300,
  updated_at = NOW()
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
)
RETURNING 
  email,
  purchased_tokens,
  won_tokens,
  (purchased_tokens + won_tokens) as total_tokens;

-- ============================================================================
-- VERIFY TOKEN GRANT
-- ============================================================================

SELECT 
  '=== ADMIN TOKEN BALANCES ===' as info;

SELECT 
  email,
  purchased_tokens as purchased,
  won_tokens as won,
  (purchased_tokens + won_tokens) as total
FROM public.users
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
)
ORDER BY email;

-- Check if all accounts exist
SELECT 
  '=== ACCOUNT CHECK ===' as info;

SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All 3 accounts found'
    ELSE '⚠️ Only ' || COUNT(*) || ' accounts found'
  END as status
FROM public.users
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
);

-- List all matching accounts
SELECT 
  email,
  id,
  created_at
FROM public.users
WHERE email LIKE '%ryanfermoselle%' OR email LIKE '%rf32191%'
ORDER BY email;

-- ============================================================================
-- RESULT: 300 purchased tokens added to each admin account
-- ============================================================================

