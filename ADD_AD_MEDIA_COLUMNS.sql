-- Add columns for video support and multiple media files in ad campaigns
-- Run this in Supabase SQL Editor

-- Add display_order column for sorting multiple media files
ALTER TABLE ad_images 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add duration_seconds column for video files
ALTER TABLE ad_images 
ADD COLUMN IF NOT EXISTS duration_seconds DECIMAL(5,2);

-- Update image_type to include 'video' type
-- First check existing constraint and update if needed
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ad_images_image_type_check'
  ) THEN
    ALTER TABLE ad_images DROP CONSTRAINT ad_images_image_type_check;
  END IF;
  
  -- Add new constraint with 'video' type
  ALTER TABLE ad_images 
  ADD CONSTRAINT ad_images_image_type_check 
  CHECK (image_type IN ('banner', 'thumbnail', 'square', 'video'));
  
EXCEPTION 
  WHEN OTHERS THEN 
    RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_ad_images_campaign_order 
ON ad_images(campaign_id, display_order);

-- Add a media_type column for clearer distinction
ALTER TABLE ad_images 
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image';

-- Update existing rows
UPDATE ad_images 
SET media_type = 'image' 
WHERE media_type IS NULL;

-- Update storage policy to allow video uploads
-- (This assumes you have marketplace-images bucket already)

-- Create policy for ad-videos folder if not exists
DO $$ 
BEGIN
  -- Allow authenticated users to upload to ad-videos folder
  INSERT INTO storage.policies (name, bucket_id, operation, definition)
  SELECT 
    'Allow authenticated ad video uploads',
    'marketplace-images',
    'INSERT',
    '(auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = ''ad-videos'')'
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Allow authenticated ad video uploads' 
    AND bucket_id = 'marketplace-images'
  );
EXCEPTION 
  WHEN OTHERS THEN 
    RAISE NOTICE 'Storage policy already exists or error: %', SQLERRM;
END $$;

-- Grant select on ad_images to authenticated users
GRANT SELECT ON ad_images TO authenticated;
GRANT INSERT ON ad_images TO authenticated;
GRANT UPDATE ON ad_images TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN ad_images.display_order IS 'Order for displaying multiple media files (0 = first/primary)';
COMMENT ON COLUMN ad_images.duration_seconds IS 'Duration in seconds for video files (max 30s)';
COMMENT ON COLUMN ad_images.media_type IS 'Type of media: image or video';

SELECT 'Ad media columns added successfully!' as status;

