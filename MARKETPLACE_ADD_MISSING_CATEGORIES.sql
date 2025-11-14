-- ============================================================================
-- ADD MISSING CATEGORIES TO MARKETPLACE
-- Run this if you already ran MARKETPLACE_COMPLETE_SETUP_FIXED.sql
-- This adds support for hyphenated category IDs
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.marketplace_listings
DROP CONSTRAINT IF EXISTS valid_category;

-- Add new constraint with ALL category IDs
ALTER TABLE public.marketplace_listings
ADD CONSTRAINT valid_category CHECK (category IN (
    'electronics', 'dropafund', 'fun', 'tools', 'music', 'books', 'art', 'cars', 
    'photos', 'sports', 'home', 'fashion', 'collectibles', 'automotive',
    'tools-equipment', 'photography', 'art-crafts', 'music-instruments', 'books-media',
    'all'
));

-- Success message
SELECT '
✅ CATEGORIES UPDATED!

Added support for:
- tools-equipment (Tools & Equipment)
- photography (Photography)
- art-crafts (Art & Crafts)
- music-instruments (Music Instruments)
- books-media (Books & Media)

All category pages now work! 🎉
' as status;

