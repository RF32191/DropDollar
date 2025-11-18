-- ============================================
-- FIX GAME TYPE CONSTRAINT
-- ============================================
-- Update marketplace_listings to allow all valid games
-- Remove crypto-match, add laser-dodge and others
-- ============================================

-- Step 1: Drop the old constraint
ALTER TABLE public.marketplace_listings 
DROP CONSTRAINT IF EXISTS marketplace_listings_game_type_check;

-- Step 2: Add new constraint with all 7 valid games
ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_game_type_check
CHECK (game_type IN (
    'multi-target',      -- Multi-Target Reaction (exists)
    'falling-objects',   -- Falling Object Catch (exists)
    'color-sequence',    -- Color Sequence Memory (exists)
    'quick-click',       -- Quick Click Challenge (exists)
    'pattern-match',     -- Pattern Matching (exists)
    'reflex-test',       -- Reflex Test (exists)
    'laser-dodge'        -- Laser Dodge (exists)
));

-- Step 3: Verify constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.marketplace_listings'::regclass
    AND conname = 'marketplace_listings_game_type_check';

-- Step 4: Check existing listings
SELECT 
    'Existing Game Types' as info,
    game_type,
    COUNT(*) as count
FROM public.marketplace_listings
GROUP BY game_type
ORDER BY count DESC;

-- Success message
SELECT '✅ Game type constraint updated! You can now use all 7 games!' as status;

