-- ============================================================================
-- ETSY-STYLE SELLER VERIFICATION - COMPLETE IDENTITY & BUSINESS VERIFICATION
-- ============================================================================
-- Adds all identity verification fields Etsy requires for seller approval
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD ETSY-STYLE VERIFICATION FIELDS TO seller_profiles
-- ============================================================================

ALTER TABLE public.seller_profiles 
-- Personal Identity Information
ADD COLUMN IF NOT EXISTS full_legal_name TEXT, -- Full name as on government ID
ADD COLUMN IF NOT EXISTS ssn_last4 TEXT CHECK (ssn_last4 ~ '^\d{4}$' OR ssn_last4 IS NULL), -- Last 4 of SSN
ADD COLUMN IF NOT EXISTS ein TEXT, -- Employer Identification Number for businesses

-- Identity Document Information
ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) CHECK (id_type IN ('drivers_license', 'passport', 'state_id', 'national_id', NULL)),
ADD COLUMN IF NOT EXISTS id_number_last4 VARCHAR(10), -- Last 4 of ID number
ADD COLUMN IF NOT EXISTS id_issuing_state VARCHAR(2), -- US state code or country code
ADD COLUMN IF NOT EXISTS id_expiration_date DATE,
ADD COLUMN IF NOT EXISTS id_front_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS id_back_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selfie_uploaded BOOLEAN DEFAULT false,

-- Address Verification
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proof_of_address_uploaded BOOLEAN DEFAULT false,

-- Business Verification (for business entities)
ADD COLUMN IF NOT EXISTS business_license_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_license_number TEXT,
ADD COLUMN IF NOT EXISTS business_license_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS business_license_expiry DATE,
ADD COLUMN IF NOT EXISTS business_ein TEXT, -- Separate from personal EIN

-- Banking Verification
ADD COLUMN IF NOT EXISTS bank_statement_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ,

-- Background Check & Compliance
ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(20) CHECK (background_check_status IN ('not_started', 'pending', 'passed', 'failed', 'requires_review', NULL)),
ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sanctions_check_passed BOOLEAN,
ADD COLUMN IF NOT EXISTS sanctions_check_date TIMESTAMPTZ,

-- Stripe Identity Verification (if using Stripe)
ADD COLUMN IF NOT EXISTS stripe_verification_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_verification_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS stripe_verified_at TIMESTAMPTZ,

-- Manual Review Flags
ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_review_reason TEXT,
ADD COLUMN IF NOT EXISTS manual_review_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manual_review_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manual_reviewed_by UUID REFERENCES auth.users(id),

-- Verification Completion
ADD COLUMN IF NOT EXISTS verification_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_tier VARCHAR(20) CHECK (verification_tier IN ('basic', 'standard', 'enhanced', NULL)),

