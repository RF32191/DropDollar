-- =====================================================
-- ADD LISTING ENHANCEMENTS
-- Adds condition, brand, dimensions, weight
-- Note: image_urls already exists as JSONB, we keep it
-- =====================================================

-- 1. Add new columns to marketplace_listings (image_urls already exists)
ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS dimensions TEXT,
ADD COLUMN IF NOT EXISTS weight TEXT;

-- 2. Create storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policy for marketplace images
-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketplace-images');

-- Allow public to view images
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketplace-images');

-- Allow users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Add comments
COMMENT ON COLUMN public.marketplace_listings.condition IS 'Product condition: new, like-new, good, fair, used';
COMMENT ON COLUMN public.marketplace_listings.brand IS 'Product brand/manufacturer';
COMMENT ON COLUMN public.marketplace_listings.dimensions IS 'Product dimensions (free text)';
COMMENT ON COLUMN public.marketplace_listings.weight IS 'Product weight (free text)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_listings'
AND column_name IN ('condition', 'brand', 'dimensions', 'weight', 'image_urls');

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'marketplace-images';

-- Check storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%images%';

SELECT '✅ Listing enhancements added successfully!' as status;

