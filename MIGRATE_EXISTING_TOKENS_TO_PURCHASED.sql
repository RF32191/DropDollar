-- =========================================
-- MIGRATE ALL EXISTING TOKENS TO PURCHASED WALLET
-- =========================================
-- This ensures ALL existing tokens (including admin-granted ones)
-- are treated as "purchased" (non-cashable) tokens.
-- Only NEW tokens won from games will be cashable.

-- Step 1: Check current state
SELECT 
  'BEFORE MIGRATION' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN tokens > 0 THEN 1 END) as users_with_old_tokens,
  SUM(COALESCE(tokens, 0)) as total_old_tokens,
  SUM(COALESCE(purchased_tokens, 0)) as total_purchased,
  SUM(COALESCE(won_tokens, 0)) as total_won
FROM public.users;

-- Step 2: Migrate any remaining tokens from old 'tokens' column to 'purchased_tokens'
-- This catches any tokens that weren't migrated in the initial dual wallet setup
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + COALESCE(tokens, 0),
  tokens = 0
WHERE tokens IS NOT NULL AND tokens > 0;

-- Step 3: Ensure no user has NULL values (set to 0 if NULL)
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0),
  won_tokens = COALESCE(won_tokens, 0),
  tokens = COALESCE(tokens, 0)
WHERE 
  purchased_tokens IS NULL 
  OR won_tokens IS NULL 
  OR tokens IS NULL;

-- Step 4: Check final state
SELECT 
  'AFTER MIGRATION' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN tokens > 0 THEN 1 END) as users_with_old_tokens,
  SUM(COALESCE(tokens, 0)) as total_old_tokens,
  SUM(COALESCE(purchased_tokens, 0)) as total_purchased,
  SUM(COALESCE(won_tokens, 0)) as total_won
FROM public.users;

-- Step 5: Show users with tokens for verification
SELECT 
  id,
  email,
  username,
  tokens as old_tokens_column,
  purchased_tokens,
  won_tokens,
  (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) as total_balance
FROM public.users
WHERE 
  COALESCE(tokens, 0) > 0 
  OR COALESCE(purchased_tokens, 0) > 0 
  OR COALESCE(won_tokens, 0) > 0
ORDER BY (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) DESC;

-- =========================================
-- SUMMARY:
-- =========================================
-- ✅ All existing tokens → purchased_tokens (non-cashable)
-- ✅ Admin-granted tokens → purchased_tokens (non-cashable)
-- ✅ Old 'tokens' column cleared (set to 0)
-- ✅ Only future game winnings → won_tokens (cashable)
-- =========================================

