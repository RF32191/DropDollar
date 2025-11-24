-- ============================================================================
-- FIX SELLER REGISTRATION - CORRECT FOREIGN KEY (auth.users)
-- ============================================================================
-- This fixes the foreign key to reference auth.users instead of public.users
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP AND RECREATE seller_profiles WITH CORRECT FOREIGN KEY
-- ============================================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.seller_profiles CASCADE;

-- Recreate with correct foreign key to auth.users (NOT public.users)
CREATE TABLE public.seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Shop Information
    shop_name TEXT,
    shop_description TEXT,
    shop_tagline TEXT,
    
    -- Business Information
    business_name TEXT,
    business_type TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Identity Verification
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,
    identity_verification_method VARCHAR(50),
    identity_verification_provider VARCHAR(50),
    
    -- Driver's License Information
    drivers_license_number VARCHAR(50), -- Last 4 digits only
    drivers_license_state VARCHAR(2), -- US state code
    drivers_license_expiry DATE,
    drivers_license_verified BOOLEAN DEFAULT false,
    drivers_license_verified_at TIMESTAMPTZ,
    
    -- Government ID
    government_id_type VARCHAR(50), -- 'drivers_license', 'passport', 'state_id'
    government_id_number VARCHAR(100), -- Last 4 digits only
    date_of_birth DATE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_seller_profiles_user_id ON public.seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_status ON public.seller_profiles(status);
CREATE INDEX idx_seller_profiles_identity_verified ON public.seller_profiles(identity_verified);
CREATE INDEX idx_seller_profiles_drivers_license_verified ON public.seller_profiles(drivers_license_verified);

-- Enable RLS
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can view own seller profile"
    ON public.seller_profiles FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can insert own seller profile"
    ON public.seller_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can update own seller profile"
    ON public.seller_profiles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 2: RECREATE seller_documents
-- ============================================================================

DROP TABLE IF EXISTS public.seller_documents CASCADE;
CREATE TABLE public.seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Document info
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'drivers_license_front',
        'drivers_license_back',
        'government_id_front',
        'government_id_back',
        'selfie_verification',
        'business_license',
        'tax_document',
        'bank_statement',
        'insurance_certificate',
        'proof_of_address',
        'other'
    )),
    
    -- Storage
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER,
    file_mime_type VARCHAR(100),
    storage_path TEXT NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'seller-documents',
    
    -- Verification
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_documents_seller_id ON public.seller_documents(seller_id);
CREATE INDEX idx_seller_documents_user_id ON public.seller_documents(seller_user_id);
CREATE INDEX idx_seller_documents_type ON public.seller_documents(document_type);
CREATE INDEX idx_seller_documents_status ON public.seller_documents(verification_status);

-- RLS for seller_documents
ALTER TABLE public.seller_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own documents" ON public.seller_documents;
CREATE POLICY "Sellers can view own documents"
    ON public.seller_documents FOR SELECT
    USING (seller_user_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can upload own documents" ON public.seller_documents;
CREATE POLICY "Sellers can upload own documents"
    ON public.seller_documents FOR INSERT
    WITH CHECK (seller_user_id = auth.uid());

-- ============================================================================
-- STEP 3: RECREATE seller_risk_scores
-- ============================================================================

DROP TABLE IF EXISTS public.seller_risk_scores CASCADE;
CREATE TABLE public.seller_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL UNIQUE REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Risk scores (0-100, higher = more risky)
    overall_risk_score INTEGER DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    identity_risk_score INTEGER DEFAULT 0,
    payment_risk_score INTEGER DEFAULT 0,
    behavioral_risk_score INTEGER DEFAULT 0,
    
    -- Risk flags
    risk_flags JSONB DEFAULT '[]'::jsonb,
    
    -- Thresholds
    requires_manual_review BOOLEAN DEFAULT false,
    auto_approved BOOLEAN DEFAULT false,
    auto_rejected BOOLEAN DEFAULT false,
    
    -- Review history
    last_reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_risk_seller_id ON public.seller_risk_scores(seller_id);
CREATE INDEX idx_seller_risk_overall_score ON public.seller_risk_scores(overall_risk_score);
CREATE INDEX idx_seller_risk_manual_review ON public.seller_risk_scores(requires_manual_review);

-- ============================================================================
-- STEP 4: RECREATE seller_verification_events
-- ============================================================================

DROP TABLE IF EXISTS public.seller_verification_events CASCADE;
CREATE TABLE public.seller_verification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'application_submitted',
        'identity_verification_started',
        'identity_verification_completed',
        'identity_verification_failed',
        'drivers_license_uploaded',
        'drivers_license_verified',
        'drivers_license_rejected',
        'document_uploaded',
        'document_approved',
        'document_rejected',
        'manual_review_requested',
        'approved',
        'rejected',
        'suspended',
        'reinstated'
    )),
    
    event_description TEXT,
    event_metadata JSONB,
    
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_events_seller ON public.seller_verification_events(seller_id);
CREATE INDEX idx_verification_events_type ON public.seller_verification_events(event_type);
CREATE INDEX idx_verification_events_time ON public.seller_verification_events(performed_at DESC);

