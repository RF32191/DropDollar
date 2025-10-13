-- ========================================
-- ADD 100 TOKENS TO YOUR ACCOUNT
-- Simple script - just adds tokens
-- ========================================

-- Update user tokens
UPDATE users 
SET tokens = tokens + 100,
    updated_at = NOW()
WHERE email = 'ryanfermoselle@yahoo.com';

-- Record the transaction
INSERT INTO token_transactions (user_id, amount, type, description, balance_before, balance_after)
SELECT 
  id,
  100,
  'purchase',
  'Admin credited 100 tokens for testing',
  tokens - 100,
  tokens
FROM users
WHERE email = 'ryanfermoselle@yahoo.com';

-- Verify the update
SELECT 
  id, 
  email, 
  username, 
  tokens as available_tokens,
  balance as winnings_balance,
  created_at,
  updated_at
FROM users 
WHERE email = 'ryanfermoselle@yahoo.com';

-- ========================================
-- DONE! 🎉
-- ========================================
-- You now have 100 extra tokens in your account!
-- Go to: https://www.drop-dollar.com
-- ========================================

