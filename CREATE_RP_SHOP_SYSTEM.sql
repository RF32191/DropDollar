-- ============================================================================
-- RP SHOP SYSTEM - COMPLETE SCHEMA
-- ============================================================================
-- Creates Reward Points shop where admins can create listings and users can purchase with RP
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🛍️ CREATING RP SHOP SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- 1. RP SHOP LISTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rp_shop_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rp_cost INTEGER NOT NULL CHECK (rp_cost > 0),
    item_type TEXT NOT NULL CHECK (item_type IN (
        'cosmetic', 'boost', 'badge', 'token_bonus', 'special', 'other'
    )),
    item_value INTEGER, -- For token bonuses, boost multipliers, etc.
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    stock_quantity INTEGER, -- NULL = unlimited
    purchase_limit_per_user INTEGER DEFAULT 1, -- How many times a user can buy this item
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rp_shop_listings_active ON public.rp_shop_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rp_shop_listings_type ON public.rp_shop_listings(item_type);
CREATE INDEX IF NOT EXISTS idx_rp_shop_listings_sort ON public.rp_shop_listings(sort_order, created_at DESC);

-- ============================================================================
-- 2. RP SHOP PURCHASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rp_shop_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.rp_shop_listings(id) ON DELETE CASCADE,
    rp_cost INTEGER NOT NULL CHECK (rp_cost > 0),
    item_type TEXT NOT NULL,
    item_value INTEGER,
    purchase_data JSONB, -- Store any additional data about the purchase
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, listing_id, created_at) -- Prevent duplicate purchases in same second
);

CREATE INDEX IF NOT EXISTS idx_rp_shop_purchases_user_id ON public.rp_shop_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_rp_shop_purchases_listing_id ON public.rp_shop_listings(id);
CREATE INDEX IF NOT EXISTS idx_rp_shop_purchases_created_at ON public.rp_shop_purchases(created_at DESC);

-- ============================================================================
-- 3. FUNCTIONS
-- ============================================================================

-- Function to purchase item from RP shop
CREATE OR REPLACE FUNCTION public.purchase_rp_shop_item(
    p_user_id UUID,
    p_listing_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing RECORD;
    v_user_rp INTEGER;
    v_purchase_count INTEGER;
    v_stock_available INTEGER;
BEGIN
    -- Get listing details
    SELECT * INTO v_listing
    FROM public.rp_shop_listings
    WHERE id = p_listing_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Listing not found or inactive'
        );
    END IF;

    -- Get user's current RP balance
    SELECT COALESCE(reward_points, 0) INTO v_user_rp
    FROM public.user_xp
    WHERE user_id = p_user_id;

    -- Check if user has enough RP
    IF v_user_rp < v_listing.rp_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient reward points',
            'required', v_listing.rp_cost,
            'available', v_user_rp
        );
    END IF;

    -- Check purchase limit per user
    SELECT COUNT(*) INTO v_purchase_count
    FROM public.rp_shop_purchases
    WHERE user_id = p_user_id AND listing_id = p_listing_id;

    IF v_purchase_count >= v_listing.purchase_limit_per_user THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Purchase limit reached for this item'
        );
    END IF;

    -- Check stock availability
    IF v_listing.stock_quantity IS NOT NULL THEN
        SELECT COUNT(*) INTO v_stock_available
        FROM public.rp_shop_purchases
        WHERE listing_id = p_listing_id;

        IF v_stock_available >= v_listing.stock_quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Item out of stock'
            );
        END IF;
    END IF;

    -- Deduct RP from user
    UPDATE public.user_xp
    SET 
        reward_points = reward_points - v_listing.rp_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record RP transaction
    INSERT INTO public.reward_points_transactions (
        user_id,
        points_amount,
        transaction_type,
        source_id,
        description
    ) VALUES (
        p_user_id,
        -v_listing.rp_cost,
        'spent',
        p_listing_id,
        'Purchased: ' || v_listing.title
    );

    -- Record purchase
    INSERT INTO public.rp_shop_purchases (
        user_id,
        listing_id,
        rp_cost,
        item_type,
        item_value,
        purchase_data
    ) VALUES (
        p_user_id,
        p_listing_id,
        v_listing.rp_cost,
        v_listing.item_type,
        v_listing.item_value,
        jsonb_build_object(
            'title', v_listing.title,
            'description', v_listing.description
        )
    );

    -- Apply item benefits based on type
    IF v_listing.item_type = 'token_bonus' AND v_listing.item_value IS NOT NULL THEN
        -- Add tokens to user balance
        UPDATE public.user_balances
        SET tokens = tokens + v_listing.item_value
        WHERE user_id = p_user_id;
        
        -- Create balance record if doesn't exist
        IF NOT FOUND THEN
            INSERT INTO public.user_balances (user_id, tokens)
            VALUES (p_user_id, v_listing.item_value)
            ON CONFLICT (user_id) DO UPDATE SET tokens = user_balances.tokens + v_listing.item_value;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', (SELECT id FROM public.rp_shop_purchases WHERE user_id = p_user_id AND listing_id = p_listing_id ORDER BY created_at DESC LIMIT 1),
        'remaining_rp', v_user_rp - v_listing.rp_cost,
        'item_type', v_listing.item_type,
        'item_value', v_listing.item_value
    );