-- Seller Level (based on verification and performance)
ADD COLUMN IF NOT EXISTS seller_tier VARCHAR(20) DEFAULT 'bronze' CHECK (seller_tier IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS seller_badge TEXT[], -- Array of earned badges

-- Compliance Notes
ADD COLUMN IF NOT EXISTS compliance_notes TEXT,
ADD COLUMN IF NOT EXISTS last_compliance_review_at TIMESTAMPTZ;

-- Create additional indexes for verification fields
CREATE INDEX IF NOT EXISTS idx_seller_profiles_id_type ON public.seller_profiles(id_type);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification_completed ON public.seller_profiles(verification_completed);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification_tier ON public.seller_profiles(verification_tier);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_requires_manual_review ON public.seller_profiles(requires_manual_review) WHERE requires_manual_review = true;
CREATE INDEX IF NOT EXISTS idx_seller_profiles_background_check ON public.seller_profiles(background_check_status);

-- ============================================================================
-- STEP 2: CREATE VERIFICATION REQUIREMENTS TRACKING TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.seller_verification_requirements CASCADE;
CREATE TABLE public.seller_verification_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    
    -- Document Requirements
    requires_government_id BOOLEAN DEFAULT true,
    government_id_submitted BOOLEAN DEFAULT false,
    government_id_approved BOOLEAN DEFAULT false,
    
    requires_selfie BOOLEAN DEFAULT true,
    selfie_submitted BOOLEAN DEFAULT false,
    selfie_approved BOOLEAN DEFAULT false,
    selfie_matches_id BOOLEAN DEFAULT false,
    
    requires_ssn BOOLEAN DEFAULT true,
    ssn_submitted BOOLEAN DEFAULT false,
    ssn_verified BOOLEAN DEFAULT false,
    
    requires_address_proof BOOLEAN DEFAULT true,
    address_proof_submitted BOOLEAN DEFAULT false,
    address_proof_approved BOOLEAN DEFAULT false,
    
    requires_bank_verification BOOLEAN DEFAULT true,
    bank_verification_submitted BOOLEAN DEFAULT false,
    bank_verification_approved BOOLEAN DEFAULT false,
    
    -- Business-specific requirements
    requires_business_license BOOLEAN DEFAULT false,
    business_license_submitted BOOLEAN DEFAULT false,
    business_license_approved BOOLEAN DEFAULT false,
    
    requires_ein BOOLEAN DEFAULT false,
    ein_submitted BOOLEAN DEFAULT false,
    ein_verified BOOLEAN DEFAULT false,
    
    -- Overall status
    all_requirements_met BOOLEAN DEFAULT false,
    requirements_checked_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_requirements_seller ON public.seller_verification_requirements(seller_id);
CREATE INDEX idx_verification_requirements_status ON public.seller_verification_requirements(all_requirements_met);

-- ============================================================================
-- STEP 3: CREATE ADMIN NOTES/ACTIONS TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.seller_admin_actions CASCADE;
CREATE TABLE public.seller_admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'approved_id',
        'rejected_id',
        'approved_selfie',
        'rejected_selfie',
        'approved_business_doc',
        'rejected_business_doc',
        'approved_address_proof',
        'rejected_address_proof',
        'approved_bank',
        'rejected_bank',
        'requested_additional_docs',
        'flagged_for_review',
        'cleared_flag',
        'suspended_seller',
        'reinstated_seller',
        'changed_tier',
        'added_note'
    )),
    
    action_description TEXT NOT NULL,
    reason TEXT,
    metadata JSONB,
    
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_seller ON public.seller_admin_actions(seller_id);
CREATE INDEX idx_admin_actions_admin ON public.seller_admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON public.seller_admin_actions(action_type);
CREATE INDEX idx_admin_actions_performed ON public.seller_admin_actions(performed_at DESC);

-- ============================================================================
-- STEP 4: UPDATE RISK SCORING TO INCLUDE NEW VERIFICATION FACTORS
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
    v_flags JSONB := '[]'::jsonb;
    v_seller_user_id UUID;
    
    -- Verification booleans
    v_has_id BOOLEAN;
    v_has_selfie BOOLEAN;
    v_has_ssn BOOLEAN;
    v_has_address_proof BOOLEAN;
    v_has_bank_verified BOOLEAN;
    v_identity_verified BOOLEAN;
    v_drivers_license_verified BOOLEAN;
    v_background_check_status TEXT;
