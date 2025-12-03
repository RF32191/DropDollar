-- ============================================================================
-- CREATE MARKETPLACE LISTING RPC FUNCTION
-- ============================================================================
-- This function is called by the frontend to create marketplace listings
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_marketplace_listing(text, text, text, numeric, text, boolean, text, integer);

-- Create the RPC function
CREATE OR REPLACE FUNCTION create_marketplace_listing(
    title_param text,
    description_param text,
    category_param text,
    base_price_param numeric,
    game_type_param text,
    shipping_included_param boolean DEFAULT true,
    seller_contact_param text DEFAULT NULL,
    timer_duration_param integer DEFAULT 7200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_username text;
    v_listing_id uuid;
    v_rng_seed integer;
BEGIN
    -- Get the authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get username
    SELECT username INTO v_username 
    FROM public.users 
    WHERE id = v_user_id;
    
    IF v_username IS NULL THEN
        v_username := 'Unknown Seller';
    END IF;
    
    -- Generate RNG seed for fair gaming
    v_rng_seed := floor(random() * 1000000 + 1)::integer;
    
    -- Insert the listing
    INSERT INTO public.marketplace_listings (
        seller_id,
        seller_username,
        title,
        description,
        category,
        base_price,
        game_type,
        shipping_included,
        seller_contact,
        timer_duration,
        rng_seed,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_username,
        title_param,
        description_param,
        category_param,
        base_price_param,
        game_type_param,
        shipping_included_param,
        seller_contact_param,
        timer_duration_param,
        v_rng_seed,
        'active',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_listing_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'listing_id', v_listing_id,
        'seller_id', v_user_id,
        'rng_seed', v_rng_seed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_marketplace_listing TO authenticated;

-- Test it
SELECT '✅ create_marketplace_listing function created!' as status;

-- Check if marketplace_listings table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'marketplace_listings'
        )
        THEN '✅ marketplace_listings table exists'
        ELSE '❌ marketplace_listings table DOES NOT EXIST - create it first!'
    END as table_status;