-- ============================================================================
-- STEP 5: UPDATE RISK SCORING FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_seller_risk_score(UUID);
CREATE OR REPLACE FUNCTION public.calculate_seller_risk_score(
    p_seller_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_risk_score INTEGER := 0;
    v_seller_age_days INTEGER;
    v_has_id_verification BOOLEAN;
    v_has_drivers_license BOOLEAN;
    v_has_documents INTEGER;
    v_flags JSONB := '[]'::jsonb;
    v_seller_user_id UUID;
BEGIN
    -- Get seller info
    SELECT 
        EXTRACT(DAY FROM NOW() - sp.created_at)::INTEGER,
        COALESCE(sp.identity_verified, false),
        COALESCE(sp.drivers_license_verified, false),
        sp.user_id
    INTO v_seller_age_days, v_has_id_verification, v_has_drivers_license, v_seller_user_id
    FROM public.seller_profiles sp
    WHERE sp.id = p_seller_id;
    
    IF v_seller_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count approved documents
    SELECT COUNT(*) INTO v_has_documents
    FROM public.seller_documents
    WHERE seller_id = p_seller_id AND verification_status = 'approved';
    
    -- Calculate risk factors
    IF v_seller_age_days < 7 THEN
        v_risk_score := v_risk_score + 20;
        v_flags := v_flags || jsonb_build_array('new_account');
    ELSIF v_seller_age_days < 30 THEN
        v_risk_score := v_risk_score + 10;
    END IF;
    
    IF NOT v_has_id_verification THEN
        v_risk_score := v_risk_score + 30;
        v_flags := v_flags || jsonb_build_array('no_identity_verification');
    END IF;
    
    IF NOT v_has_drivers_license THEN
        v_risk_score := v_risk_score + 15;
        v_flags := v_flags || jsonb_build_array('no_drivers_license_verified');
    END IF;
    
    IF v_has_documents = 0 THEN
        v_risk_score := v_risk_score + 25;
        v_flags := v_flags || jsonb_build_array('no_documents_uploaded');
    END IF;
    
    -- Insert/update risk score
    INSERT INTO public.seller_risk_scores (
        seller_id,
        seller_user_id,
        overall_risk_score,
        risk_flags,
        requires_manual_review,
        auto_approved,
        auto_rejected
    )
    VALUES (
        p_seller_id,
        v_seller_user_id,
        v_risk_score,
        v_flags,
        (v_risk_score >= 40 AND v_risk_score < 70),
        (v_risk_score < 40),
        (v_risk_score >= 70)
    )
    ON CONFLICT (seller_id) DO UPDATE SET
        overall_risk_score = EXCLUDED.overall_risk_score,
        risk_flags = EXCLUDED.risk_flags,
        requires_manual_review = EXCLUDED.requires_manual_review,
        auto_approved = EXCLUDED.auto_approved,
        auto_rejected = EXCLUDED.auto_rejected,
        updated_at = NOW();
    
    RETURN v_risk_score;
END;
$$;

-- ============================================================================
-- STEP 6: GET SELLERS FOR ADMIN VIEW
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_sellers_requiring_review();
CREATE OR REPLACE FUNCTION public.get_sellers_requiring_review()
RETURNS TABLE (
    seller_id UUID,
    seller_user_id UUID,
    username TEXT,
    email TEXT,
    shop_name TEXT,
    business_name TEXT,
    risk_score INTEGER,
    risk_flags JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.user_id,
        COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1))::TEXT,
        au.email,
        COALESCE(sp.shop_name, 'No shop name')::TEXT,
        COALESCE(sp.business_name, 'No business name')::TEXT,
        COALESCE(srs.overall_risk_score, 0),
        COALESCE(srs.risk_flags, '[]'::jsonb),
        sp.created_at
    FROM public.seller_profiles sp
    LEFT JOIN auth.users au ON au.id = sp.user_id
    LEFT JOIN public.seller_risk_scores srs ON srs.seller_id = sp.id
    WHERE sp.status = 'pending'
    OR (srs.requires_manual_review = true)
    ORDER BY COALESCE(srs.overall_risk_score, 999) DESC, sp.created_at ASC;
END;
$$;

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================
-- Fixed: Foreign key now references auth.users(id) instead of public.users(id)
-- 
-- All tables now correctly reference auth.users for user_id:
-- ✅ seller_profiles
-- ✅ seller_documents
-- ✅ seller_risk_scores
-- ✅ seller_verification_events
--
-- Features Added:
-- ✅ Driver's license verification fields
-- ✅ Document upload support for driver's license
-- ✅ Risk scoring includes driver's license verification
-- ✅ Admin function to view all sellers requiring review
--
-- Next Steps:
-- 1. Run this SQL in Supabase
-- 2. Try seller registration - should work now!
-- 3. View sellers in Admin Dashboard → Seller Verification tab
-- ============================================================================
