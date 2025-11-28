-- ============================================================================
-- ADD TIMER DURATION TO MARKETPLACE LISTINGS
-- ============================================================================

-- Step 1: Add timer_duration column to marketplace_listings
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 1800; -- 30 minutes default

-- Step 2: Add join_cutoff_seconds column (time before end when joins are blocked)
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS join_cutoff_seconds INTEGER DEFAULT 120; -- 2 minutes default

SELECT 'Step 1-2: Added timer columns' as status;

-- Step 3: Update create_marketplace_listing function to accept timer_duration
DROP FUNCTION IF EXISTS public.create_marketplace_listing(TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.create_marketplace_listing(TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.create_marketplace_listing(
    title_param TEXT,
    description_param TEXT,
    category_param TEXT,
    base_price_param NUMERIC,
    game_type_param TEXT,
    shipping_included_param BOOLEAN DEFAULT true,
    seller_contact_param TEXT DEFAULT NULL,
    timer_duration_param INTEGER DEFAULT 1800 -- 30 minutes in seconds
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
    v_listing_id UUID;
    v_session_id UUID;
    v_rng_seed INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if user is an active seller
    SELECT * INTO v_seller FROM seller_profiles 
    WHERE user_id = v_user_id AND status = 'active' AND verified = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be an approved seller to create listings');
    END IF;
    
    -- Validate timer_duration (min 3 minutes, max 24 hours)
    IF timer_duration_param < 180 THEN
        timer_duration_param := 180; -- Minimum 3 minutes
    END IF;
    IF timer_duration_param > 86400 THEN
        timer_duration_param := 86400; -- Maximum 24 hours
    END IF;
    
    -- Generate RNG seed for fair gameplay
    v_rng_seed := floor(random() * 2147483647)::INTEGER;
    
    -- Create the listing
    INSERT INTO marketplace_listings (
        seller_id,
        title,
        description,
        category,
        base_price,
        game_type,
        shipping_included,
        seller_contact,
        timer_duration,
        join_cutoff_seconds,
        status,
        rng_seed,
        created_at
    ) VALUES (
        v_seller.id,
        title_param,
        description_param,
        category_param,
        base_price_param,
        game_type_param,
        shipping_included_param,
        seller_contact_param,
        timer_duration_param,
        120, -- 2 minutes cutoff for joining
        'active',
        v_rng_seed,
        NOW()
    )
    RETURNING id INTO v_listing_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing created successfully!',
        'listing_id', v_listing_id,
        'timer_duration', timer_duration_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_listing(TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT, INTEGER) TO authenticated;

SELECT 'Step 3: create_marketplace_listing updated with timer' as status;

-- Step 4: Create function to check if joining is allowed
DROP FUNCTION IF EXISTS public.can_join_listing(UUID);

CREATE OR REPLACE FUNCTION public.can_join_listing(listing_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_listing RECORD;
    v_time_remaining INTEGER;
    v_can_join BOOLEAN;
BEGIN
    SELECT * INTO v_listing FROM marketplace_listings WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('can_join', false, 'reason', 'Listing not found');
    END IF;
    
    IF v_listing.status != 'active' THEN
        RETURN jsonb_build_object('can_join', false, 'reason', 'Listing is not active');
    END IF;
    
    -- If timer hasnt started yet, can join
    IF v_listing.timer_started_at IS NULL THEN
        RETURN jsonb_build_object('can_join', true, 'reason', 'Timer not started');
    END IF;
    
    -- Calculate time remaining
    v_time_remaining := v_listing.timer_duration - EXTRACT(EPOCH FROM (NOW() - v_listing.timer_started_at))::INTEGER;
    
    -- If less than cutoff time remaining, cannot join
    IF v_time_remaining <= COALESCE(v_listing.join_cutoff_seconds, 120) THEN
        RETURN jsonb_build_object(
            'can_join', false, 
            'reason', 'Joining closed - less than 2 minutes remaining',
            'time_remaining', v_time_remaining
        );
    END IF;
    
    RETURN jsonb_build_object(
        'can_join', true,
        'time_remaining', v_time_remaining
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_join_listing(UUID) TO authenticated, anon;

SELECT 'Step 4: can_join_listing function created' as status;

SELECT '
============================================
TIMER FEATURE ADDED!
============================================

Features:
- Sellers can set timer from 3 min to 24 hours
- Timer starts when base price is met
- Joining blocked in final 2 minutes
- Default timer: 30 minutes

Columns added:
- timer_duration (seconds)
- join_cutoff_seconds (default 120)

Functions:
- create_marketplace_listing (updated)
- can_join_listing (new)

============================================
' as done;

