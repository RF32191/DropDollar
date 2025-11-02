-- ============================================================================
-- DIAGNOSE BLADE BOUNCE HOT SELL ERROR
-- ============================================================================
-- This script checks what's happening with Blade Bounce games in Hot Sell
-- ============================================================================

-- Step 1: Check if Blade Bounce configs exist
SELECT 
  '📋 BLADE BOUNCE CONFIGS' as check_type,
  id,
  game_type,
  title,
  base_price,
  max_participants,
  entry_fee
FROM public.hot_sell_configs
WHERE game_type = 'blade_bounce'
ORDER BY base_price;

-- Step 2: Check if there are any Blade Bounce sessions
SELECT 
  '🎮 BLADE BOUNCE SESSIONS' as check_type,
  s.id,
  s.config_id,
  s.status,
  s.current_pool,
  s.base_price,
  s.max_participants,
  COUNT(p.id) as participant_count,
  s.created_at
FROM public.hot_sell_sessions s
LEFT JOIN public.hot_sell_participants p ON s.id = p.session_id
WHERE s.config_id LIKE '%blade-bounce%'
GROUP BY s.id
ORDER BY s.created_at DESC
LIMIT 5;

-- Step 3: Check participants in Blade Bounce sessions
SELECT 
  '👥 BLADE BOUNCE PARTICIPANTS' as check_type,
  p.id,
  p.session_id,
  p.user_id,
  u.username,
  u.email,
  p.score,
  p.accuracy,
  p.entry_fee_paid,
  p.completed_at,
  p.created_at
FROM public.hot_sell_participants p
LEFT JOIN public.users u ON p.user_id = u.id
WHERE p.session_id IN (
  SELECT id FROM public.hot_sell_sessions WHERE config_id LIKE '%blade-bounce%'
)
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 4: Check if the payout function exists
SELECT 
  '🔧 PAYOUT FUNCTION' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%hot_sell%payout%'
ORDER BY routine_name;

-- Step 5: Test if we can find a Blade Bounce session for payout
DO $$
DECLARE
  v_config_id TEXT := 'hs-3-blade-bounce'; -- Change to your Blade Bounce config
  v_session RECORD;
BEGIN
  RAISE NOTICE '🔍 Testing session lookup for config: %', v_config_id;
  
  -- Try to find session
  SELECT *
  INTO v_session
  FROM public.hot_sell_sessions
  WHERE config_id = v_config_id
    AND status != 'completed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Found session: %', v_session.id;
    RAISE NOTICE '   Status: %', v_session.status;
    RAISE NOTICE '   Pool: $%', v_session.current_pool;
    RAISE NOTICE '   Base Price: $%', v_session.base_price;
    RAISE NOTICE '   Max Participants: %', v_session.max_participants;
  ELSE
    RAISE NOTICE '❌ NO SESSION FOUND for config: %', v_config_id;
    
    -- Check if ANY sessions exist
    SELECT COUNT(*) 
    FROM public.hot_sell_sessions 
    WHERE config_id = v_config_id;
    
    RAISE NOTICE '📊 Total sessions for this config (all statuses): %', 
      (SELECT COUNT(*) FROM public.hot_sell_sessions WHERE config_id = v_config_id);
  END IF;
END $$;

-- Step 6: Check game_history for Blade Bounce
SELECT 
  '📊 BLADE BOUNCE GAME HISTORY' as check_type,
  gh.id,
  gh.user_id,
  u.username,
  gh.game_type,
  gh.tournament_type,
  gh.score,
  gh.tokens_won,
  gh.rank,
  gh.created_at
FROM public.game_history gh
LEFT JOIN public.users u ON gh.user_id = u.id
WHERE gh.game_type = 'blade_bounce'
  AND gh.tournament_type = 'hot_sell'
ORDER BY gh.created_at DESC
LIMIT 10;

-- Step 7: Check token_transactions for Blade Bounce payouts
SELECT 
  '💰 BLADE BOUNCE PAYOUTS' as check_type,
  tt.id,
  tt.user_id,
  u.username,
  tt.amount,
  tt.transaction_type,
  tt.description,
  tt.balance_after,
  tt.created_at
FROM public.token_transactions tt
LEFT JOIN public.users u ON tt.user_id = u.id
WHERE tt.description LIKE '%Blade Bounce%'
ORDER BY tt.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 BLADE BOUNCE DIAGNOSTIC COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Check the results above to identify the issue:';
  RAISE NOTICE '  1. Do Blade Bounce configs exist?';
  RAISE NOTICE '  2. Are there active sessions?';
  RAISE NOTICE '  3. Do participants have scores?';
  RAISE NOTICE '  4. Does the payout function exist?';
  RAISE NOTICE '  5. Can we find sessions for payout?';
  RAISE NOTICE '  6. Are games being recorded in game_history?';
  RAISE NOTICE '  7. Are payouts being recorded in token_transactions?';
  RAISE NOTICE '';
END $$;