END;
$$;

-- Function to get available RP shop listings
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
    -- Get user's RP balance
    SELECT COALESCE(reward_points, 0) INTO v_user_rp
    FROM public.user_xp
    WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.rp_cost,
        l.item_type,
        l.item_value,
        l.image_url,
        l.stock_quantity,
        l.purchase_limit_per_user,
        CASE 
            WHEN v_user_rp >= l.rp_cost THEN true
            ELSE false
        END as can_purchase,
        COALESCE((
            SELECT COUNT(*) 
            FROM public.rp_shop_purchases 
            WHERE user_id = p_user_id AND listing_id = l.id
        ), 0) as purchase_count,
        CASE 
            WHEN l.stock_quantity IS NULL THEN NULL
            ELSE GREATEST(0, l.stock_quantity - COALESCE((
                SELECT COUNT(*) 
                FROM public.rp_shop_purchases 
                WHERE listing_id = l.id
            ), 0))
        END as stock_remaining
    FROM public.rp_shop_listings l
    WHERE l.is_active = true
    ORDER BY l.sort_order, l.created_at DESC;
END;
$$;

-- Function to get user's purchase history
CREATE OR REPLACE FUNCTION public.get_user_rp_purchases(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    listing_id UUID,
    title TEXT,
    description TEXT,
    rp_cost INTEGER,
    item_type TEXT,
    item_value INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.listing_id,
        l.title,
        l.description,
        p.rp_cost,
        p.item_type,
        p.item_value,
        p.created_at
    FROM public.rp_shop_purchases p
    JOIN public.rp_shop_listings l ON p.listing_id = l.id
    WHERE p.user_id = p_user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.rp_shop_listings TO authenticated, anon;
GRANT SELECT, INSERT ON public.rp_shop_purchases TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_rp_shop_item(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rp_shop_listings(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_rp_purchases(UUID) TO authenticated;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE public.rp_shop_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_shop_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active RP shop listings" ON public.rp_shop_listings;
DROP POLICY IF EXISTS "Admins can manage RP shop listings" ON public.rp_shop_listings;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.rp_shop_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.rp_shop_purchases;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active RP shop listings" ON public.rp_shop_listings
    FOR SELECT USING (is_active = true);

-- Admins can manage listings (insert, update, delete)
CREATE POLICY "Admins can manage RP shop listings" ON public.rp_shop_listings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON public.rp_shop_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert purchases (via function)
CREATE POLICY "Users can insert own purchases" ON public.rp_shop_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. SAMPLE DATA (Optional - can be removed)
-- ============================================================================

-- Insert sample listings (only if table is empty and admin user exists)
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Check if table is empty
    IF NOT EXISTS (SELECT 1 FROM public.rp_shop_listings LIMIT 1) THEN
        -- Try to get admin user first
        SELECT id INTO v_admin_id 
        FROM public.users 
        WHERE role = 'admin' 
        LIMIT 1;
        
        -- If no admin, try to get any user
        IF v_admin_id IS NULL THEN
            SELECT id INTO v_admin_id 
            FROM public.users 
            LIMIT 1;
        END IF;
        
        -- Only insert if we found a user
        IF v_admin_id IS NOT NULL THEN
            INSERT INTO public.rp_shop_listings (
                created_by,
                title,
                description,
                rp_cost,
                item_type,
                item_value,
                is_active,
                sort_order
            ) VALUES
            (
                v_admin_id,
                'Token Bonus Pack',
                'Get 50 bonus tokens!',
                100,
                'token_bonus',
                50,
                true,
                1
            ),
            (
                v_admin_id,
                'Premium Badge',
                'Show off your dedication with this exclusive badge',
                250,
                'badge',
                NULL,
                true,
                2
            ),
            (
                v_admin_id,
                'Score Boost',
                'Double your score for your next 5 games',
                150,
                'boost',
                2,
                true,
                3
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RP SHOP SYSTEM CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '   - rp_shop_listings (admin-managed items)';
    RAISE NOTICE '   - rp_shop_purchases (purchase history)';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ Functions created:';
    RAISE NOTICE '   - purchase_rp_shop_item() - Purchase items with RP';
    RAISE NOTICE '   - get_rp_shop_listings() - Get available listings';
    RAISE NOTICE '   - get_user_rp_purchases() - Get user purchase history';
    RAISE NOTICE '';
END $$;

SELECT '✅ RP Shop System Created Successfully!' as status;

