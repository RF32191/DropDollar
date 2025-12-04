-- ============================================================================
-- FIX TIMER DEFAULT - Remove 7200 default from table
-- ============================================================================

-- Check current default
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'marketplace_listings' 
AND column_name = 'timer_duration';

-- Remove the default or change it
ALTER TABLE public.marketplace_listings 
ALTER COLUMN timer_duration DROP DEFAULT;

-- OR set a new default to 3 minutes (180 seconds)
ALTER TABLE public.marketplace_listings 
ALTER COLUMN timer_duration SET DEFAULT 180;

-- Verify
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'marketplace_listings' 
AND column_name = 'timer_duration';

SELECT '✅ Timer default fixed to 180 seconds (3 minutes)' as status;

