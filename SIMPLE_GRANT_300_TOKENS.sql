-- ============================================================================
-- SIMPLE SQL TO GRANT 300 TOKENS (NO TRANSACTION LOG)
-- ============================================================================
-- This version just updates the users table directly
-- Copy and paste into Supabase SQL Editor and run it
-- ============================================================================

-- Grant 300 tokens to ryanrfermoselle@yahoo.com (with RF)
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- Grant 300 tokens to ryanfermoselle@yahoo.com (without R)
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
    updated_at = NOW()
WHERE email = 'ryanfermoselle@yahoo.com';

-- Grant 300 tokens to rf32191@gmail.com
UPDATE public.users
SET purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
    updated_at = NOW()
WHERE email = 'rf32191@gmail.com';

-- ============================================================================
-- Verify the balances
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
-- DONE! Each account should have +300 in their purchased_tokens
-- ============================================================================

