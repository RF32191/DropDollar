-- ============================================
-- FIX LISTING STATUS CONSTRAINT
-- ============================================
-- Add missing statuses: winner_selected, address_provided
-- ============================================

-- Step 1: Check current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.marketplace_listings'::regclass
    AND conname = 'marketplace_listings_status_check';

-- Step 2: Drop old constraint
ALTER TABLE public.marketplace_listings 
DROP CONSTRAINT IF EXISTS marketplace_listings_status_check;

-- Step 3: Add new constraint with ALL statuses including winner_selected and address_provided
ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_status_check
CHECK (status IN (
    'draft',
    'active',
    'waiting',
    'completed',
    'winner_selected',
    'address_provided',
    'deleted',
    'paused',
    'cancelled'
));

-- Step 4: Verify new constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.marketplace_listings'::regclass
    AND conname = 'marketplace_listings_status_check';

-- Success message
SELECT '✅ Listing status constraint updated! Now supports winner_selected and address_provided' as status;

