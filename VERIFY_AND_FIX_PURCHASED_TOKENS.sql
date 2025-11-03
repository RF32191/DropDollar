-- ============================================================================
-- VERIFY AND FIX PURCHASED TOKENS
-- ============================================================================
-- Ensures ALL existing tokens (including admin-granted) are in purchased_tokens
-- This script is SAFE to run multiple times (idempotent)
-- ============================================================================

-- ============================================================================
-- 1. VERIFY: Check current token distribution
-- ============================================================================

SELECT 
  'BEFORE FIX' as status,
  COUNT(*) as total_users,
  SUM(COALESCE(tokens, 0)) as old_tokens_column,
  SUM(COALESCE(purchased_tokens, 0)) as total_purchased,
  SUM(COALESCE(won_tokens, 0)) as total_won,
  SUM(COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) as total_in_dual_wallet
FROM public.users;

-- ============================================================================
-- 2. IDENTIFY: Users who still have tokens in old column
-- ============================================================================

SELECT 
  id,
  email,
  username,
  COALESCE(tokens, 0) as old_tokens,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won
FROM public.users
WHERE COALESCE(tokens, 0) > 0
ORDER BY tokens DESC
LIMIT 20;

-- ============================================================================
-- 3. FIX: Move ALL remaining tokens to purchased_tokens
-- ============================================================================

-- Step 1: Move any tokens still in old 'tokens' column to 'purchased_tokens'
UPDATE public.users
SET 
  purchased_tokens = COALESCE(purchased_tokens, 0) + COALESCE(tokens, 0),
  tokens = 0
WHERE COALESCE(tokens, 0) > 0;

-- Step 2: Ensure won_tokens starts at 0 for users who haven't won anything
-- (Only reset if they have no prize history)
UPDATE public.users u
SET won_tokens = 0
WHERE 
  COALESCE(won_tokens, 0) > 0
  AND NOT EXISTS (
    -- Check if they've actually won in Hot Sell
    SELECT 1 FROM public.hot_sell_participants hp
    WHERE hp.user_id::TEXT = u.id::TEXT
    AND hp.entry_fee IS NOT NULL 
    AND hp.score IS NOT NULL
    UNION
    -- Check if they've actually won in Winner Takes All
    SELECT 1 FROM public.winner_takes_all_participants wp
    WHERE wp.user_id::TEXT = u.id::TEXT
    AND wp.entry_fee IS NOT NULL 
    AND wp.score IS NOT NULL
    UNION
    -- Check if they've actually won in 1v1
    SELECT 1 FROM public.one_v_one_participants op
    WHERE op.user_id::TEXT = u.id::TEXT
    AND op.score IS NOT NULL
  );

-- ============================================================================
-- 4. VERIFY: Check after fix
-- ============================================================================

SELECT 
  'AFTER FIX' as status,
  COUNT(*) as total_users,
  SUM(COALESCE(tokens, 0)) as old_tokens_column,
  SUM(COALESCE(purchased_tokens, 0)) as total_purchased,
  SUM(COALESCE(won_tokens, 0)) as total_won,
  SUM(COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) as total_in_dual_wallet
FROM public.users;

-- ============================================================================
-- 5. REPORT: Show users with balances
-- ============================================================================

SELECT 
  email,
  username,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total
FROM public.users
WHERE (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)) > 0
ORDER BY (purchased_tokens + won_tokens) DESC;

-- ============================================================================
-- 6. FINAL CHECK: Ensure old tokens column is zeroed
-- ============================================================================

SELECT 
  COUNT(*) as users_with_old_tokens_remaining,
  SUM(COALESCE(tokens, 0)) as total_tokens_not_migrated
FROM public.users
WHERE COALESCE(tokens, 0) > 0;

-- ============================================================================
-- SUMMARY OF CHANGES:
-- ============================================================================
-- ✅ All tokens from old 'tokens' column → purchased_tokens
-- ✅ Won_tokens reset to 0 for users without prize history
-- ✅ All admin-granted tokens treated as purchased (non-cashable)
-- ✅ Only actual prize winners keep won_tokens balance
-- 
-- RESULT:
-- - purchased_tokens = All purchased + admin-granted tokens
-- - won_tokens = Only tokens won in actual competitions
-- ============================================================================

