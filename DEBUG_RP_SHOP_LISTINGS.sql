-- ============================================================================
-- DEBUG RP SHOP LISTINGS
-- ============================================================================
-- Run this to check if listings exist and their status
-- ============================================================================

-- Check all listings (bypass RLS for admin)
SELECT 
    id,
    title,
    description,
    rp_cost,
    item_type,
    is_active,
    created_at,
    created_by
FROM public.rp_shop_listings
ORDER BY created_at DESC;

-- Check if function exists and works
SELECT public.get_rp_shop_listings('00000000-0000-0000-0000-000000000000'::UUID);

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'rp_shop_listings';

