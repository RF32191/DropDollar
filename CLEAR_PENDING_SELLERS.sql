-- ============================================================
-- CLEAR PENDING SELLERS - Allow Users to Reregister
-- ============================================================
-- This script clears stuck/pending seller applications
-- Allows users to start fresh with seller registration
-- ============================================================

-- 1. VIEW ALL CURRENT PENDING SELLERS
SELECT 
    sp.id,
    sp.user_id,
    u.email,
    sp.shop_name,
    sp.status,
    sp.registration_step,
    sp.created_at
FROM public.seller_profiles sp
LEFT JOIN auth.users u ON u.id = sp.user_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC;

-- ============================================================
-- 2. DELETE ALL PENDING SELLER PROFILES
-- ============================================================
-- This removes all pending seller applications
-- Users can start fresh

DELETE FROM public.seller_profiles
WHERE status = 'pending';

-- ============================================================
-- 3. ALSO CLEAR ANY REJECTED SELLERS (Optional)
-- ============================================================
-- Uncomment if you want to clear rejected sellers too

-- DELETE FROM public.seller_profiles
-- WHERE status = 'rejected';

-- ============================================================
-- 4. CLEAR SPECIFIC USER BY EMAIL (If needed)
-- ============================================================
-- Replace 'user@example.com' with actual email

-- DELETE FROM public.seller_profiles
-- WHERE user_id = (
--     SELECT id FROM auth.users WHERE email = 'user@example.com'
-- );

-- ============================================================
-- 5. VERIFICATION - Check what's left
-- ============================================================
SELECT 
    sp.status,
    COUNT(*) as count
FROM public.seller_profiles sp
GROUP BY sp.status;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Pending sellers cleared!';
    RAISE NOTICE '✅ Users can now register as sellers again!';
END $$;

