-- ============================================
-- COMPLETE HOT SELL SESSION FIX - SIMPLIFIED
-- Removes audit assumptions, focuses on core fix
-- ============================================

-- ============================================
-- PHASE 1: DIAGNOSIS
-- ============================================

SELECT '🔍 PHASE 1: DIAGNOSIS' as phase;

SELECT 
  '📊 Current Session State' as check_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'waiting') as waiting_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'active') = 0 THEN '❌ NO ACTIVE SESSIONS'
    WHEN COUNT(*) FILTER (WHERE status = 'active') < (SELECT COUNT(*) FROM hot_sell_configs) THEN '⚠️ MISSING SOME'
    ELSE '✅ ALL GOOD'
  END as status
FROM hot_sell_sessions;

SELECT 
  '📋 Configs Missing Active Sessions' as check_name,
  c.id as config_id,
  c.title,
  c.base_price,
  CASE 
    WHEN s.id IS NULL THEN '❌ NEEDS SESSION'
    ELSE '✅ HAS SESSION'
  END as session_status
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

-- ============================================
-- PHASE 2: CREATE MISSING SESSIONS
-- ============================================

SELECT '🔧 PHASE 2: CREATING SESSIONS' as phase;

DO $$
DECLARE
  v_created_count INTEGER := 0;
  v_config RECORD;
  v_new_session_id UUID;
  v_rng_seed INTEGER;
BEGIN
  RAISE NOTICE '🚀 Starting session creation...';
  
  FOR v_config IN 
    SELECT c.*
    FROM hot_sell_configs c
    WHERE NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions s 
      WHERE s.config_id = c.id AND s.status = 'active'
    )
  LOOP
    v_new_session_id := gen_random_uuid();
    v_rng_seed := floor(random() * 1000000)::INTEGER;
    
    INSERT INTO hot_sell_sessions (
      id,
      config_id,
      prize_pool,
      base_price,
      max_participants,
      participants_count,
      status,
      rng_seed,
      created_at,
      updated_at
    ) VALUES (
      v_new_session_id,
      v_config.id,
      v_config.base_price,
      v_config.base_price,
      v_config.max_participants,
      0,
      'active',
      v_rng_seed,
      NOW(),
      NOW()
    );
    
    v_created_count := v_created_count + 1;
    RAISE NOTICE '✅ Created session for: % (ID: %, RNG: %)', v_config.title, v_new_session_id, v_rng_seed;
  END LOOP;
  
  IF v_created_count = 0 THEN
    RAISE NOTICE '✅ All configs already have active sessions';
  ELSE
    RAISE NOTICE '📊 Total sessions created: %', v_created_count;
  END IF;
END $$;

-- Verify Phase 2
SELECT 
  '✅ Phase 2 Verification' as check_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  (SELECT COUNT(*) FROM hot_sell_configs) as total_configs,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'active') >= (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '✅ SUCCESS - All configs have active sessions'
    ELSE '⚠️ Some configs still missing'
  END as result
FROM hot_sell_sessions;

-- ============================================
-- PHASE 3: AUTOMATION
-- ============================================

SELECT '🤖 PHASE 3: AUTOMATION' as phase;

-- Function to ensure active sessions
CREATE OR REPLACE FUNCTION ensure_active_hot_sell_sessions()
RETURNS TABLE(
  config_id TEXT,
  session_id UUID,
  action TEXT,
  rng_seed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_new_session_id UUID;
  v_rng_seed INTEGER;
  v_created INTEGER := 0;
BEGIN
  FOR v_config IN 
    SELECT c.*
    FROM hot_sell_configs c
    WHERE NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions s 
      WHERE s.config_id = c.id AND s.status = 'active'
    )
  LOOP
    v_rng_seed := floor(random() * 1000000)::INTEGER;
    v_new_session_id := gen_random_uuid();
    
    INSERT INTO hot_sell_sessions (
      id, config_id, prize_pool, base_price,
      max_participants, participants_count, status,
      rng_seed, created_at, updated_at
    ) VALUES (
      v_new_session_id, v_config.id, v_config.base_price, v_config.base_price,
      v_config.max_participants, 0, 'active',
      v_rng_seed, NOW(), NOW()
    );
    
    config_id := v_config.id;
    session_id := v_new_session_id;
    action := 'created';
    rng_seed := v_rng_seed;
    RETURN NEXT;
    
    v_created := v_created + 1;
  END LOOP;
  
  IF v_created = 0 THEN
    RAISE NOTICE '✅ All configs already have active sessions';
  ELSE
    RAISE NOTICE '✅ Created % new sessions', v_created;
  END IF;
END;
$$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_config_status 
ON hot_sell_sessions(config_id, status)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_id_status
ON hot_sell_sessions(id, status);

-- Trigger for auto-creation on completion
CREATE OR REPLACE FUNCTION auto_create_new_hot_sell_session()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_session_id UUID;
  v_rng_seed INTEGER;
  v_config RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions 
      WHERE config_id = NEW.config_id 
        AND id != NEW.id 
        AND status = 'active'
    ) THEN
      SELECT * INTO v_config FROM hot_sell_configs WHERE id = NEW.config_id;
      
      IF FOUND THEN
        v_rng_seed := floor(random() * 1000000)::INTEGER;
        v_new_session_id := gen_random_uuid();
        
        INSERT INTO hot_sell_sessions (
          id, config_id, prize_pool, base_price,
          max_participants, participants_count, status,
          rng_seed, created_at, updated_at
        ) VALUES (
          v_new_session_id, v_config.id, v_config.base_price, v_config.base_price,
          v_config.max_participants, 0, 'active',
          v_rng_seed, NOW(), NOW()
        );
        
        RAISE NOTICE '✅ Auto-created session % for config %', v_new_session_id, v_config.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_session ON hot_sell_sessions;
CREATE TRIGGER trigger_auto_create_session
  AFTER UPDATE ON hot_sell_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_new_hot_sell_session();

SELECT '✅ Phase 3 Complete: Function, Indexes, Trigger created' as status;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

SELECT '🎯 FINAL VERIFICATION' as phase;

SELECT 
  '📋 All Active Sessions' as info,
  hs.id,
  hs.config_id,
  hsc.title,
  hs.status,
  hs.rng_seed,
  hs.participants_count || '/' || hs.max_participants as capacity,
  hs.created_at
FROM hot_sell_sessions hs
JOIN hot_sell_configs hsc ON hs.config_id = hsc.id
WHERE hs.status = 'active'
ORDER BY hsc.base_price;

SELECT 
  '🎉 FINAL SUMMARY' as summary,
  (SELECT COUNT(*) FROM hot_sell_configs) as total_configs,
  (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') as active_sessions,
  CASE 
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') >= (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '✅ ALL SYSTEMS GO - Users can join games!'
    ELSE '⚠️ Still missing some sessions'
  END as final_status;

SELECT 
  '🚀 ALL PHASES COMPLETE!' as message,
  'Users can now join Hot Sell games' as result,
  'Try joining a game in your app!' as next_step;

