-- ============================================================================
-- SIMPLE FIX: Re-approve Ryan as Seller
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

-- Step 2: Verify
SELECT 'SELLER STATUS:' as info;
SELECT 
    sp.shop_name,
    sp.status,
    sp.verified,
    u.email
FROM seller_profiles sp
JOIN users u ON sp.user_id = u.id;

SELECT '
============================================
SELLER RE-APPROVED!
============================================

Now create the storage bucket MANUALLY:

1. Go to Supabase Dashboard
2. Click "Storage" in left menu
3. Click "New Bucket" button
4. Name: seller-documents
5. CHECK "Public bucket" 
6. Click Create

Then add upload policy:
1. Click on seller-documents bucket
2. Click "Policies" tab
3. Click "New Policy"
4. Select "For full customization"
5. Name: Allow uploads
6. Operation: INSERT
7. Policy: (auth.role() = ''authenticated'')
8. Save

============================================
' as instructions;

