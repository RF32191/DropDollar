-- Fix theme purchase functions - Remove transaction logging that causes errors
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Fix game theme purchase function
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
    v_existing_purchase UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if already purchased
    SELECT id INTO v_existing_purchase
    FROM public.game_theme_purchases
    WHERE user_id = v_user_id AND game_id = p_game_id AND theme_id = p_theme_id;
    
    IF v_existing_purchase IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Theme already purchased');
    END IF;
    
    -- Check RP balance
    SELECT reward_points INTO v_current_rp
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    IF v_current_rp IS NULL OR v_current_rp < p_rp_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient RP',
            'current_rp', COALESCE(v_current_rp, 0),
            'required_rp', p_rp_cost
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
    
    -- Return success (no transaction logging to avoid column errors)
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
-- STEP 2: Fix site theme purchase function
-- ========================================
CREATE OR REPLACE FUNCTION purchase_site_theme(
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
    v_existing_purchase UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if already purchased
    SELECT id INTO v_existing_purchase
    FROM public.site_theme_purchases
    WHERE user_id = v_user_id AND theme_id = p_theme_id;
    
    IF v_existing_purchase IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Theme already purchased');
    END IF;
    
    -- Check RP balance
    SELECT reward_points INTO v_current_rp
    FROM public.user_xp
    WHERE user_id = v_user_id;
    
    IF v_current_rp IS NULL OR v_current_rp < p_rp_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient RP',
            'current_rp', COALESCE(v_current_rp, 0),
            'required_rp', p_rp_cost
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
    
    -- Return success (no transaction logging to avoid column errors)
    RETURN json_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'theme_id', p_theme_id,
        'rp_spent', p_rp_cost
    );
END;
$$;

-- ========================================
-- STEP 3: Add Game Theme listings to RP Shop
-- ========================================

-- First check if rp_shop_listings table exists and add theme listings
DO $$
DECLARE
    games TEXT[] := ARRAY[
        'laser-dodge', 'blade-bounce', 'cash-stack', 'dead-shot', 
        'flippy-coin', 'parry-pro', 'lightning-maze', 'neon-striker',
        'penny-passer', 'quick-click', 'click-draw'
    ];
    game_names TEXT[] := ARRAY[
        'Laser Dodge', 'Blade Bounce', 'Cash Stack', 'Dead Shot',
        'Flippy Coin', 'Parry Pro', 'Lightning Maze', 'Neon Striker',
        'Penny Passer', 'Quick Click', 'Click Draw'
    ];
    themes TEXT[] := ARRAY['halloween', 'christmas'];
    theme_names TEXT[] := ARRAY['🎃 Halloween', '🎄 Christmas'];
    i INTEGER;
    j INTEGER;
    listing_id TEXT;
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rp_shop_listings') THEN
        -- Add game theme listings
        FOR i IN 1..array_length(games, 1) LOOP
            FOR j IN 1..array_length(themes, 1) LOOP
                listing_id := games[i] || '-' || themes[j] || '-theme';
                
                -- Insert or update listing
                INSERT INTO public.rp_shop_listings (
                    id, title, description, rp_cost, item_type, 
                    is_active, stock_remaining, purchase_limit_per_user
                )
                VALUES (
                    listing_id,
                    theme_names[j] || ' Theme - ' || game_names[i],
                    'Unlock the ' || theme_names[j] || ' theme for ' || game_names[i] || '! Changes visuals, music, and effects.',
                    1500,
                    'game_theme',
                    true,
                    NULL, -- Unlimited stock
                    1 -- Can only buy once
                )
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    rp_cost = EXCLUDED.rp_cost,
                    is_active = EXCLUDED.is_active;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '✅ Added game theme listings to RP Shop';
    ELSE
        RAISE NOTICE '⚠️ rp_shop_listings table does not exist - skipping shop listings';
    END IF;
END $$;

-- ========================================
-- STEP 4: Verify functions work
-- ========================================
SELECT 'Theme purchase functions updated successfully!' as status;

-- Show all game theme listings
SELECT id, title, rp_cost, item_type 
FROM rp_shop_listings 
WHERE item_type = 'game_theme' 
ORDER BY title;

