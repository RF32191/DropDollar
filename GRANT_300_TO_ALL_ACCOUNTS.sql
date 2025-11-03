-- ============================================================================
-- GRANT 300 TOKENS TO ALL ADMIN ACCOUNTS
-- ============================================================================
-- Safe to run multiple times - will add 300 each time
-- ============================================================================

-- Account 1: ryanrfermoselle@yahoo.com (with RF)
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
  updated_at = NOW()
WHERE email ILIKE 'ryanrfermoselle@yahoo.com'
RETURNING email, COALESCE(purchased_tokens, 0) as new_purchased, COALESCE(won_tokens, 0) as won, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total;

-- Account 2: ryanfermoselle@yahoo.com (without R)
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
  updated_at = NOW()
WHERE email ILIKE 'ryanfermoselle@yahoo.com'
RETURNING email, COALESCE(purchased_tokens, 0) as new_purchased, COALESCE(won_tokens, 0) as won, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total;

-- Account 3: rf32191@gmail.com
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
  updated_at = NOW()
WHERE email ILIKE 'rf32191@gmail.com'
RETURNING email, COALESCE(purchased_tokens, 0) as new_purchased, COALESCE(won_tokens, 0) as won, COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total;

-- ============================================================================
-- VERIFY ALL BALANCES
-- ============================================================================

SELECT 
  email,
  username,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total_balance
FROM public.users
WHERE 
  email ILIKE '%ryanrfermoselle%' OR
  email ILIKE '%ryanfermoselle%' OR
  email ILIKE '%rf32191%'
ORDER BY email;

-- ============================================================================
-- RESULT:
-- Each account will have +300 tokens in purchased wallet
-- If run multiple times, adds 300 each time
-- ============================================================================

