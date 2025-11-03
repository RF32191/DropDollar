-- ============================================================================
-- GRANT 300 TOKENS TO ADMIN ACCOUNTS
-- ============================================================================
-- Adds 300 purchased tokens (non-cashable) to specified accounts
-- ============================================================================

-- Account 1: ryanrfermoselle@yahoo.com (with RF)
SELECT * FROM admin_add_purchased_tokens(
  'ryanrfermoselle@yahoo.com',
  300.00,
  'Admin promotional grant - 300 tokens'
);

-- Account 2: ryanfermoselle@yahoo.com (without R)
SELECT * FROM admin_add_purchased_tokens(
  'ryanfermoselle@yahoo.com',
  300.00,
  'Admin promotional grant - 300 tokens'
);

-- Account 3: rf32191@gmail.com
SELECT * FROM admin_add_purchased_tokens(
  'rf32191@gmail.com',
  300.00,
  'Admin promotional grant - 300 tokens'
);

-- ============================================================================
-- VERIFY: Check the balances after grant
-- ============================================================================

SELECT 
  email,
  username,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total
FROM public.users
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
)
ORDER BY email;

-- ============================================================================
-- RESULT:
-- ✅ Each account should show +300 in purchased_tokens
-- ✅ These tokens are non-cashable (game use only)
-- ✅ Transaction logged in token_transactions table
-- ============================================================================