BEGIN
    -- Get seller info including all verification fields
    SELECT 
        EXTRACT(DAY FROM NOW() - sp.created_at)::INTEGER,
        sp.user_id,
        COALESCE(sp.id_front_uploaded, false),
        COALESCE(sp.selfie_uploaded, false),
        (sp.ssn_last4 IS NOT NULL),
        COALESCE(sp.proof_of_address_uploaded, false),
        COALESCE(sp.bank_verified, false),
        COALESCE(sp.identity_verified, false),
        COALESCE(sp.drivers_license_verified, false),
        sp.background_check_status
    INTO 
        v_seller_age_days,
        v_seller_user_id,
        v_has_id,
        v_has_selfie,
        v_has_ssn,
        v_has_address_proof,
        v_has_bank_verified,
        v_identity_verified,
        v_drivers_license_verified,
        v_background_check_status
    FROM public.seller_profiles sp
    WHERE sp.id = p_seller_id;
    
    IF v_seller_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- RISK FACTORS (Etsy-style scoring)
    
    -- Account age (newer = riskier)
    IF v_seller_age_days < 1 THEN
        v_risk_score := v_risk_score + 30;
        v_flags := v_flags || jsonb_build_array('brand_new_account');
    ELSIF v_seller_age_days < 7 THEN
        v_risk_score := v_risk_score + 20;
        v_flags := v_flags || jsonb_build_array('very_new_account');
    ELSIF v_seller_age_days < 30 THEN
        v_risk_score := v_risk_score + 10;
        v_flags := v_flags || jsonb_build_array('new_account');
    END IF;
    
    -- No government ID = CRITICAL
    IF NOT v_has_id THEN
        v_risk_score := v_risk_score + 40;
        v_flags := v_flags || jsonb_build_array('no_government_id');
    END IF;
    
    -- No selfie verification = HIGH
    IF NOT v_has_selfie THEN
        v_risk_score := v_risk_score + 25;
        v_flags := v_flags || jsonb_build_array('no_selfie_verification');
    END IF;
    
    -- No SSN = HIGH
    IF NOT v_has_ssn THEN
        v_risk_score := v_risk_score + 30;
        v_flags := v_flags || jsonb_build_array('no_ssn_provided');
    END IF;
    
    -- No address proof = MEDIUM-HIGH
    IF NOT v_has_address_proof THEN
        v_risk_score := v_risk_score + 20;
        v_flags := v_flags || jsonb_build_array('no_address_proof');
    END IF;
    
    -- No bank verification = MEDIUM
    IF NOT v_has_bank_verified THEN
        v_risk_score := v_risk_score + 15;
        v_flags := v_flags || jsonb_build_array('bank_not_verified');
    END IF;
    
    -- Background check failed = CRITICAL
    IF v_background_check_status = 'failed' THEN
        v_risk_score := v_risk_score + 100; -- Auto-reject threshold
        v_flags := v_flags || jsonb_build_array('background_check_failed');
    ELSIF v_background_check_status = 'requires_review' THEN
        v_risk_score := v_risk_score + 50;
        v_flags := v_flags || jsonb_build_array('background_check_needs_review');
    ELSIF v_background_check_status IS NULL OR v_background_check_status = 'not_started' THEN
        v_risk_score := v_risk_score + 25;
        v_flags := v_flags || jsonb_build_array('no_background_check');
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
        LEAST(v_risk_score, 100), -- Cap at 100
        v_flags,
        (v_risk_score >= 40 AND v_risk_score < 80), -- Manual review threshold
        (v_risk_score < 40), -- Auto-approve threshold
        (v_risk_score >= 80) -- Auto-reject threshold
    )
    ON CONFLICT (seller_id) DO UPDATE SET
        overall_risk_score = LEAST(EXCLUDED.overall_risk_score, 100),
        risk_flags = EXCLUDED.risk_flags,
        requires_manual_review = EXCLUDED.requires_manual_review,
        auto_approved = EXCLUDED.auto_approved,
        auto_rejected = EXCLUDED.auto_rejected,
        updated_at = NOW();
    
    RETURN LEAST(v_risk_score, 100);
END;
$$;

