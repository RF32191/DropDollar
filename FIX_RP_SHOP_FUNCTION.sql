-- ============================================================================
-- FIX RP SHOP LISTINGS FUNCTION
-- ============================================================================
-- Fixes the function return type to match actual data structure
-- ============================================================================

-- Drop and recreate the function with correct return types
DROP FUNCTION IF EXISTS public.get_rp_shop_listings(UUID);

CREATE OR REPLACE FUNCTION public.get_rp_shop_listings(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    rp_cost INTEGER,
    item_type TEXT,
    item_value INTEGER,
    image_url TEXT,
    stock_quantity INTEGER,
    purchase_limit_per_user INTEGER,
    can_purchase BOOLEAN,
    purchase_count INTEGER,
    stock_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_rp INTEGER;
BEGIN
    -- Get user's RP balance (handle case where user_xp doesn't exist)
    SELECT COALESCE(reward_points, 0) INTO v_user_rp
    FROM public.user_xp
    WHERE user_id = p_user_id;
    
    -- If user doesn't have XP record, default to 0
    IF v_user_rp IS NULL THEN
        v_user_rp := 0;
    END IF;

    RETURN QUERY
    SELECT 
        l.id::UUID,
        l.title::TEXT,
        l.description::TEXT,
        l.rp_cost::INTEGER,
        l.item_type::TEXT,
        l.item_value::INTEGER,
        l.image_url::TEXT,
        l.stock_quantity::INTEGER,
        l.purchase_limit_per_user::INTEGER,
        (CASE 
            WHEN v_user_rp >= l.rp_cost THEN true
            ELSE false
        END)::BOOLEAN as can_purchase,
        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM public.rp_shop_purchases 
            WHERE user_id = p_user_id AND listing_id = l.id
        ), 0)::INTEGER as purchase_count,
        (CASE 
            WHEN l.stock_quantity IS NULL THEN NULL
            ELSE GREATEST(0, l.stock_quantity - COALESCE((
                SELECT COUNT(*)::INTEGER
                FROM public.rp_shop_purchases 
                WHERE listing_id = l.id
            ), 0))
        END)::INTEGER as stock_remaining
    FROM public.rp_shop_listings l
    WHERE l.is_active = true
    ORDER BY l.sort_order, l.created_at DESC;
END;
$$;

SELECT '✅ RP Shop Listings Function Fixed!' as status;

