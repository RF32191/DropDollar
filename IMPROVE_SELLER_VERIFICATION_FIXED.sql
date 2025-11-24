-- ============================================================================
-- ENHANCED SELLER VERIFICATION - ETSY/AMAZON STYLE (FIXED)
-- ============================================================================
-- This adds identity verification, document uploads, and risk scoring
-- Compatible with existing seller_profiles table
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ENSURE seller_profiles EXISTS (Create if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name TEXT,
    business_name TEXT,
    business_type TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: ADD IDENTITY VERIFICATION COLUMNS (Only if missing)
-- ============================================================================

-- Add columns safely (only if they don't exist)
DO $$ 
BEGIN
    -- Identity verification columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='identity_verified') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN identity_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='identity_verified_at') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN identity_verified_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='identity_verification_method') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN identity_verification_method VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='identity_verification_provider') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN identity_verification_provider VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='date_of_birth') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN date_of_birth DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='government_id_number') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN government_id_number VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='seller_profiles' 
                   AND column_name='government_id_type') THEN
        ALTER TABLE public.seller_profiles ADD COLUMN government_id_type VARCHAR(50);
    END IF;
END $$;

-- ============================================================================
-- PART 3: DOCUMENT STORAGE TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.seller_documents CASCADE;
CREATE TABLE public.seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Document info
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
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
-- PART 4: SELLER RISK SCORING
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
-- PART 5: SELLER VERIFICATION TIMELINE
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
-- PART 6: FUNCTIONS FOR RISK SCORING
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
    v_has_documents INTEGER;
    v_flags JSONB := '[]'::jsonb;
    v_seller_user_id UUID;
BEGIN
    -- Get seller info
    SELECT 
        EXTRACT(DAY FROM NOW() - sp.created_at)::INTEGER,
        COALESCE(sp.identity_verified, false),
        sp.user_id
    INTO v_seller_age_days, v_has_id_verification, v_seller_user_id
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
    
    -- New account = higher risk
    IF v_seller_age_days < 7 THEN
        v_risk_score := v_risk_score + 20;
        v_flags := v_flags || jsonb_build_array('new_account');
    ELSIF v_seller_age_days < 30 THEN
        v_risk_score := v_risk_score + 10;
    END IF;
    
    -- No identity verification = high risk
    IF NOT v_has_id_verification THEN
        v_risk_score := v_risk_score + 30;
        v_flags := v_flags || jsonb_build_array('no_identity_verification');
    END IF;
    
    -- No documents = high risk
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
-- PART 7: ADMIN FUNCTIONS
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

-- Log verification event
DROP FUNCTION IF EXISTS public.log_seller_verification_event(UUID, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.log_seller_verification_event(
    p_seller_id UUID,
    p_event_type TEXT,
    p_event_description TEXT DEFAULT NULL,
    p_event_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    v_seller_user_id UUID;
BEGIN
    -- Get seller's user_id
    SELECT user_id INTO v_seller_user_id FROM public.seller_profiles WHERE id = p_seller_id;
    
    IF v_seller_user_id IS NULL THEN
        RAISE EXCEPTION 'Seller not found';
    END IF;
    
    INSERT INTO public.seller_verification_events (
        seller_id,
        seller_user_id,
        event_type,
        event_description,
        event_metadata,
        performed_by
    ) VALUES (
        p_seller_id,
        v_seller_user_id,
        p_event_type,
        p_event_description,
        p_event_metadata,
        auth.uid()
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================
-- Tables Created:
-- ✅ seller_profiles (enhanced with identity fields)
-- ✅ seller_documents (document storage & verification)
-- ✅ seller_risk_scores (risk assessment)
-- ✅ seller_verification_events (audit trail)
--
-- Functions Created:
-- ✅ calculate_seller_risk_score(seller_id)
-- ✅ get_sellers_requiring_review()
-- ✅ log_seller_verification_event(...)
--
-- Next Steps:
-- 1. Set up Supabase Storage bucket: 'seller-documents'
-- 2. Integrate Stripe Identity for ID verification
-- 3. View sellers in Admin Dashboard → Seller Verification tab
-- ============================================================================

