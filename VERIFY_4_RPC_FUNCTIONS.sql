-- ============================================
-- VERIFY 4: Check RPC Functions Exist
-- ============================================

-- List all Hot Sell related RPC functions
SELECT 
  '📞 Hot Sell RPC Functions' as check_name,
  routine_name as function_name,
  CASE 
    WHEN routine_name = 'get_all_hot_sell_sessions' THEN '✅ Used to load games'
    WHEN routine_name = 'hs_join_v2' THEN '✅ Used to join games'
    WHEN routine_name = 'update_hot_sell_score' THEN '✅ Used to save scores'
    WHEN routine_name = 'process_hot_sell_payout_complete' THEN '✅ Used for payouts'
    ELSE 'Other function'
  END as purpose
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%hot_sell%'
ORDER BY routine_name;

-- Check for critical missing functions
SELECT 
  '⚠️ Missing Critical Functions' as check_name,
  unnest(ARRAY[
    'get_all_hot_sell_sessions',
    'hs_join_v2',
    'update_hot_sell_score',
    'process_hot_sell_payout_complete'
  ]) as expected_function,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = unnest(ARRAY[
          'get_all_hot_sell_sessions',
          'hs_join_v2', 
          'update_hot_sell_score',
          'process_hot_sell_payout_complete'
        ])
    ) THEN '✅ Exists'
    ELSE '❌ MISSING'
  END as status;

-- List ALL public RPC functions (to see what you do have)
SELECT 
  '📋 All Available RPC Functions' as check_name,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

