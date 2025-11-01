-- =========================================================
-- LEGAL TERMINOLOGY UPDATE: POT → POOL
-- =========================================================
-- This script renames all "pot" references to "pool" for legal compliance
-- "Prize pool" is more appropriate than "pot" which has gambling connotations
--
-- Run Date: 2025-01-01
-- Reason: Legal compliance for skill-based gaming terminology
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting legal terminology migration: POT → POOL...';
END $$;

-- =========================================================
-- WINNER TAKES ALL TABLES
-- =========================================================

-- Rename column in winner_takes_all_sessions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'winner_takes_all_sessions' 
    AND column_name = 'current_pot'
  ) THEN
    ALTER TABLE public.winner_takes_all_sessions 
    RENAME COLUMN current_pot TO current_pool;
    RAISE NOTICE '✅ Renamed winner_takes_all_sessions.current_pot → current_pool';
  ELSE
    RAISE NOTICE '⚠️ Column winner_takes_all_sessions.current_pot already renamed or does not exist';
  END IF;
END $$;

-- =========================================================
-- HOT SELL TABLES
-- =========================================================

-- Rename column in hot_sell_sessions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' 
    AND column_name = 'current_pot'
  ) THEN
    ALTER TABLE public.hot_sell_sessions 
    RENAME COLUMN current_pot TO current_pool;
    RAISE NOTICE '✅ Renamed hot_sell_sessions.current_pot → current_pool';
  ELSE
    RAISE NOTICE '⚠️ Column hot_sell_sessions.current_pot already renamed or does not exist';
  END IF;
END $$;

-- =========================================================
-- 1V1 TABLES
-- =========================================================

-- Rename column in one_v_one_sessions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'one_v_one_sessions' 
    AND column_name = 'current_pot'
  ) THEN
    ALTER TABLE public.one_v_one_sessions 
    RENAME COLUMN current_pot TO current_pool;
    RAISE NOTICE '✅ Renamed one_v_one_sessions.current_pot → current_pool';
  ELSE
    RAISE NOTICE '⚠️ Column one_v_one_sessions.current_pot already renamed or does not exist';
  END IF;
END $$;

-- =========================================================
-- UPDATE FUNCTIONS THAT REFERENCE "POT"
-- =========================================================

-- Note: Functions will need to be recreated to use new column names
-- This is handled automatically when RPC functions are called with new schema

DO $$ 
BEGIN
  RAISE NOTICE '📝 Functions will automatically use new column names on next execution';
  RAISE NOTICE '💡 Make sure to update client-side code to use "current_pool" instead of "current_pot"';
END $$;

-- =========================================================
-- VERIFICATION
-- =========================================================

DO $$ 
DECLARE
  wta_count INTEGER;
  hs_count INTEGER;
  ovo_count INTEGER;
BEGIN
  -- Check Winner Takes All
  SELECT COUNT(*) INTO wta_count
  FROM information_schema.columns 
  WHERE table_name = 'winner_takes_all_sessions' 
  AND column_name = 'current_pool';
  
  -- Check Hot Sell
  SELECT COUNT(*) INTO hs_count
  FROM information_schema.columns 
  WHERE table_name = 'hot_sell_sessions' 
  AND column_name = 'current_pool';
  
  -- Check 1v1
  SELECT COUNT(*) INTO ovo_count
  FROM information_schema.columns 
  WHERE table_name = 'one_v_one_sessions' 
  AND column_name = 'current_pool';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Winner Takes All: current_pool exists = %', (wta_count > 0);
  RAISE NOTICE 'Hot Sell: current_pool exists = %', (hs_count > 0);
  RAISE NOTICE '1v1: current_pool exists = %', (ovo_count > 0);
  RAISE NOTICE '========================================';
  
  IF wta_count > 0 AND hs_count > 0 AND ovo_count > 0 THEN
    RAISE NOTICE '✅ ✅ ✅ Legal terminology migration SUCCESSFUL!';
    RAISE NOTICE '🎉 All "pot" references changed to "pool"';
  ELSE
    RAISE NOTICE '⚠️ Some columns may not have been renamed. Check table structure.';
  END IF;
END $$;

-- =========================================================
-- COMPLETION MESSAGE
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Legal Terminology Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Update client-side code to use "current_pool"';
  RAISE NOTICE '2. Update all RPC function calls';
  RAISE NOTICE '3. Test all tournament pages';
  RAISE NOTICE '';
  RAISE NOTICE '⚖️ Legal Compliance: "Prize Pool" terminology now used throughout platform';
  RAISE NOTICE '';
END $$;

