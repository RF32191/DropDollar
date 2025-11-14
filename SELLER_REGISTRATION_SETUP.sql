-- ============================================================================
-- SELLER REGISTRATION SYSTEM
-- Users must register as sellers before creating marketplace listings
-- ============================================================================

-- Drop existing table if any
DROP TABLE IF EXISTS public.seller_profiles CASCADE;

-- ============================================================================
-- TABLE: seller_profiles
-- Stores seller registration information
-- ============================================================================
CREATE TABLE public.seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Seller Information
    business_name TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_seller_profiles_user ON public.seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_status ON public.seller_profiles(status);

-- RLS Policies
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own seller profile
CREATE POLICY "Users can view their own seller profile"
    ON public.seller_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own seller profile
CREATE POLICY "Users can create seller profile"
    ON public.seller_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own seller profile
CREATE POLICY "Users can update their own seller profile"
    ON public.seller_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: register_as_seller
-- Users register to become sellers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_as_seller(
    business_name_param TEXT DEFAULT NULL,
    contact_email_param TEXT,
    contact_phone_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if already registered
    IF EXISTS(SELECT 1 FROM public.seller_profiles WHERE user_id = v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already registered as seller');
    END IF;
    
    -- Create seller profile (auto-approved for now)
    INSERT INTO public.seller_profiles (
        user_id,
        business_name,
        contact_email,
        contact_phone,
        status,
        verified,
        verification_date
    ) VALUES (
        v_user_id,
        business_name_param,
        contact_email_param,
        contact_phone_param,
        'approved', -- Auto-approve for now
        true,
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully registered as seller'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_as_seller(TEXT, TEXT, TEXT) TO authenticated, anon;

-- ============================================================================
-- FUNCTION: check_seller_status
-- Check if user is a registered seller
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_seller_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('is_seller', false, 'status', 'not_authenticated');
    END IF;
    
    SELECT * INTO v_seller
    FROM public.seller_profiles
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('is_seller', false, 'status', 'not_registered');
    END IF;
    
    RETURN jsonb_build_object(
        'is_seller', true,
        'status', v_seller.status,
        'verified', v_seller.verified,
        'business_name', v_seller.business_name,
        'contact_email', v_seller.contact_email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('is_seller', false, 'status', 'error', 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_seller_status() TO authenticated, anon;

-- ============================================================================
-- Update create_marketplace_listing to require seller registration
-- ============================================================================
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
        timer_duration
    ) VALUES (
        v_listing_id,
        0,
        0,
        'waiting',
        v_rng_seed,
        7200 -- 2 hours
    ) RETURNING id INTO v_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing created successfully',
        'listing_id', v_listing_id,
        'session_id', v_session_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
✅ SELLER REGISTRATION SETUP COMPLETE!

Tables Created:
- seller_profiles (seller registration data)

Functions Created:
- register_as_seller() - Register as a seller
- check_seller_status() - Check seller registration
- create_marketplace_listing() - Updated with seller check

Features:
✅ Seller registration required before creating listings
✅ Auto-approved for now (can add manual approval later)
✅ RLS policies for security
✅ Status tracking (pending/approved/suspended)

Ready to use! 🚀
' as status;

