-- =====================================================
-- COMPLETE MARKETPLACE FIX
-- Run this ONE file instead of the 3 separate files
-- This fixes everything in the correct order
-- =====================================================

-- ============================================================================
-- STEP 1: Fix Game Type Constraint
-- ============================================================================
ALTER TABLE public.marketplace_listings
DROP CONSTRAINT IF EXISTS marketplace_listings_game_type_check;

ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_game_type_check
CHECK (game_type IN (
    'crypto_match',
    'laser_dodge', 
    'alien_shooter',
    'brain_freeze',
    'multi-target',
    'falling-objects',
    'color-sequence',
    'quick-click',
    'sword-parry',
    'blade-bounce',
    'cash-stack'
));

-- ============================================================================
-- STEP 2: Add New Columns (if they don't exist)
-- ============================================================================
ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS dimensions TEXT,
ADD COLUMN IF NOT EXISTS weight TEXT;

-- ============================================================================
-- STEP 3: Fix Existing Listings (set defaults for NULL values)
-- ============================================================================
UPDATE public.marketplace_listings
SET condition = 'new'
WHERE condition IS NULL;

-- ============================================================================
-- STEP 4: Create Storage Bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketplace-images');

DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketplace-images');

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STEP 5: Update RPC Function
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_all_marketplace_listings(TEXT);

CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings(category_filter TEXT DEFAULT 'all')
RETURNS TABLE (
    id TEXT,
    seller_id TEXT,
    seller_username TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    shipping_included BOOLEAN,
    seller_contact TEXT,
    image_urls JSONB,
    condition TEXT,
    brand TEXT,
    dimensions TEXT,
    weight TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    session_id TEXT,
    prize_pool NUMERIC,
    participants_count INTEGER,
    session_status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    winner_username TEXT,
    winner_score NUMERIC,
    winner_contacted BOOLEAN,
    rng_seed INTEGER,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id::TEXT,
        l.seller_id::TEXT,
        COALESCE(l.seller_username, 'Unknown')::TEXT,
        l.title,
        l.description,
        l.category,
        l.base_price,
        l.game_type,
        COALESCE(l.shipping_included, true)::BOOLEAN,
        l.seller_contact,
        COALESCE(l.image_urls, '[]'::jsonb)::JSONB,
        COALESCE(l.condition, 'new')::TEXT,
        l.brand,
        l.dimensions,
        l.weight,
        COALESCE(l.status, 'active')::TEXT,
        l.created_at,
        COALESCE(s.id::TEXT, '')::TEXT as session_id,
        COALESCE(s.prize_pool, 0)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER,
        COALESCE(s.status, 'waiting')::TEXT as session_status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 7200)::INTEGER,
        s.winner_user_id::TEXT,
        s.winner_username,
        s.winner_score,
        COALESCE(s.winner_contacted, false)::BOOLEAN,
        COALESCE(s.rng_seed, 1)::INTEGER,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id::TEXT,
                        'user_id', p.user_id::TEXT,
                        'username', COALESCE(u.username, 'Anonymous'),
                        'entry_amount', COALESCE(p.entry_amount, 0),
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.marketplace_participants p
                LEFT JOIN public.users u ON u.id = p.user_id
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.marketplace_listings l
    LEFT JOIN public.marketplace_sessions s ON s.listing_id = l.id
    WHERE l.status = 'active'
      AND (category_filter = 'all' OR l.category = category_filter)
    ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings(TEXT) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION & TESTING
-- ============================================================================

-- Check columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_listings'
AND column_name IN ('condition', 'brand', 'dimensions', 'weight', 'image_urls')
ORDER BY ordinal_position;

-- Test the function
SELECT 
    id, 
    title, 
    condition, 
    brand,
    session_id,
    session_status,
    participants_count
FROM public.get_all_marketplace_listings('all')
LIMIT 3;

-- Check game type constraint
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.marketplace_listings'::regclass 
AND conname = 'marketplace_listings_game_type_check';

SELECT '✅ COMPLETE! Marketplace is fixed and ready!' as status;

