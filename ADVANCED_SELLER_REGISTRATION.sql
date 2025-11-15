-- ============================================================================
-- ADVANCED SELLER REGISTRATION (Etsy-Style)
-- Multi-step registration with comprehensive business details
-- ============================================================================

-- ============================================================================
-- DROP EXISTING SELLER TABLE (We'll recreate with more fields)
-- ============================================================================
DROP TABLE IF EXISTS public.seller_profiles CASCADE;

-- ============================================================================
-- TABLE: seller_profiles (ENHANCED)
-- Comprehensive seller information similar to Etsy
-- ============================================================================
CREATE TABLE public.seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- STEP 1: Shop Information
    shop_name TEXT NOT NULL UNIQUE,
    shop_description TEXT,
    shop_tagline TEXT,
    shop_logo_url TEXT,
    shop_banner_url TEXT,
    
    -- STEP 2: Business Details
    business_type TEXT CHECK (business_type IN ('individual', 'sole_proprietorship', 'partnership', 'llc', 'corporation', 'non_profit')),
    business_name TEXT,
    business_registration_number TEXT,
    tax_id TEXT, -- EIN or SSN (encrypted in production)
    
    -- STEP 3: Contact Information
    contact_email TEXT,
    contact_phone TEXT,
    business_address_line1 TEXT,
    business_address_line2 TEXT,
    business_city TEXT,
    business_state TEXT,
    business_postal_code TEXT,
    business_country TEXT DEFAULT 'US',
    
    -- STEP 4: Banking & Payment
    bank_account_holder_name TEXT,
    bank_name TEXT,
    bank_account_type TEXT CHECK (bank_account_type IN ('checking', 'savings')),
    bank_routing_number TEXT,
    bank_account_last4 TEXT, -- Only store last 4 digits
    preferred_payout_method TEXT DEFAULT 'bank_transfer' CHECK (preferred_payout_method IN ('bank_transfer', 'paypal', 'crypto')),
    paypal_email TEXT,
    crypto_wallet_address TEXT,
    
    -- STEP 5: Shipping & Policies
    ships_from_location TEXT,
    shipping_countries TEXT[], -- Array of country codes
    processing_time_min INTEGER DEFAULT 1, -- in business days
    processing_time_max INTEGER DEFAULT 3,
    return_policy TEXT,
    refund_policy TEXT,
    shipping_policy TEXT,
    privacy_policy TEXT,
    
    -- STEP 6: Shop Preferences
    shop_language TEXT DEFAULT 'en',
    shop_currency TEXT DEFAULT 'USD',
    auto_renew_listings BOOLEAN DEFAULT true,
    vacation_mode BOOLEAN DEFAULT false,
    vacation_message TEXT,
    
    -- STEP 7: Legal & Verification
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    privacy_accepted BOOLEAN DEFAULT false,
    privacy_accepted_at TIMESTAMPTZ,
    seller_agreement_accepted BOOLEAN DEFAULT false,
    seller_agreement_accepted_at TIMESTAMPTZ,
    
    -- Identity Verification
    identity_verified BOOLEAN DEFAULT false,
    identity_verification_method TEXT, -- 'phone', 'email', 'document'
    identity_verified_at TIMESTAMPTZ,
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    
    -- Admin Approval
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected', 'needs_revision')),
    verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Registration Progress
    registration_step INTEGER DEFAULT 1, -- Track which step user is on
    registration_completed BOOLEAN DEFAULT false,
    
    -- Performance Metrics
    total_sales NUMERIC DEFAULT 0,
    total_listings INTEGER DEFAULT 0,
    rating_average NUMERIC DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_shop_name ON public.seller_profiles(shop_name);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON public.seller_profiles(status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verified ON public.seller_profiles(verified);

-- ============================================================================
-- TABLE: seller_documents (For identity verification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    
    document_type TEXT NOT NULL CHECK (document_type IN ('government_id', 'business_license', 'tax_document', 'utility_bill', 'other')),
    document_url TEXT NOT NULL, -- S3/Supabase storage URL
    document_status TEXT DEFAULT 'pending' CHECK (document_status IN ('pending', 'approved', 'rejected')),
    
    admin_reviewed_by UUID REFERENCES public.admin_profiles(id),
    admin_notes TEXT,
    
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_seller_documents_seller_id ON public.seller_documents(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_documents_status ON public.seller_documents(document_status);

-- ============================================================================
-- TABLE: seller_reviews (Customer reviews for sellers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- Review categories
    item_as_described_rating INTEGER CHECK (item_as_described_rating >= 1 AND item_as_described_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    shipping_speed_rating INTEGER CHECK (shipping_speed_rating >= 1 AND shipping_speed_rating <= 5),
    
    seller_response TEXT,
    seller_response_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_id ON public.seller_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_reviewer ON public.seller_reviews(reviewer_user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- Sellers can view/update their own profile
CREATE POLICY "Sellers can view their own profile"
    ON public.seller_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own profile"
    ON public.seller_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can view approved sellers
CREATE POLICY "Users can view approved sellers"
    ON public.seller_profiles FOR SELECT
    USING (status = 'approved' AND verified = true);

-- Sellers can manage their documents
CREATE POLICY "Sellers can view their own documents"
    ON public.seller_documents FOR SELECT
    USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Sellers can upload documents"
    ON public.seller_documents FOR INSERT
    WITH CHECK (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- Anyone can view seller reviews
CREATE POLICY "Anyone can view seller reviews"
    ON public.seller_reviews FOR SELECT
    USING (true);

-- ============================================================================
-- FUNCTION: start_seller_registration (Step 1)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.start_seller_registration(
    shop_name_param TEXT,
    shop_description_param TEXT DEFAULT NULL,
    shop_tagline_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_seller_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if already registered
    IF EXISTS(SELECT 1 FROM public.seller_profiles WHERE user_id = v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already registered as seller');
    END IF;
    
    -- Check if shop name is taken
    IF EXISTS(SELECT 1 FROM public.seller_profiles WHERE shop_name = shop_name_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Shop name already taken');
    END IF;
    
    -- Create initial seller profile
    INSERT INTO public.seller_profiles (
        user_id,
        shop_name,
        shop_description,
        shop_tagline,
        registration_step,
        status
    ) VALUES (
        v_user_id,
        shop_name_param,
        shop_description_param,
        shop_tagline_param,
        1,
        'pending'
    ) RETURNING id INTO v_seller_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'seller_id', v_seller_id,
        'current_step', 1,
        'message', 'Shop created! Continue to Step 2.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step2 (Business Details)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step2(
    business_type_param TEXT,
    business_name_param TEXT DEFAULT NULL,
    tax_id_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        business_type = business_type_param,
        business_name = business_name_param,
        tax_id = tax_id_param,
        registration_step = 2,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object('success', true, 'current_step', 2, 'message', 'Business details saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step3 (Contact Information)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step3(
    contact_email_param TEXT,
    contact_phone_param TEXT,
    address_line1_param TEXT,
    city_param TEXT,
    state_param TEXT,
    postal_code_param TEXT,
    address_line2_param TEXT DEFAULT NULL,
    country_param TEXT DEFAULT 'US'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        contact_email = contact_email_param,
        contact_phone = contact_phone_param,
        business_address_line1 = address_line1_param,
        business_address_line2 = address_line2_param,
        business_city = city_param,
        business_state = state_param,
        business_postal_code = postal_code_param,
        business_country = country_param,
        registration_step = 3,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object('success', true, 'current_step', 3, 'message', 'Contact information saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step4 (Banking & Payment)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step4(
    payout_method_param TEXT,
    bank_holder_name_param TEXT DEFAULT NULL,
    bank_name_param TEXT DEFAULT NULL,
    bank_account_type_param TEXT DEFAULT NULL,
    bank_routing_param TEXT DEFAULT NULL,
    bank_last4_param TEXT DEFAULT NULL,
    paypal_email_param TEXT DEFAULT NULL,
    crypto_wallet_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        preferred_payout_method = payout_method_param,
        bank_account_holder_name = bank_holder_name_param,
        bank_name = bank_name_param,
        bank_account_type = bank_account_type_param,
        bank_routing_number = bank_routing_param,
        bank_account_last4 = bank_last4_param,
        paypal_email = paypal_email_param,
        crypto_wallet_address = crypto_wallet_param,
        registration_step = 4,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object('success', true, 'current_step', 4, 'message', 'Payment information saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: update_seller_registration_step5 (Shipping & Policies)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_registration_step5(
    ships_from_param TEXT,
    shipping_countries_param TEXT[],
    processing_min_param INTEGER DEFAULT 1,
    processing_max_param INTEGER DEFAULT 3,
    return_policy_param TEXT DEFAULT NULL,
    shipping_policy_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        ships_from_location = ships_from_param,
        shipping_countries = shipping_countries_param,
        processing_time_min = processing_min_param,
        processing_time_max = processing_max_param,
        return_policy = return_policy_param,
        shipping_policy = shipping_policy_param,
        registration_step = 5,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object('success', true, 'current_step', 5, 'message', 'Shipping & policies saved!');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: complete_seller_registration (Step 6 - Final)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_seller_registration(
    terms_accepted_param BOOLEAN,
    privacy_accepted_param BOOLEAN,
    seller_agreement_accepted_param BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_seller_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    IF NOT (terms_accepted_param AND privacy_accepted_param AND seller_agreement_accepted_param) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must accept all agreements to continue');
    END IF;
    
    UPDATE public.seller_profiles
    SET 
        terms_accepted = true,
        terms_accepted_at = NOW(),
        privacy_accepted = true,
        privacy_accepted_at = NOW(),
        seller_agreement_accepted = true,
        seller_agreement_accepted_at = NOW(),
        registration_step = 6,
        registration_completed = true,
        status = 'pending',
        updated_at = NOW()
    WHERE user_id = v_user_id
    RETURNING id INTO v_seller_id;
    
    -- Notify admins (trigger will handle this)
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Registration complete! Your application is being reviewed by our team.',
        'seller_id', v_seller_id,
        'status', 'pending'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: get_seller_registration_progress
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_seller_registration_progress()
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
        RETURN jsonb_build_object('registered', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT * INTO v_seller
    FROM public.seller_profiles
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('registered', false, 'current_step', 0);
    END IF;
    
    RETURN jsonb_build_object(
        'registered', true,
        'seller_id', v_seller.id,
        'current_step', v_seller.registration_step,
        'registration_completed', v_seller.registration_completed,
        'status', v_seller.status,
        'shop_name', v_seller.shop_name,
        'verified', v_seller.verified
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('registered', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- UPDATE: Admin notification trigger for new sellers
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_admin_new_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_record RECORD;
    v_username TEXT;
BEGIN
    -- Only notify when registration is completed
    IF NEW.registration_completed = true AND OLD.registration_completed = false THEN
        -- Get username
        SELECT username INTO v_username
        FROM public.users
        WHERE id = NEW.user_id;
        
        -- Create notifications for all admins with approval permission
        FOR v_admin_record IN 
            SELECT id FROM public.admin_profiles 
            WHERE can_approve_sellers = true AND is_active = true
        LOOP
            INSERT INTO public.admin_notifications (
                admin_id,
                type,
                title,
                message,
                severity,
                related_user_id,
                related_seller_id
            ) VALUES (
                v_admin_record.id,
                'seller_pending',
                'New Seller Registration Complete',
                'Shop "' || NEW.shop_name || '" (Owner: ' || COALESCE(v_username, 'Unknown') || ') has completed registration and needs approval.',
                'info',
                NEW.user_id,
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_seller_registration ON public.seller_profiles;

CREATE TRIGGER on_seller_registration
    AFTER INSERT OR UPDATE ON public.seller_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_new_seller();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.start_seller_registration(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step2(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step3(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step4(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_seller_registration_step5(TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_seller_registration(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_registration_progress() TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
✅ ADVANCED SELLER REGISTRATION SETUP COMPLETE!

New Tables:
- seller_profiles (ENHANCED with 50+ fields)
- seller_documents (identity verification)
- seller_reviews (customer feedback)

Registration Steps:
1️⃣ Shop Information (name, description, tagline)
2️⃣ Business Details (type, tax ID, registration)
3️⃣ Contact Information (address, phone, email)
4️⃣ Banking & Payment (bank, PayPal, crypto)
5️⃣ Shipping & Policies (countries, processing time)
6️⃣ Legal Agreements (terms, privacy, seller agreement)

Functions Created:
- start_seller_registration() - Step 1
- update_seller_registration_step2() - Business
- update_seller_registration_step3() - Contact
- update_seller_registration_step4() - Payment
- update_seller_registration_step5() - Shipping
- complete_seller_registration() - Final step
- get_seller_registration_progress() - Check status

Features:
✅ Multi-step wizard (like Etsy)
✅ Shop name uniqueness check
✅ Business type selection
✅ Multiple payout methods (bank, PayPal, crypto)
✅ Shipping policies
✅ Legal agreement tracking
✅ Admin approval workflow
✅ Identity verification support
✅ Seller reviews & ratings
✅ Performance metrics

Ready for frontend integration! 🚀
' as status;

