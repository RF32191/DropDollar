-- ============================================================================
-- FIX MISSING 1V1 SESSIONS
-- ============================================================================
-- Creates sessions for any configs that don't have one
-- ============================================================================

-- First, check which configs are missing sessions
SELECT 
  c.id as config_id,
  c.game_type,
  c.title,
  CASE WHEN s.id IS NULL THEN '❌ NO SESSION' ELSE '✅ HAS SESSION' END as session_status
FROM public.one_v_one_configs c
LEFT JOIN public.one_v_one_sessions s ON s.config_id = c.id
ORDER BY c.game_type, c.entry_fee;

-- Create sessions for configs that don't have one
INSERT INTO public.one_v_one_sessions (
  id,
  config_id,
  current_pool,
  prize_pool,
  participants_count,
  max_participants,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  0,
  c.prize_pool,
  0,
  2,
  'active',
  NOW(),
  NOW()
FROM public.one_v_one_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM public.one_v_one_sessions s 
  WHERE s.config_id = c.id
);

-- Verify all configs now have sessions
DO $$
DECLARE
  configs_count INTEGER;
  sessions_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO configs_count FROM public.one_v_one_configs;
  SELECT COUNT(*) INTO sessions_count FROM public.one_v_one_sessions;
  
  SELECT COUNT(*) INTO missing_count
  FROM public.one_v_one_configs c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.one_v_one_sessions s 
    WHERE s.config_id = c.id
  );
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ SESSION FIX COMPLETE!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total Configs: %', configs_count;
  RAISE NOTICE 'Total Sessions: %', sessions_count;
  RAISE NOTICE 'Configs Missing Sessions: %', missing_count;
  
  IF missing_count = 0 THEN
    RAISE NOTICE '✅ All configs have sessions!';
  ELSE
    RAISE NOTICE '⚠️ Still missing % sessions!', missing_count;
  END IF;
END $$;

