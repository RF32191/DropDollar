-- ============================================
-- FIX GAME TYPE CONSTRAINT V2
-- ============================================
-- Handle existing listings with invalid game types
-- Update constraint safely
-- ============================================

-- Step 1: Check what game types currently exist
SELECT 
    'Current Game Types in Database' as info,
    game_type,
    COUNT(*) as count
FROM public.marketplace_listings
GROUP BY game_type
ORDER BY count DESC;

-- Step 2: Update any invalid game types to valid ones
-- Map old/invalid types to new valid types
UPDATE public.marketplace_listings
SET game_type = CASE
    WHEN game_type = 'crypto-match' THEN 'multi-target'
    WHEN game_type NOT IN (
        'multi-target',
        'falling-objects',
        'color-sequence',
        'quick-click',
        'pattern-match',
        'reflex-test',
        'laser-dodge'
    ) THEN 'multi-target'  -- Default fallback
    ELSE game_type
END
WHERE game_type NOT IN (
    'multi-target',
    'falling-objects',
    'color-sequence',
    'quick-click',
    'pattern-match',
    'reflex-test',
    'laser-dodge'
);

-- Step 3: Show updated game types
SELECT 
    'Updated Game Types' as info,
    game_type,
    COUNT(*) as count
FROM public.marketplace_listings
GROUP BY game_type
ORDER BY count DESC;

-- Step 4: Drop the old constraint
ALTER TABLE public.marketplace_listings 
DROP CONSTRAINT IF EXISTS marketplace_listings_game_type_check;

-- Step 5: Add new constraint with all 7 valid games
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

-- Step 6: Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.marketplace_listings'::regclass
    AND conname = 'marketplace_listings_game_type_check';

-- Step 7: Final verification - should have no violations
SELECT 
    'Final Verification' as info,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No invalid game types!'
        ELSE '❌ Found ' || COUNT(*) || ' invalid game types'
    END as status
FROM public.marketplace_listings
WHERE game_type NOT IN (
    'multi-target',
    'falling-objects',
    'color-sequence',
    'quick-click',
    'pattern-match',
    'reflex-test',
    'laser-dodge'
);

-- Success message
SELECT '✅ Game type constraint updated successfully! All 7 games are now available!' as status;

