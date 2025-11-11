-- ============================================
-- PHASE 3: AUTOMATION (OPTIONAL)
-- Auto-create sessions when needed
-- Add index for performance
-- Set up cron job
-- ============================================

-- 1. Function to ensure active sessions exist
CREATE OR REPLACE FUNCTION ensure_active_hot_sell_sessions()
RETURNS TABLE(
  config_id TEXT,
  session_id UUID,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_new_session_id UUID;
  v_rng_seed INTEGER;
BEGIN
  -- Loop through configs missing active sessions
  FOR v_config IN 
    SELECT c.*
    FROM hot_sell_configs c
    WHERE NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions s 
      WHERE s.config_id = c.id AND s.status = 'active'
    )
  LOOP
    -- Generate unique random seed
    v_rng_seed := floor(random() * 1000000)::INTEGER;
    v_new_session_id := gen_random_uuid();
    
    -- Create new session
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
    
    -- Audit log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_session_audit') THEN
      INSERT INTO game_session_audit (
        session_id,
        action,
        performed_by,
        details,
        created_at
      ) VALUES (
        v_new_session_id,
        'auto_session_created',
        'ensure_active_hot_sell_sessions',
        jsonb_build_object(
          'config_id', v_config.id,
          'rng_seed', v_rng_seed,
          'reason', 'missing_active_session'
        ),
        NOW()
      );
    END IF;
    
    -- Return result
    config_id := v_config.id;
    session_id := v_new_session_id;
    action := 'created';
    RETURN NEXT;
    
    RAISE NOTICE '✅ Created session % for config %', v_new_session_id, v_config.id;
  END LOOP;
  
  -- If no sessions were created
  IF NOT FOUND THEN
    RAISE NOTICE '✅ All configs already have active sessions';
  END IF;
END;
$$;

-- 2. Performance index (if not exists)
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_config_status 
ON hot_sell_sessions(config_id, status)
WHERE status = 'active';

-- 3. Performance index for RPC lookups
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_id_status
ON hot_sell_sessions(id, status);

-- 4. Example: Call the function manually
-- SELECT * FROM ensure_active_hot_sell_sessions();

-- 5. Optional: Set up pg_cron (requires pg_cron extension)
-- Uncomment to enable automated session creation every 5 minutes

/*
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 5 minutes
SELECT cron.schedule(
  'ensure-hot-sell-sessions',           -- Job name
  '*/5 * * * *',                        -- Every 5 minutes
  $$ SELECT ensure_active_hot_sell_sessions(); $$
);

-- To see scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule later:
-- SELECT cron.unschedule('ensure-hot-sell-sessions');
*/

-- 6. Alternative: Trigger on session completion
CREATE OR REPLACE FUNCTION auto_create_new_hot_sell_session()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_session_id UUID;
  v_rng_seed INTEGER;
  v_config RECORD;
BEGIN
  -- Only trigger when a session is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Check if config already has another active session
    IF NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions 
      WHERE config_id = NEW.config_id 
        AND id != NEW.id 
        AND status = 'active'
    ) THEN
      
      -- Get config details
      SELECT * INTO v_config 
      FROM hot_sell_configs 
      WHERE id = NEW.config_id;
      
      IF FOUND THEN
        v_rng_seed := floor(random() * 1000000)::INTEGER;
        v_new_session_id := gen_random_uuid();
        
        -- Create new active session
        INSERT INTO hot_sell_sessions (
          id, config_id, prize_pool, base_price,
          max_participants, participants_count, status,
          rng_seed, created_at, updated_at
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
        
        -- Audit log
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_session_audit') THEN
          INSERT INTO game_session_audit (
            session_id, action, performed_by, details, created_at
          ) VALUES (
            v_new_session_id,
            'auto_session_created_on_completion',
            'trigger_auto_create_new_hot_sell_session',
            jsonb_build_object(
              'previous_session_id', NEW.id,
              'config_id', v_config.id,
              'rng_seed', v_rng_seed
            ),
            NOW()
          );
        END IF;
        
        RAISE NOTICE '✅ Auto-created new session % for config % after completion of %', 
          v_new_session_id, v_config.id, NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (only run if you want auto-creation on completion)
/*
DROP TRIGGER IF EXISTS trigger_auto_create_session ON hot_sell_sessions;

CREATE TRIGGER trigger_auto_create_session
  AFTER UPDATE ON hot_sell_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_new_hot_sell_session();
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test the function
SELECT 'Testing Function' as test;
SELECT * FROM ensure_active_hot_sell_sessions();

-- Check indexes were created
SELECT 'Index Status' as check;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'hot_sell_sessions'
  AND indexname LIKE 'idx_hot_sell_%';

-- Check triggers
SELECT 'Trigger Status' as check;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'hot_sell_sessions';

