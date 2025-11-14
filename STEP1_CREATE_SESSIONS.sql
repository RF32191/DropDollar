-- ============================================================================
-- STEP 1: CREATE SESSIONS FOR ALL CONFIGS
-- Simple session creation - no complexity, just make sure they exist
-- ============================================================================

-- Show current sessions
SELECT 'Current Hot Sell Sessions:' as info;
SELECT id, config_id, status, participants_count, prize_pool 
FROM hot_sell_sessions 
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'Current Winner Takes All Sessions:' as info;
SELECT id, config_id, status, participants_count, current_pool 
FROM winner_takes_all_sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- Create missing sessions for Hot Sell
DO $$
DECLARE
  v_config_id TEXT;
  v_game_type TEXT;
  v_session_id UUID;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '🔥 Creating Hot Sell sessions...';
  
  -- Loop through known configs
  FOR v_config_id, v_game_type IN
    SELECT id, game_type FROM hot_sell_configs
  LOOP
    -- Check if active session exists
    IF NOT EXISTS(
      SELECT 1 FROM hot_sell_sessions 
      WHERE config_id = v_config_id AND status = 'active'
    ) THEN
      -- Create new session
      v_session_id := gen_random_uuid();
      
      INSERT INTO hot_sell_sessions (
        id, 
        config_id, 
        participants_count, 
        prize_pool, 
        status, 
        created_at, 
        updated_at
      ) VALUES (
        v_session_id,
        v_config_id,
        0,
        0,
        'active',
        NOW(),
        NOW()
      );
      
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ Created session % for config %', v_session_id, v_config_id;
    ELSE
      RAISE NOTICE '  ⏭️  Session already exists for config %', v_config_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created % Hot Sell sessions', v_count;
END $$;

-- Create missing sessions for Winner Takes All
DO $$
DECLARE
  v_config_id TEXT;
  v_game_type TEXT;
  v_session_id UUID;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '🔥 Creating Winner Takes All sessions...';
  
  -- Loop through known configs
  FOR v_config_id, v_game_type IN
    SELECT id, game_type FROM winner_takes_all_configs
  LOOP
    -- Check if active session exists
    IF NOT EXISTS(
      SELECT 1 FROM winner_takes_all_sessions 
      WHERE config_id = v_config_id AND status = 'active'
    ) THEN
      -- Create new session
      v_session_id := gen_random_uuid();
      
      INSERT INTO winner_takes_all_sessions (
        id, 
        config_id, 
        participants_count, 
        current_pool, 
        status, 
        created_at, 
        updated_at
      ) VALUES (
        v_session_id,
        v_config_id,
        0,
        0,
        'active',
        NOW(),
        NOW()
      );
      
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ Created session % for config %', v_session_id, v_config_id;
    ELSE
      RAISE NOTICE '  ⏭️  Session already exists for config %', v_config_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created % Winner Takes All sessions', v_count;
END $$;

-- Show results
SELECT 'After creation - Hot Sell Sessions:' as info;
SELECT id, config_id, status, participants_count, prize_pool 
FROM hot_sell_sessions 
WHERE status = 'active'
ORDER BY created_at DESC;

SELECT 'After creation - Winner Takes All Sessions:' as info;
SELECT id, config_id, status, participants_count, current_pool 
FROM winner_takes_all_sessions 
WHERE status = 'active'
ORDER BY created_at DESC;

-- Summary
DO $$
DECLARE
  v_hs_count INT;
  v_wta_count INT;
BEGIN
  SELECT COUNT(*) INTO v_hs_count FROM hot_sell_sessions WHERE status = 'active';
  SELECT COUNT(*) INTO v_wta_count FROM winner_takes_all_sessions WHERE status = 'active';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 SESSION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Hot Sell active sessions: %', v_hs_count;
  RAISE NOTICE 'Winner Takes All active sessions: %', v_wta_count;
  RAISE NOTICE '';
  
  IF v_hs_count > 0 AND v_wta_count > 0 THEN
    RAISE NOTICE '✅ Sessions are ready for players!';
  ELSE
    RAISE NOTICE '⚠️  Warning: Some sessions are missing';
  END IF;
  RAISE NOTICE '';
END $$;


