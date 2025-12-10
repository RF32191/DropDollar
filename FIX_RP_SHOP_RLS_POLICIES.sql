-- ============================================================================
-- FIX RP SHOP RLS POLICIES
-- ============================================================================
-- Fixes RLS policies to allow rf32191@gmail.com to manage RP shop listings
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active RP shop listings" ON public.rp_shop_listings;
DROP POLICY IF EXISTS "Admins can manage RP shop listings" ON public.rp_shop_listings;
DROP POLICY IF EXISTS "Admins can insert RP shop listings" ON public.rp_shop_listings;
DROP POLICY IF EXISTS "Admins can update RP shop listings" ON public.rp_shop_listings;
DROP POLICY IF EXISTS "Admins can delete RP shop listings" ON public.rp_shop_listings;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active RP shop listings" ON public.rp_shop_listings
    FOR SELECT USING (is_active = true);

-- Admins can insert listings
CREATE POLICY "Admins can insert RP shop listings" ON public.rp_shop_listings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR email = 'rf32191@gmail.com' OR email = 'rf32191@yahoo.com')
        )
    );

-- Admins can update listings
CREATE POLICY "Admins can update RP shop listings" ON public.rp_shop_listings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR email = 'rf32191@gmail.com' OR email = 'rf32191@yahoo.com')
        )
    );

-- Admins can delete listings
CREATE POLICY "Admins can delete RP shop listings" ON public.rp_shop_listings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR email = 'rf32191@gmail.com' OR email = 'rf32191@yahoo.com')
        )
    );

SELECT '✅ RP Shop RLS Policies Fixed!' as status;

