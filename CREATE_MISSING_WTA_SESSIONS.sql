-- ============================================================================
-- CREATE MISSING WINNER TAKES ALL SESSIONS
-- ============================================================================
-- Run this FIRST if you're getting "Session not found" errors
-- This will create a session for every config that doesn't have one
-- ============================================================================

-- Step 1: Check what we have
DO $$
DECLARE
  config_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM winner_takes_all_configs WHERE id LIKE 'wta-%';
  SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions WHERE config_id LIKE 'wta-%';
  
  RAISE NOTICE '🔍 Before Fix:';
  RAISE NOTICE '   Configs: %', config_count;
  RAISE NOTICE '   Sessions: %', session_count;
  RAISE NOTICE '   Missing: %', config_count - session_count;
END $$;

-- Step 2: Create sessions for ALL configs that don't have one
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
  0 as current_pot,
  c.base_price,
  0 as participants_count,
  'waiting' as status,
  1800 as timer_duration,
  NOW() as created_at,
  NOW() as updated_at
FROM winner_takes_all_configs c
WHERE c.id LIKE 'wta-%'
  AND NOT EXISTS (
    SELECT 1 FROM winner_takes_all_sessions s 
    WHERE s.config_id = c.id
  );

-- Step 3: Verify all configs now have sessions
DO $$
DECLARE
  config_count INTEGER;
  session_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM winner_takes_all_configs WHERE id LIKE 'wta-%';
  SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions WHERE config_id LIKE 'wta-%';
  missing_count := config_count - session_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  IF missing_count = 0 THEN
    RAISE NOTICE '✅ All Winner Takes All Sessions Created!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Configs: %', config_count;
    RAISE NOTICE '📊 Sessions: %', session_count;
    RAISE NOTICE '✅ No missing sessions!';
  ELSE
    RAISE NOTICE '⚠️  Still Missing Sessions!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Configs: %', config_count;
    RAISE NOTICE '📊 Sessions: %', session_count;
    RAISE NOTICE '❌ Missing: %', missing_count;
    RAISE EXCEPTION 'Failed to create all sessions';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Reload your Winner Takes All page';
  RAISE NOTICE '   2. You should now see all games';
  RAISE NOTICE '   3. Then run the other SQL files for timer/payout fixes';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Step 4: Show all sessions
SELECT 
  config_id,
  status,
  current_pot,
  base_price,
  participants_count,
  timer_started_at,
  created_at
FROM winner_takes_all_sessions
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

