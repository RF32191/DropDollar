-- ============================================================================
-- RESET ALL HOT SELL LISTINGS FOR TESTING
-- This will clear all progress and create fresh sessions
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting Hot Sell Reset...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 1: Delete all participants
-- ============================================================================

DO $$ 
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '📋 STEP 1: Clearing all participants...';
  
  DELETE FROM public.hot_sell_participants;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '  ✅ Deleted % participants', deleted_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Delete all existing sessions
-- ============================================================================

DO $$ 
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '📋 STEP 2: Clearing all sessions...';
  
  DELETE FROM public.hot_sell_sessions;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '  ✅ Deleted % sessions', deleted_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Create fresh 'waiting' sessions for all configs
-- ============================================================================

DO $$ 
DECLARE
  config_rec RECORD;
  new_session_id UUID;
  session_count INTEGER := 0;
BEGIN
  RAISE NOTICE '📋 STEP 3: Creating fresh sessions for all configs...';
  RAISE NOTICE '';
  
  FOR config_rec IN 
    SELECT * FROM public.hot_sell_configs ORDER BY base_price
  LOOP
    INSERT INTO public.hot_sell_sessions (
      config_id,
      prize_pool,
      base_price,
      max_participants,
      participants_count,
      status
    )
    VALUES (
      config_rec.id,
      0,
      config_rec.base_price,
      config_rec.max_participants,
      0,
      'waiting'
    )
    RETURNING id INTO new_session_id;
    
    session_count := session_count + 1;
    
    RAISE NOTICE '  ✅ Created session for: % (ID: %)', config_rec.title, new_session_id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created % fresh sessions!', session_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: Verification Report
-- ============================================================================

DO $$ 
DECLARE
  total_configs INTEGER;
  total_sessions INTEGER;
  total_participants INTEGER;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 VERIFICATION REPORT';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO total_configs FROM public.hot_sell_configs;
  SELECT COUNT(*) INTO total_sessions FROM public.hot_sell_sessions WHERE status = 'waiting';
  SELECT COUNT(*) INTO total_participants FROM public.hot_sell_participants;
  
  RAISE NOTICE '📋 Total Configs: %', total_configs;
  RAISE NOTICE '🎮 Waiting Sessions: %', total_sessions;
  RAISE NOTICE '👥 Total Participants: %', total_participants;
  RAISE NOTICE '';
  
  IF total_configs = total_sessions AND total_participants = 0 THEN
    RAISE NOTICE '✅ All Hot Sell listings reset successfully!';
    RAISE NOTICE '🎮 Ready for testing!';
  ELSE
    RAISE NOTICE '⚠️  Something might be wrong:';
    IF total_configs != total_sessions THEN
      RAISE NOTICE '  - Configs (%) != Sessions (%)', total_configs, total_sessions;
    END IF;
    IF total_participants != 0 THEN
      RAISE NOTICE '  - Participants not cleared: %', total_participants;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- Show current state
-- ============================================================================

SELECT 
  c.id as config_id,
  c.title,
  c.base_price,
  c.max_participants,
  s.id as session_id,
  s.status,
  s.prize_pool,
  s.participants_count,
  s.created_at
FROM public.hot_sell_configs c
LEFT JOIN public.hot_sell_sessions s ON c.id = s.config_id
ORDER BY c.base_price;

