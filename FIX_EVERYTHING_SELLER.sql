-- ============================================================================
-- FIX EVERYTHING: Storage, Seller Status, Listings
-- ============================================================================

-- Step 1: Re-approve Ryan as active seller
UPDATE seller_profiles
SET 
    status = 'active',
    verified = true,
    identity_verified = true,
    verified_at = NOW(),
    approved_at = NOW(),
    registration_completed = true,
    registration_step = 7,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('rf32191@gmail.com', 'rf32191@yahoo.com', 'ryanrfermoselle@yahoo.com')
);

SELECT 'Step 1: Ryan re-approved as active seller' as status;

-- Step 2: Check seller status
SELECT 'SELLER STATUS CHECK:' as info;
SELECT 
    sp.id,
    sp.shop_name,
    sp.status,
    sp.verified,
    sp.identity_verified,
    sp.registration_completed,
    u.email
FROM seller_profiles sp
JOIN users u ON sp.user_id = u.id;

-- Step 3: Create storage bucket (run this in Supabase SQL Editor)
-- Note: Storage buckets are created via the dashboard, not SQL
-- But we can insert into storage.buckets table

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'seller-documents',
    'seller-documents', 
    true,
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

SELECT 'Step 3: Storage bucket created/updated' as status;

-- Step 4: Create storage policy for public read access
INSERT INTO storage.policies (name, bucket_id, mode, definition)
VALUES (
    'Public Read Access',
    'seller-documents',
    'SELECT',
    '(bucket_id = ''seller-documents''::text)'
)
ON CONFLICT DO NOTHING;

-- Step 5: Allow authenticated users to upload
INSERT INTO storage.policies (name, bucket_id, mode, definition)
VALUES (
    'Authenticated Upload',
    'seller-documents',
    'INSERT',
    '((bucket_id = ''seller-documents''::text) AND (auth.role() = ''authenticated''::text))'
)
ON CONFLICT DO NOTHING;

SELECT 'Step 4-5: Storage policies created' as status;

SELECT '
============================================
MANUAL STEPS REQUIRED IN SUPABASE DASHBOARD:
============================================

If the SQL above fails for storage, do this manually:

1. Go to Storage in Supabase Dashboard
2. Click "New Bucket"
3. Name: seller-documents
4. Check "Public bucket"
5. Click Create

Then add policies:
1. Click on seller-documents bucket
2. Go to Policies tab
3. Click "New Policy"
4. Choose "For full customization"
5. Policy name: "Public Read"
6. Allowed operation: SELECT
7. Policy: true (allows all reads)
8. Save

============================================
AFTER THIS:
- Re-register as seller (upload new DL images)
- Images will now be stored and viewable
- Seller dashboard will work
============================================
' as instructions;

