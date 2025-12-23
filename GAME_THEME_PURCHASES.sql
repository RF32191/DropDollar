-- GAME_THEME_PURCHASES.sql
-- Create table for tracking game theme AND site theme purchases (Halloween, Christmas, etc.)
-- Price: 1500 RP per game theme, 2000 RP per site-wide theme

-- ========================================
-- STEP 1: Create game_theme_purchases table
-- ========================================
CREATE TABLE IF NOT EXISTS public.game_theme_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    theme_id TEXT NOT NULL, -- 'halloween', 'christmas', 'standard' (standard is always free)
    rp_cost INTEGER NOT NULL DEFAULT 1500,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate purchases
    UNIQUE(user_id, game_id, theme_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_theme_purchases_user ON public.game_theme_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_purchases_game ON public.game_theme_purchases(game_id, theme_id);

-- ========================================
-- STEP 2: Enable RLS
-- ========================================
ALTER TABLE public.game_theme_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view own theme purchases" ON public.game_theme_purchases;
DROP POLICY IF EXISTS "Authenticated users can purchase themes" ON public.game_theme_purchases;

-- Users can view their own purchases
CREATE POLICY "Users can view own theme purchases"
ON public.game_theme_purchases FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert (via RPC function)
CREATE POLICY "Authenticated users can purchase themes"
ON public.game_theme_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STEP 3: Create purchase function
-- ========================================
CREATE OR REPLACE FUNCTION purchase_game_theme(
    p_game_id TEXT,
    p_theme_id TEXT,
    p_rp_cost INTEGER DEFAULT 1500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_rp INTEGER;
    v_purchase_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Standard theme is always free
    IF p_theme_id = 'standard' THEN
        RETURN json_build_object('success', true, 'message', 'Standard theme is free');
    END IF;
    
    -- Check if already purchased
    IF EXISTS (
        SELECT 1 FROM public.game_theme_purchases
        WHERE user_id = v_user_id AND game_id = p_game_id AND theme_id = p_theme_id
    ) THEN
        RETURN json_build_object('success', true, 'message', 'Theme already purchased');
    END IF;
    
    -- Get current RP balance
    SELECT COALESCE(reward_points, 0) INTO v_current_rp
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    IF v_current_rp IS NULL OR v_current_rp < p_rp_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient RP',
            'required', p_rp_cost,
            'current', COALESCE(v_current_rp, 0)
        );
    END IF;
    
    -- Deduct RP
    UPDATE public.user_xp
    SET reward_points = reward_points - p_rp_cost,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Record purchase
    INSERT INTO public.game_theme_purchases (user_id, game_id, theme_id, rp_cost)
    VALUES (v_user_id, p_game_id, p_theme_id, p_rp_cost)
    RETURNING id INTO v_purchase_id;
    
    -- Log transaction
    INSERT INTO public.xp_transactions (user_id, amount, transaction_type, description)
    VALUES (v_user_id, -p_rp_cost, 'theme_purchase', 'Purchased ' || p_theme_id || ' theme for ' || p_game_id);
    
    RETURN json_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'game_id', p_game_id,
        'theme_id', p_theme_id,
        'rp_spent', p_rp_cost
    );
END;
$$;