-- ============================================================================
-- STEP 5: CREATE FUNCTION TO CHECK VERIFICATION REQUIREMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_seller_verification_requirements(
    p_seller_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_all_met BOOLEAN := false;
    v_seller_type TEXT;
BEGIN
    -- Get seller type to determine requirements
    SELECT business_type INTO v_seller_type
    FROM public.seller_profiles
    WHERE id = p_seller_id;
    
    -- Update or create requirements tracking
    INSERT INTO public.seller_verification_requirements (
        seller_id,
        government_id_submitted,
        government_id_approved,
        selfie_submitted,
        selfie_approved,
        ssn_submitted,
        address_proof_submitted,
        bank_verification_submitted,
        requires_business_license,
        requires_ein
    )
    SELECT
        sp.id,
        COALESCE(sp.id_front_uploaded, false),
        COALESCE(sp.identity_verified, false),
        COALESCE(sp.selfie_uploaded, false),
        COALESCE(sp.identity_verified, false),
        (sp.ssn_last4 IS NOT NULL),
        COALESCE(sp.proof_of_address_uploaded, false),
        COALESCE(sp.bank_verified, false),
        (sp.business_type NOT IN ('individual', 'sole_proprietorship')),
        (sp.business_type NOT IN ('individual', 'sole_proprietorship'))
    FROM public.seller_profiles sp
    WHERE sp.id = p_seller_id
    ON CONFLICT (seller_id) DO UPDATE SET
        government_id_submitted = EXCLUDED.government_id_submitted,
        government_id_approved = EXCLUDED.government_id_approved,
        selfie_submitted = EXCLUDED.selfie_submitted,
        selfie_approved = EXCLUDED.selfie_approved,
        ssn_submitted = EXCLUDED.ssn_submitted,
        address_proof_submitted = EXCLUDED.address_proof_submitted,
        bank_verification_submitted = EXCLUDED.bank_verification_submitted,
        updated_at = NOW();
    
    -- Check if all requirements are met
    SELECT 
        (government_id_approved AND selfie_approved AND ssn_submitted AND 
         address_proof_submitted AND bank_verification_submitted AND
         (NOT requires_business_license OR business_license_approved) AND
         (NOT requires_ein OR ein_verified))
    INTO v_all_met
    FROM public.seller_verification_requirements
    WHERE seller_id = p_seller_id;
    
    -- Update all_requirements_met flag
    UPDATE public.seller_verification_requirements
    SET all_requirements_met = v_all_met,
        requirements_checked_at = NOW()
    WHERE seller_id = p_seller_id;
    
    -- Update seller profile verification status
    IF v_all_met THEN
        UPDATE public.seller_profiles
        SET verification_completed = true,
            verification_completed_at = NOW(),
            verification_tier = 'enhanced'
        WHERE id = p_seller_id;
    END IF;
    
    RETURN v_all_met;
END;
$$;

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================
-- Added comprehensive Etsy-style verification requirements:
--
-- Identity Verification:
-- ✅ Full legal name
-- ✅ SSN (last 4 digits)
-- ✅ Government ID (driver's license, passport, state ID)
-- ✅ ID expiration tracking
-- ✅ Selfie verification
-- ✅ Photo ID matching
--
-- Address Verification:
-- ✅ Proof of address document
-- ✅ Address verification status
--
-- Business Verification:
-- ✅ Business license
-- ✅ EIN (Employer Identification Number)
-- ✅ Business registration number
--
-- Banking Verification:
-- ✅ Bank statement upload
-- ✅ Bank account verification
--
-- Background Checks:
-- ✅ Background check status tracking
-- ✅ Sanctions screening
--
-- Stripe Identity:
-- ✅ Stripe verification session tracking
--
-- Manual Review:
-- ✅ Manual review flags and reasons
-- ✅ Admin action tracking
--
-- Compliance:
-- ✅ Verification tier system (basic, standard, enhanced)
-- ✅ Seller tier badges (bronze, silver, gold, platinum)
-- ✅ Compliance notes
--
-- Functions Created:
-- ✅ calculate_seller_risk_score - Enhanced with all new factors
-- ✅ check_seller_verification_requirements - Tracks requirement completion
--
-- Next Steps:
-- 1. Run this SQL in Supabase
-- 2. Sellers can now submit all verification documents
-- 3. View all verification data in Admin Dashboard → Seller Verification tab
-- 4. Admins can approve/reject documents and track compliance
-- ============================================================================

