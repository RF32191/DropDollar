-- ============================================================================
-- DIAGNOSTIC: Check if accounts exist and grant tokens
-- ============================================================================

-- STEP 1: Check if the accounts exist (case-insensitive search)
SELECT 
  id,
  email,
  username,
  COALESCE(tokens, 0) as old_tokens,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  created_at
FROM public.users
WHERE 
  email ILIKE '%ryanrfermoselle%' OR
  email ILIKE '%ryanfermoselle%' OR
  email ILIKE '%rf32191%'
ORDER BY email;

-- ============================================================================
-- If accounts show up above, run these UPDATEs:
-- ============================================================================

-- Update 1: ryanrfermoselle@yahoo.com
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
  updated_at = NOW()
WHERE email ILIKE 'ryanrfermoselle@yahoo.com'
RETURNING email, COALESCE(purchased_tokens, 0) as new_purchased_balance;

-- Update 2: ryanfermoselle@yahoo.com
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
  updated_at = NOW()
WHERE email ILIKE 'ryanfermoselle@yahoo.com'
RETURNING email, COALESCE(purchased_tokens, 0) as new_purchased_balance;

-- Update 3: rf32191@gmail.com
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + 300.00,
  updated_at = NOW()
WHERE email ILIKE 'rf32191@gmail.com'
RETURNING email, COALESCE(purchased_tokens, 0) as new_purchased_balance;

-- ============================================================================
-- STEP 2: Verify final balances
-- ============================================================================

SELECT 
  email,
  username,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total,
  updated_at
FROM public.users
WHERE 
  email ILIKE '%ryanrfermoselle%' OR
  email ILIKE '%ryanfermoselle%' OR
  email ILIKE '%rf32191%'
ORDER BY email;

-- ============================================================================
-- If accounts DON'T exist, you need to create them first or check spelling
-- ============================================================================

