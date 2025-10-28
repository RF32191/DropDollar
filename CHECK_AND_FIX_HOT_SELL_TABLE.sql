-- ============================================================================
-- CHECK AND FIX HOT SELL TABLE STRUCTURE
-- ============================================================================
-- This will check the actual table structure and add missing columns
-- ============================================================================

-- Check current hot_sell_sessions table structure
DO $$
DECLARE
  has_participants_count BOOLEAN;
  has_base_price BOOLEAN;
BEGIN
  -- Check for participants_count column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' 
    AND column_name = 'participants_count'
  ) INTO has_participants_count;
  
  -- Check for base_price column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hot_sell_sessions' 
    AND column_name = 'base_price'
  ) INTO has_base_price;
  
  RAISE NOTICE '🔍 Hot Sell Sessions Table Check:';
  RAISE NOTICE '   participants_count column exists: %', has_participants_count;
  RAISE NOTICE '   base_price column exists: %', has_base_price;
  
  -- Add missing columns if needed
  IF NOT has_participants_count THEN
    RAISE NOTICE '⚠️  Adding missing participants_count column...';
    ALTER TABLE hot_sell_sessions ADD COLUMN participants_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added participants_count column';
  END IF;
  
  IF NOT has_base_price THEN
    RAISE NOTICE '⚠️  Adding missing base_price column...';
    ALTER TABLE hot_sell_sessions ADD COLUMN base_price NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE '✅ Added base_price column';
  END IF;
  
  IF has_participants_count AND has_base_price THEN
    RAISE NOTICE '✅ All required columns exist';
  END IF;
END $$;

-- Now show the actual columns in hot_sell_sessions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hot_sell_sessions'
ORDER BY ordinal_position;

