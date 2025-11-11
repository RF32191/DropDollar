-- ============================================
-- PHASE 2: MINIMAL WRITE OPERATIONS
-- ONLY RUN AFTER Phase 1 diagnosis
-- Includes audit logging
-- ============================================

-- Option A: Create sessions for configs that lack active ones
-- (Use this if Phase 1 shows missing active sessions)
DO $$
DECLARE
  v_created_count INTEGER := 0;
  v_config RECORD;
  v_new_session_id UUID;
BEGIN
  -- Loop through configs that don't have active sessions
  FOR v_config IN 
    SELECT c.*
    FROM hot_sell_configs c
    WHERE NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions s 
      WHERE s.config_id = c.id AND s.status = 'active'
    )
  LOOP
    -- Generate new session with random seed
    v_new_session_id := gen_random_uuid();
    
    -- Create new active session
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
      floor(random() * 1000000)::INTEGER,  -- Random seed for new session
      NOW(),
      NOW()
    );
    
    -- Log to audit table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_session_audit') THEN
      INSERT INTO game_session_audit (
        session_id,
        action,
        performed_by,
        details,
        created_at
      ) VALUES (
        v_new_session_id,
        'session_created',
        'system_auto_create',
        jsonb_build_object(
          'config_id', v_config.id,
          'reason', 'no_active_session_found',
          'rng_seed', floor(random() * 1000000)::INTEGER
        ),
        NOW()
      );
    END IF;
    
    v_created_count := v_created_count + 1;
    RAISE NOTICE '✅ Created active session for config: %', v_config.id;
  END LOOP;
  
  RAISE NOTICE '📊 Total sessions created: %', v_created_count;
END $$;

-- Verify the fix worked
SELECT 
  'After Fix Verification' as check_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'active') >= (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '✅ SUCCESS - All configs have active sessions'
    ELSE '⚠️ Some configs still missing sessions'
  END as result
FROM hot_sell_sessions;

-- Show what was created
SELECT 
  'Newly Active Sessions' as info,
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

