-- ============================================================================
-- DISCOVER ACTUAL COLUMN NAMES AND FIX SESSIONS
-- ============================================================================
-- Step 1: Find out what columns actually exist
-- Step 2: Fix the functions with correct column names
-- ============================================================================

-- ============================================================================
-- STEP 1: DISCOVER ACTUAL COLUMNS
-- ============================================================================

-- Check winner_takes_all_sessions
SELECT 
  '=== WINNER TAKES ALL COLUMNS ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check hot_sell_sessions
SELECT 
  '=== HOT SELL COLUMNS ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'hot_sell_sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: VIEW ACTUAL DATA (to see which column holds prize money)
-- ============================================================================

-- Winner Takes All - show ALL columns
SELECT * FROM public.winner_takes_all_sessions ORDER BY created_at DESC LIMIT 3;

-- Hot Sell - show ALL columns
SELECT * FROM public.hot_sell_sessions ORDER BY created_at DESC LIMIT 3;

-- ============================================================================
-- RESULT: Run this first, then I'll create the correct fix based on actual columns!
-- ============================================================================