-- ========================================
-- STEP 4: Create check function
-- ========================================
CREATE OR REPLACE FUNCTION check_theme_ownership(
    p_game_id TEXT,
    p_theme_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Standard theme is always available
    IF p_theme_id = 'standard' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user owns this theme
    RETURN EXISTS (
        SELECT 1 FROM public.game_theme_purchases
        WHERE user_id = v_user_id AND game_id = p_game_id AND theme_id = p_theme_id
    );
END;
$$;

-- ========================================
-- STEP 5: Get all user's purchased themes
-- ========================================
CREATE OR REPLACE FUNCTION get_user_theme_purchases()
RETURNS TABLE (
    game_id TEXT,
    theme_id TEXT,
    purchased_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT gtp.game_id, gtp.theme_id, gtp.purchased_at
    FROM public.game_theme_purchases gtp
    WHERE gtp.user_id = auth.uid()
    ORDER BY gtp.purchased_at DESC;
END;
$$;

-- ========================================
-- STEP 6: Grant permissions
-- ========================================
GRANT EXECUTE ON FUNCTION purchase_game_theme TO authenticated;
GRANT EXECUTE ON FUNCTION check_theme_ownership TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_theme_purchases TO authenticated;

-- ========================================
-- STEP 7: Define available themes
-- ========================================
-- This is just documentation - the actual themes are:
-- Games with themes: 
--   laser-dodge, blade-bounce, dead-shot, lightning-maze, 
--   flippy-coin, parry-pro, click-draw, cash-stack, 
--   penny-passer, neon-striker, falling-objects, quick-click
-- 
-- Available themes:
--   standard (FREE)
--   halloween (1500 RP)
--   christmas (1500 RP)

-- ========================================
-- STEP 8: Create site_theme_purchases table
-- For dashboard/page-wide themes
-- ========================================
CREATE TABLE IF NOT EXISTS public.site_theme_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_id TEXT NOT NULL, -- 'halloween', 'christmas', 'default' (default is always free)
    rp_cost INTEGER NOT NULL DEFAULT 2000,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate purchases
    UNIQUE(user_id, theme_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_site_theme_user ON public.site_theme_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_site_theme_id ON public.site_theme_purchases(theme_id);

-- Enable RLS
ALTER TABLE public.site_theme_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view own site theme purchases" ON public.site_theme_purchases;
DROP POLICY IF EXISTS "Authenticated users can purchase site themes" ON public.site_theme_purchases;

-- Users can view their own purchases
CREATE POLICY "Users can view own site theme purchases"
ON public.site_theme_purchases FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can purchase site themes"
ON public.site_theme_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STEP 9: Create site theme purchase function
-- ========================================
CREATE OR REPLACE FUNCTION purchase_site_theme(
    p_theme_id TEXT,
    p_rp_cost INTEGER DEFAULT 2000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_rp INTEGER;
    v_purchase_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Default theme is always free
    IF p_theme_id = 'default' THEN
        RETURN json_build_object('success', true, 'message', 'Default theme is free');
    END IF;
    
    -- Check if already purchased
    IF EXISTS (
        SELECT 1 FROM public.site_theme_purchases
        WHERE user_id = v_user_id AND theme_id = p_theme_id
    ) THEN
        RETURN json_build_object('success', true, 'message', 'Theme already purchased');
    END IF;
    
    -- Get current RP balance
    SELECT COALESCE(reward_points, 0) INTO v_current_rp
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    IF v_current_rp IS NULL OR v_current_rp < p_rp_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient RP',
            'required', p_rp_cost,
            'current', COALESCE(v_current_rp, 0)
        );
    END IF;
    
    -- Deduct RP
    UPDATE public.user_xp
    SET reward_points = reward_points - p_rp_cost,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Record purchase
    INSERT INTO public.site_theme_purchases (user_id, theme_id, rp_cost)
    VALUES (v_user_id, p_theme_id, p_rp_cost)
    RETURNING id INTO v_purchase_id;
    
    -- Log transaction
    INSERT INTO public.xp_transactions (user_id, amount, transaction_type, description)
    VALUES (v_user_id, -p_rp_cost, 'site_theme_purchase', 'Purchased ' || p_theme_id || ' site theme');
    
    RETURN json_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'theme_id', p_theme_id,
        'rp_spent', p_rp_cost
    );
END;
$$;

-- ========================================
-- STEP 10: Check site theme ownership
-- ========================================
CREATE OR REPLACE FUNCTION check_site_theme_ownership(
    p_theme_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Default theme is always available
    IF p_theme_id = 'default' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user owns this theme
    RETURN EXISTS (
        SELECT 1 FROM public.site_theme_purchases
        WHERE user_id = v_user_id AND theme_id = p_theme_id
    );
END;
$$;

-- ========================================
-- STEP 11: Get user's site theme purchases
-- ========================================
CREATE OR REPLACE FUNCTION get_user_site_theme_purchases()
RETURNS TABLE (
    theme_id TEXT,
    purchased_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT stp.theme_id, stp.purchased_at
    FROM public.site_theme_purchases stp
    WHERE stp.user_id = auth.uid()
    ORDER BY stp.purchased_at DESC;
END;
$$;

-- Grant permissions for site theme functions
GRANT EXECUTE ON FUNCTION purchase_site_theme TO authenticated;
GRANT EXECUTE ON FUNCTION check_site_theme_ownership TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_site_theme_purchases TO authenticated;

-- ========================================
-- STEP 12: Get ALL user's theme purchases (combined)
-- ========================================
CREATE OR REPLACE FUNCTION get_all_user_purchases()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_game_purchases JSON;
    v_site_purchases JSON;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get game theme purchases
    SELECT COALESCE(json_agg(json_build_object(
        'type', 'game',
        'game_id', game_id,
        'theme_id', theme_id,
        'rp_cost', rp_cost,
        'purchased_at', purchased_at
    )), '[]'::json)
    INTO v_game_purchases
    FROM public.game_theme_purchases
    WHERE user_id = v_user_id;
    
    -- Get site theme purchases
    SELECT COALESCE(json_agg(json_build_object(
        'type', 'site',
        'theme_id', theme_id,
        'rp_cost', rp_cost,
        'purchased_at', purchased_at
    )), '[]'::json)
    INTO v_site_purchases
    FROM public.site_theme_purchases
    WHERE user_id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'game_themes', v_game_purchases,
        'site_themes', v_site_purchases,
        'total_game_purchases', (SELECT COUNT(*) FROM public.game_theme_purchases WHERE user_id = v_user_id),
        'total_site_purchases', (SELECT COUNT(*) FROM public.site_theme_purchases WHERE user_id = v_user_id)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_user_purchases TO authenticated;

-- ========================================
-- STEP 13: Restore purchases (admin function)
-- In case purchases need to be restored
-- ========================================
CREATE OR REPLACE FUNCTION restore_theme_purchase(
    p_user_id UUID,
    p_game_id TEXT,
    p_theme_id TEXT,
    p_is_site_theme BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_is_site_theme THEN
        INSERT INTO public.site_theme_purchases (user_id, theme_id, rp_cost)
        VALUES (p_user_id, p_theme_id, 0) -- 0 cost for restored purchases
        ON CONFLICT (user_id, theme_id) DO NOTHING;
    ELSE
        INSERT INTO public.game_theme_purchases (user_id, game_id, theme_id, rp_cost)
        VALUES (p_user_id, p_game_id, p_theme_id, 0) -- 0 cost for restored purchases
        ON CONFLICT (user_id, game_id, theme_id) DO NOTHING;
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Purchase restored');
END;
$$;

-- Only service role can restore purchases
GRANT EXECUTE ON FUNCTION restore_theme_purchase TO service_role;

-- ========================================
-- VERIFICATION
-- ========================================
SELECT '✅ Game theme purchases system created!' as result;
SELECT '✅ Site theme purchases system created!' as result2;
SELECT '✅ All purchases are backed up to Supabase!' as backup_status;
SELECT 'Game themes: 1500 RP each. Site themes: 2000 RP each. Default/Standard is always free.' as info;
SELECT 'Run purchase_game_theme(game_id, theme_id) to buy game themes.' as usage1;
SELECT 'Run purchase_site_theme(theme_id) to buy site-wide themes.' as usage2;
SELECT 'Run get_all_user_purchases() to view all your purchased themes.' as usage3;

-- ========================================
-- DATA VERIFICATION QUERIES (run manually)
-- ========================================
-- To check all game theme purchases:
-- SELECT * FROM public.game_theme_purchases ORDER BY purchased_at DESC;

-- To check all site theme purchases:
-- SELECT * FROM public.site_theme_purchases ORDER BY purchased_at DESC;

-- To check a specific user's purchases:
-- SELECT * FROM public.game_theme_purchases WHERE user_id = 'USER_ID_HERE';
-- SELECT * FROM public.site_theme_purchases WHERE user_id = 'USER_ID_HERE';

