-- ============================================================================
-- 🔄 RESET: Delete Ryan's seller profile for fresh registration
-- ============================================================================

-- Delete seller profile for ryanrfermoselle
DELETE FROM seller_profiles 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE username = 'ryanrfermoselle' 
       OR email LIKE '%ryanrfermoselle%'
       OR email = 'rf32191@gmail.com'
       OR email = 'rf32191@yahoo.com'
);

-- Verify deletion
SELECT 
    'Remaining seller profiles:' as info,
    COUNT(*) as count
FROM seller_profiles;

SELECT '
✅ DONE! Ryan seller profile deleted.
You can now register as a seller again.
' as status;

