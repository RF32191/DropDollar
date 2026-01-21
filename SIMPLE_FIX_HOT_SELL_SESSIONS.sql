-- ============================================================================
-- SIMPLE HOT SELL SESSION FIX - BULLETPROOF METHOD
-- ============================================================================
-- This is the simplest possible fix: just ensure every config has ONE session
-- ============================================================================

DO $$ 
DECLARE
  config_rec RECORD;
  session_count INTEGER;
  new_session_id UUID;
BEGIN
  RAISE NOTICE '🔧 Starting Simple Hot Sell Session Fix...';
  RAISE NOTICE '';
  
  -- Loop through each Hot Sell config
  FOR config_rec IN 
    SELECT * FROM public.hot_sell_configs ORDER BY base_price
  LOOP
    RAISE NOTICE '📋 Checking config: % (ID: %)', config_rec.title, config_rec.id;
    
    -- Count how many unpaid waiting/active sessions exist for this config
    SELECT COUNT(*) INTO session_count
    FROM public.hot_sell_sessions
    WHERE config_id = config_rec.id
      AND status IN ('waiting', 'active')
      AND first_place_user_id IS NULL;
    
    RAISE NOTICE '   Found % unpaid waiting/active sessions', session_count;
    
    IF session_count = 0 THEN
      -- No session exists, create one
      RAISE NOTICE '   ➕ Creating new waiting session...';
      
      INSERT INTO public.hot_sell_sessions (
        config_id,
        prize_pool,
        base_price,
        max_participants,
        participants_count,
        status,
        created_at,
        updated_at
      )
      VALUES (
        config_rec.id,
        0,
        config_rec.base_price,
        config_rec.max_participants,
        0,
        'waiting',
        NOW(),
        NOW()
      )
      RETURNING id INTO new_session_id;
      
      RAISE NOTICE '   ✅ Created session: %', new_session_id;
      
    ELSIF session_count = 1 THEN
      -- Perfect, one session exists
      RAISE NOTICE '   ✅ Session exists (good!)';
      
    ELSE
      -- Multiple sessions exist, keep the newest one
      RAISE NOTICE '   ⚠️  Multiple sessions found, cleaning up...';
      
      -- Delete all but the newest
      DELETE FROM public.hot_sell_participants
      WHERE session_id IN (
        SELECT id FROM public.hot_sell_sessions
        WHERE config_id = config_rec.id
          AND status IN ('waiting', 'active')
          AND first_place_user_id IS NULL
        ORDER BY created_at DESC
        OFFSET 1
      );
      
      DELETE FROM public.hot_sell_sessions
      WHERE config_id = config_rec.id
        AND status IN ('waiting', 'active')
        AND first_place_user_id IS NULL
        AND id NOT IN (
          SELECT id FROM public.hot_sell_sessions
          WHERE config_id = config_rec.id
            AND status IN ('waiting', 'active')
            AND first_place_user_id IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        );
      
      RAISE NOTICE '   ✅ Cleaned up duplicates';
    END IF;
    
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Hot Sell Sessions Fixed!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
END $$;

-- Show final state
SELECT 
  c.title as game,
  c.base_price as entry_fee,
  c.max_participants as max_players,
  s.status,
  s.participants_count as current_players,
  CASE 
    WHEN s.first_place_user_id IS NOT NULL THEN '✅ Paid'
    ELSE '🎮 Ready'
  END as state
FROM public.hot_sell_configs c
LEFT JOIN LATERAL (
  SELECT * FROM public.hot_sell_sessions
  WHERE config_id = c.id
    AND status IN ('waiting', 'active')
  ORDER BY created_at DESC
  LIMIT 1
) s ON true
ORDER BY c.base_price;

