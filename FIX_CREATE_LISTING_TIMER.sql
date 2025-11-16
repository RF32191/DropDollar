-- ============================================================================
-- FIX CREATE_MARKETPLACE_LISTING TO USE 1-MINUTE TIMER
-- ============================================================================
-- The function was hardcoded to create sessions with 7200s (2 hours)
-- This updates it to use 60s (1 minute) for testing
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_marketplace_listing(TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION public.create_marketplace_listing(
    title_param TEXT,
    description_param TEXT,
    category_param TEXT,
    base_price_param NUMERIC,
    game_type_param TEXT,
    shipping_included_param BOOLEAN DEFAULT true,
    seller_contact_param TEXT DEFAULT NULL,
    image_urls_param JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_username TEXT;
    v_listing_id UUID;
    v_session_id UUID;
    v_rng_seed INTEGER;
    v_seller_status TEXT;
BEGIN
    -- Get authenticated user
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check seller registration
    SELECT status INTO v_seller_status
    FROM public.seller_profiles
    WHERE user_id = v_seller_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You must register as a seller before creating listings',
            'requires_registration', true
        );
    END IF;
    
    IF v_seller_status != 'approved' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Your seller account is ' || v_seller_status || '. Please contact support.'
        );
    END IF;
    
    -- Get seller username
    SELECT username INTO v_seller_username FROM public.users WHERE id = v_seller_id;
    
    -- Generate RNG seed for fair gaming
    v_rng_seed := floor(random() * 99999 + 1)::integer;
    
    -- Create listing
    INSERT INTO public.marketplace_listings (
        seller_id,
        title,
        description,
        category,
        base_price,
        game_type,
        shipping_included,
        seller_contact,
        seller_username,
        image_urls,
        status
    ) VALUES (
        v_seller_id,
        title_param,
        description_param,
        category_param,
        base_price_param,
        game_type_param,
        shipping_included_param,
        seller_contact_param,
        v_seller_username,
        image_urls_param,
        'active'
    ) RETURNING id INTO v_listing_id;
    
    -- Create initial session for this listing
    INSERT INTO public.marketplace_sessions (
        listing_id,
        prize_pool,
        participants_count,
        status,
        rng_seed,
        timer_duration,
        base_price
    ) VALUES (
        v_listing_id,
        0,
        0,
        'waiting',
        v_rng_seed,
        60, -- 1 MINUTE (changed from 7200)
        base_price_param
    ) RETURNING id INTO v_session_id;
    
    RAISE NOTICE '✅ Created listing % with 1-minute timer session %', v_listing_id, v_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing created successfully with 1-minute timer',
        'listing_id', v_listing_id,
        'session_id', v_session_id,
        'timer_duration', 60
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_listing(TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║     ✅ CREATE_MARKETPLACE_LISTING FIXED TO 1 MINUTE!           ║
╚════════════════════════════════════════════════════════════════╝

WHAT WAS FIXED:

❌ BEFORE:
Line 256: timer_duration = 7200  -- 2 hours (hardcoded)

✅ AFTER:
Line 104: timer_duration = 60    -- 1 minute (for testing)

NOW ALL NEW LISTINGS WILL:
✅ Create sessions with 60-second timer
✅ Start countdown when base price met
✅ Expire after 1 minute
✅ Perfect for rapid testing!

VERIFY:
1. Create a new listing
2. Join with tokens to meet base price
3. Timer should start at 60 seconds (1 minute)
4. After 1 minute, winner determined

If you want 2 hours back later, just change 60 → 7200
' as success_message;

