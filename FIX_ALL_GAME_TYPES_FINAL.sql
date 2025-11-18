-- ============================================
-- FIX ALL GAME TYPES - FINAL VERSION
-- ============================================
-- Update to support ALL 8 games that exist in the games menu
-- Handles existing data properly
-- ============================================

-- Step 1: Show current game types in database
SELECT 
    '📊 Current Game Types in Database' as info,
    game_type,
    COUNT(*) as count
FROM public.marketplace_listings
WHERE status != 'deleted'
GROUP BY game_type
ORDER BY count DESC;

-- Step 2: Map any invalid/old game types to valid ones
UPDATE public.marketplace_listings
SET game_type = CASE
    -- Map old names to new IDs
    WHEN game_type = 'crypto-match' THEN 'multi-target'
    WHEN game_type = 'pattern-match' THEN 'multi-target'
    WHEN game_type = 'reflex-test' THEN 'quick-click'
    -- Keep valid game types
    WHEN game_type IN (
        'multi-target',
        'falling-objects',
        'color-sequence',
        'laser-dodge',
        'quick-click',
        'sword-parry',
        'blade-bounce',
        'cash-stack'
    ) THEN game_type
    -- Default fallback for anything else
    ELSE 'multi-target'
END
WHERE game_type NOT IN (
    'multi-target',
    'falling-objects',
    'color-sequence',
    'laser-dodge',
    'quick-click',
    'sword-parry',
    'blade-bounce',
    'cash-stack'
);

-- Step 3: Show what was updated
SELECT 
    '✅ Updated Game Types' as info,
    game_type,
    COUNT(*) as count
FROM public.marketplace_listings
WHERE status != 'deleted'
GROUP BY game_type
ORDER BY count DESC;

-- Step 4: Drop the old constraint
ALTER TABLE public.marketplace_listings 
DROP CONSTRAINT IF EXISTS marketplace_listings_game_type_check;

-- Step 5: Add new constraint with ALL 8 valid games
ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_game_type_check
CHECK (game_type IN (
    'multi-target',      -- 🎯 Multi-Target Reaction
    'falling-objects',   -- 🏀 Falling Object Catch
    'color-sequence',    -- 🌈 Color Sequence Memory
    'laser-dodge',       -- 🚀 Laser Dodge EXTREME
    'quick-click',       -- ⚡ QuickClick Challenge
    'sword-parry',       -- ⚔️ Sword Slash
    'blade-bounce',      -- 🗡️ Blade Bounce: Mouseblade
    'cash-stack'         -- 💰 Cash Stack Challenge
));

-- Step 6: Verify the constraint
SELECT 
    '🔍 Constraint Verification' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.marketplace_listings'::regclass
    AND conname = 'marketplace_listings_game_type_check';

-- Step 7: Final check - should return 0 violations
SELECT 
    '🎯 Final Validation' as check_type,
    COUNT(*) as invalid_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL GAME TYPES VALID!'
        ELSE '❌ Still have ' || COUNT(*) || ' invalid game types'
    END as status
FROM public.marketplace_listings
WHERE game_type NOT IN (
    'multi-target',
    'falling-objects',
    'color-sequence',
    'laser-dodge',
    'quick-click',
    'sword-parry',
    'blade-bounce',
    'cash-stack'
)
AND status != 'deleted';

-- Step 8: List all 8 valid game types
SELECT 
    '🎮 Valid Game Types' as info,
    game_id,
    game_name,
    game_emoji
FROM (VALUES
    ('multi-target', 'Multi-Target Reaction', '🎯'),
    ('falling-objects', 'Falling Object Catch', '🏀'),
    ('color-sequence', 'Color Sequence Memory', '🌈'),
    ('laser-dodge', 'Laser Dodge EXTREME', '🚀'),
    ('quick-click', 'QuickClick Challenge', '⚡'),
    ('sword-parry', 'Sword Slash', '⚔️'),
    ('blade-bounce', 'Blade Bounce: Mouseblade', '🗡️'),
    ('cash-stack', 'Cash Stack Challenge', '💰')
) AS games(game_id, game_name, game_emoji)
ORDER BY game_id;

-- Success message
SELECT '🎉 SUCCESS! All 8 games are now available for marketplace listings!' as status;

-- ============================================
-- SUMMARY OF VALID GAME TYPES:
-- ============================================
-- 1. multi-target      - Multi-Target Reaction
-- 2. falling-objects   - Falling Object Catch
-- 3. color-sequence    - Color Sequence Memory
-- 4. laser-dodge       - Laser Dodge EXTREME
-- 5. quick-click       - QuickClick Challenge
-- 6. sword-parry       - Sword Slash
-- 7. blade-bounce      - Blade Bounce: Mouseblade
-- 8. cash-stack        - Cash Stack Challenge
-- ============================================

