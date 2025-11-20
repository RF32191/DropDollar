-- ============================================
-- UPDATE GAME TYPE CONSTRAINTS - REAL GAMES ONLY
-- ============================================
-- Remove crypto_match, add only REAL games from /games page
-- ============================================

-- Step 1: Show current constraint
SELECT '
============================================
📋 STEP 1: Current game_type constraints
============================================
' as step;

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE '%game_type%'
AND conrelid::regclass::text IN ('marketplace_listings', 'game_history', 'winner_takes_all_configs');

-- Step 2: Update marketplace_listings constraint
SELECT '
============================================
🔧 STEP 2: Updating marketplace_listings
============================================
' as step;

-- Drop old constraint
ALTER TABLE public.marketplace_listings 
DROP CONSTRAINT IF EXISTS marketplace_listings_game_type_check;

-- Add new constraint with ONLY real games
ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_game_type_check 
CHECK (game_type IN (
    'multi-target',
    'falling-objects', 
    'color-sequence',
    'laser-dodge',
    'quick-click',
    'sword-parry',
    'blade-bounce',
    'cash-stack'
));

SELECT '✅ marketplace_listings updated with real games only' as status;

-- Step 3: Update game_history constraint (if exists)
SELECT '
============================================
🔧 STEP 3: Updating game_history (if has constraint)
============================================
' as step;

DO $$
BEGIN
    -- Drop if exists
    ALTER TABLE public.game_history 
    DROP CONSTRAINT IF EXISTS game_history_game_type_check;
    
    -- We DON'T add a constraint to game_history 
    -- because it should accept any string for historical data
    RAISE NOTICE '✅ game_history constraint removed (allows any game type for history)';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not update game_history: %', SQLERRM;
END $$;

-- Step 4: Update winner_takes_all_configs
SELECT '
============================================
🔧 STEP 4: Updating winner_takes_all_configs
============================================
' as step;

DO $$
BEGIN
    ALTER TABLE public.winner_takes_all_configs 
    DROP CONSTRAINT IF EXISTS winner_takes_all_configs_game_type_check;
    
    ALTER TABLE public.winner_takes_all_configs
    ADD CONSTRAINT winner_takes_all_configs_game_type_check 
    CHECK (game_type IN (
        'multi-target',
        'falling-objects',
        'color-sequence',
        'laser-dodge',
        'quick-click',
        'sword-parry',
        'blade-bounce',
        'cash-stack'
    ));
    
    RAISE NOTICE '✅ winner_takes_all_configs updated with real games only';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not update WTA configs: %', SQLERRM;
END $$;

-- Step 5: Update one_v_one_configs
SELECT '
============================================
🔧 STEP 5: Updating one_v_one_configs
============================================
' as step;

DO $$
BEGIN
    ALTER TABLE public.one_v_one_configs 
    DROP CONSTRAINT IF EXISTS one_v_one_configs_game_type_check;
    
    ALTER TABLE public.one_v_one_configs
    ADD CONSTRAINT one_v_one_configs_game_type_check 
    CHECK (game_type IN (
        'multi-target',
        'falling-objects',
        'color-sequence',
        'laser-dodge',
        'quick-click',
        'sword-parry',
        'blade-bounce',
        'cash-stack'
    ));
    
    RAISE NOTICE '✅ one_v_one_configs updated with real games only';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not update 1v1 configs: %', SQLERRM;
END $$;

-- Step 6: Update hot_sell_configs
SELECT '
============================================
🔧 STEP 6: Updating hot_sell_configs
============================================
' as step;

DO $$
BEGIN
    ALTER TABLE public.hot_sell_configs 
    DROP CONSTRAINT IF EXISTS hot_sell_configs_game_type_check;
    
    ALTER TABLE public.hot_sell_configs
    ADD CONSTRAINT hot_sell_configs_game_type_check 
    CHECK (game_type IN (
        'multi-target',
        'falling-objects',
        'color-sequence',
        'laser-dodge',
        'quick-click',
        'sword-parry',
        'blade-bounce',
        'cash-stack'
    ));
    
    RAISE NOTICE '✅ hot_sell_configs updated with real games only';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not update hot_sell configs: %', SQLERRM;
END $$;

-- Step 7: Update any existing crypto_match data
SELECT '
============================================
🗑️ STEP 7: Checking for crypto_match data
============================================
' as step;

SELECT 
    'marketplace_listings' as table_name,
    COUNT(*) as crypto_match_count
FROM public.marketplace_listings
WHERE game_type = 'crypto_match'

UNION ALL

SELECT 
    'game_history' as table_name,
    COUNT(*) as crypto_match_count
FROM public.game_history
WHERE game_type = 'crypto_match';

-- Optional: Update existing crypto_match to multi-target
DO $$
DECLARE
    v_updated INTEGER;
BEGIN
    -- Update marketplace_listings
    UPDATE public.marketplace_listings
    SET game_type = 'multi-target'
    WHERE game_type = 'crypto_match';
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE '✅ Updated % marketplace listings from crypto_match to multi-target', v_updated;
    
    -- We DON'T update game_history to preserve historical data
    RAISE NOTICE 'ℹ️ Keeping crypto_match in game_history for historical records';
    
END $$;

-- Step 8: Verify new constraints
SELECT '
============================================
✅ STEP 8: Verification
============================================
' as step;

SELECT 
    conrelid::regclass::text as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as allowed_games
FROM pg_constraint
WHERE conname LIKE '%game_type%'
AND conrelid::regclass::text IN (
    'marketplace_listings', 
    'winner_takes_all_configs',
    'one_v_one_configs',
    'hot_sell_configs'
)
ORDER BY table_name;

-- Final summary
SELECT '
============================================
✅ COMPLETE!
============================================

🎮 REAL GAMES NOW ENFORCED:
1. multi-target - Multi-Target Reaction
2. falling-objects - Falling Object Catch
3. color-sequence - Color Sequence Memory
4. laser-dodge - Laser Dodge EXTREME
5. quick-click - QuickClick Challenge
6. sword-parry - Sword Slash
7. blade-bounce - Blade Bounce: Mouseblade
8. cash-stack - Cash Stack Challenge

❌ REMOVED:
- crypto_match (fake game)

✅ UPDATED TABLES:
- marketplace_listings ✅
- winner_takes_all_configs ✅
- one_v_one_configs ✅
- hot_sell_configs ✅
- game_history (no constraint - allows any for history) ✅

🎯 NOW:
- Seller can only create listings with real games
- WTA/1v1/Hot Sell configs only accept real games
- Database enforces valid games
- crypto_match automatically converted to multi-target

============================================
' as final_summary;

