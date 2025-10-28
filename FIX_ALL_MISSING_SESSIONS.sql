-- ============================================================================
-- FIX ALL MISSING SESSIONS - WINNER TAKES ALL, HOT SELL, AND 1V1
-- ============================================================================
-- This creates sessions for ALL game types that are missing them
-- Run this FIRST to fix all "Session not found" errors
-- ============================================================================

-- ============================================================================
-- STEP 1: Check Current State
-- ============================================================================

DO $$
DECLARE
  wta_config_count INTEGER;
  wta_session_count INTEGER;
  hs_config_count INTEGER;
  hs_session_count INTEGER;
  oneone_config_count INTEGER;
  oneone_session_count INTEGER;
BEGIN
  -- Winner Takes All
  SELECT COUNT(*) INTO wta_config_count FROM winner_takes_all_configs WHERE id LIKE 'wta-%';
  SELECT COUNT(*) INTO wta_session_count FROM winner_takes_all_sessions WHERE config_id LIKE 'wta-%';
  
  -- Hot Sell
  SELECT COUNT(*) INTO hs_config_count FROM hot_sell_configs WHERE id LIKE 'hs-%';
  SELECT COUNT(*) INTO hs_session_count FROM hot_sell_sessions WHERE config_id LIKE 'hs-%';
  
  -- 1v1
  SELECT COUNT(*) INTO oneone_config_count FROM one_v_one_configs WHERE id LIKE '1v1-%';
  SELECT COUNT(*) INTO oneone_session_count FROM one_v_one_sessions WHERE config_id LIKE '1v1-%';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 BEFORE FIX - Current State:';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Winner Takes All:';
  RAISE NOTICE '   Configs:  %', wta_config_count;
  RAISE NOTICE '   Sessions: %', wta_session_count;
  RAISE NOTICE '   Missing:  %', wta_config_count - wta_session_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Hot Sell:';
  RAISE NOTICE '   Configs:  %', hs_config_count;
  RAISE NOTICE '   Sessions: %', hs_session_count;
  RAISE NOTICE '   Missing:  %', hs_config_count - hs_session_count;
  RAISE NOTICE '';
  RAISE NOTICE '1v1:';
  RAISE NOTICE '   Configs:  %', oneone_config_count;
  RAISE NOTICE '   Sessions: %', oneone_session_count;
  RAISE NOTICE '   Missing:  %', oneone_config_count - oneone_session_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- STEP 2: Create Missing Winner Takes All Sessions
-- ============================================================================

INSERT INTO winner_takes_all_sessions (
  config_id,
  current_pot,
  base_price,
  participants_count,
  status,
  timer_duration,
  created_at,
  updated_at
)
SELECT 
  c.id,
  0,
  c.base_price,
  0,
  'waiting',
  1800, -- 30 minutes
  NOW(),
  NOW()
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM winner_takes_all_sessions s 
  WHERE s.config_id = c.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Create Missing Hot Sell Sessions
-- ============================================================================

INSERT INTO hot_sell_sessions (
  config_id,
  current_pot,
  base_price,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  c.id,
  0,
  c.base_price,
  0,
  c.max_participants,
  'waiting',
  NOW(),
  NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Create Missing 1v1 Sessions
-- ============================================================================

INSERT INTO one_v_one_sessions (
  config_id,
  current_pot,
  prize_pool,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  c.id,
  0,
  c.prize_pool,
  0,
  2, -- 1v1 always has 2 max participants
  'waiting',
  NOW(),
  NOW()
FROM one_v_one_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM one_v_one_sessions s 
  WHERE s.config_id = c.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: Verify All Sessions Created
-- ============================================================================

DO $$
DECLARE
  wta_config_count INTEGER;
  wta_session_count INTEGER;
  wta_missing INTEGER;
  hs_config_count INTEGER;
  hs_session_count INTEGER;
  hs_missing INTEGER;
  oneone_config_count INTEGER;
  oneone_session_count INTEGER;
  oneone_missing INTEGER;
  total_missing INTEGER;
BEGIN
  -- Winner Takes All
  SELECT COUNT(*) INTO wta_config_count FROM winner_takes_all_configs WHERE id LIKE 'wta-%';
  SELECT COUNT(*) INTO wta_session_count FROM winner_takes_all_sessions WHERE config_id LIKE 'wta-%';
  wta_missing := wta_config_count - wta_session_count;
  
  -- Hot Sell
  SELECT COUNT(*) INTO hs_config_count FROM hot_sell_configs WHERE id LIKE 'hs-%';
  SELECT COUNT(*) INTO hs_session_count FROM hot_sell_sessions WHERE config_id LIKE 'hs-%';
  hs_missing := hs_config_count - hs_session_count;
  
  -- 1v1
  SELECT COUNT(*) INTO oneone_config_count FROM one_v_one_configs WHERE id LIKE '1v1-%';
  SELECT COUNT(*) INTO oneone_session_count FROM one_v_one_sessions WHERE config_id LIKE '1v1-%';
  oneone_missing := oneone_config_count - oneone_session_count;
  
  total_missing := wta_missing + hs_missing + oneone_missing;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  IF total_missing = 0 THEN
    RAISE NOTICE '✅ ALL SESSIONS CREATED SUCCESSFULLY!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Winner Takes All:';
    RAISE NOTICE '   Configs:  %', wta_config_count;
    RAISE NOTICE '   Sessions: %', wta_session_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Hot Sell:';
    RAISE NOTICE '   Configs:  %', hs_config_count;
    RAISE NOTICE '   Sessions: %', hs_session_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 1v1:';
    RAISE NOTICE '   Configs:  %', oneone_config_count;
    RAISE NOTICE '   Sessions: %', oneone_session_count;
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '   1. Reload Winner Takes All page - should work now!';
    RAISE NOTICE '   2. Reload Hot Sell page - should work now!';
    RAISE NOTICE '   3. Reload 1v1 page - should work now!';
    RAISE NOTICE '   4. All "Session not found" errors should be gone';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '⚠️  SOME SESSIONS STILL MISSING!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Winner Takes All: % missing', wta_missing;
    RAISE NOTICE 'Hot Sell: % missing', hs_missing;
    RAISE NOTICE '1v1: % missing', oneone_missing;
    RAISE NOTICE '';
    RAISE NOTICE 'Total missing: %', total_missing;
    RAISE EXCEPTION 'Failed to create all sessions';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Show All Sessions
-- ============================================================================

-- Show Winner Takes All Sessions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Winner Takes All Sessions:';
END $$;

SELECT 
  config_id,
  status,
  current_pot,
  participants_count,
  timer_duration
FROM winner_takes_all_sessions
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

-- Show Hot Sell Sessions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Hot Sell Sessions:';
END $$;

SELECT 
  config_id,
  status,
  current_pot,
  participants_count,
  max_participants
FROM hot_sell_sessions
WHERE config_id LIKE 'hs-%'
ORDER BY config_id;

-- Show 1v1 Sessions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 1v1 Sessions:';
END $$;

SELECT 
  config_id,
  status,
  current_pot,
  participants_count,
  max_participants
FROM one_v_one_sessions
WHERE config_id LIKE '1v1-%'
ORDER BY config_id;

