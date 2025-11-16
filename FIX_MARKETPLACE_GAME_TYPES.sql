-- =====================================================
-- FIX MARKETPLACE GAME TYPES CONSTRAINT
-- Updates the check constraint to allow all 8 games
-- =====================================================

-- 1. Drop the old check constraint
ALTER TABLE public.marketplace_listings
DROP CONSTRAINT IF EXISTS marketplace_listings_game_type_check;

-- 2. Add new check constraint with all 8 game types
ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_game_type_check
CHECK (game_type IN (
    -- Original gamesf
    'crypto_match',
    'laser_dodge', 
    'alien_shooter',
    'brain_freeze',
    -- New games from /games section
    'multi-target',
    'falling-objects',
    'color-sequence',
    'quick-click',
    'sword-parry',
    'blade-bounce',
    'cash-stack'
));

-- 3. Add comment
COMMENT ON COLUMN public.marketplace_listings.game_type IS 'Type of game for this listing: crypto_match, laser_dodge, alien_shooter, brain_freeze, multi-target, falling-objects, color-sequence, quick-click, sword-parry, blade-bounce, cash-stack';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.marketplace_listings'::regclass 
AND conname = 'marketplace_listings_game_type_check';

SELECT '✅ Game type constraint updated successfully!' as status;

