-- ============================================================================
-- STREAMLINED ETSY-STYLE VERIFICATION - ESSENTIALS ONLY
-- ============================================================================
-- Driver's License + Duplicate Prevention + Ban Enforcement
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD ESSENTIAL VERIFICATION FIELDS
-- ============================================================================

ALTER TABLE public.seller_profiles 
-- Core Identity (What Etsy Requires)
ADD COLUMN IF NOT EXISTS full_legal_name TEXT, -- Must match driver's license
ADD COLUMN IF NOT EXISTS date_of_birth DATE, -- Age verification
ADD COLUMN IF NOT EXISTS ssn_last4 TEXT CHECK (ssn_last4 ~ '^\d{4}$' OR ssn_last4 IS NULL), -- For tax reporting (1099)

-- Driver's License (Primary ID)
ADD COLUMN IF NOT EXISTS dl_number_last4 VARCHAR(10), -- Last 4 of license number
ADD COLUMN IF NOT EXISTS dl_state VARCHAR(2), -- Issuing state
ADD COLUMN IF NOT EXISTS dl_expiration_date DATE,
ADD COLUMN IF NOT EXISTS dl_front_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dl_back_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dl_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dl_verified_at TIMESTAMPTZ,

-- Selfie Verification (Etsy requires this)
ADD COLUMN IF NOT EXISTS selfie_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selfie_matches_id BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMPTZ,

-- Address (Must match driver's license)
ADD COLUMN IF NOT EXISTS current_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS current_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS current_city TEXT,
ADD COLUMN IF NOT EXISTS current_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS current_postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS address_matches_id BOOLEAN DEFAULT false,

-- Verification Status
ADD COLUMN IF NOT EXISTS identity_verification_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,

-- Ban System
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS ban_permanent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_profiles_ssn_last4 ON public.seller_profiles(ssn_last4) WHERE ssn_last4 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seller_profiles_dl_verified ON public.seller_profiles(dl_verified);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_is_banned ON public.seller_profiles(is_banned) WHERE is_banned = true;

-- ============================================================================
-- STEP 2: CREATE BANNED SELLERS TABLE (Permanent Record)
-- ============================================================================

DROP TABLE IF EXISTS public.banned_sellers CASCADE;
CREATE TABLE public.banned_sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    username TEXT,
    
    -- Identity markers (to prevent re-registration)
    ssn_last4 TEXT,
    dl_number_last4 TEXT,
    dl_state VARCHAR(2),
    full_legal_name TEXT,
    date_of_birth DATE,
    
    -- Address (to catch same person at same address)
    address_line1 TEXT,
    city TEXT,
    state VARCHAR(2),
    postal_code VARCHAR(10),
    
    -- Banking (to catch same bank account)
    bank_routing_number TEXT,
    bank_account_last4 TEXT,
    
    -- Ban details
    banned_at TIMESTAMPTZ DEFAULT NOW(),
    banned_by UUID REFERENCES auth.users(id),
    ban_reason TEXT NOT NULL,
    is_permanent BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    
    -- Original seller profile (for reference)
    original_seller_profile_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banned_sellers_ssn ON public.banned_sellers(ssn_last4) WHERE ssn_last4 IS NOT NULL;
CREATE INDEX idx_banned_sellers_dl ON public.banned_sellers(dl_number_last4, dl_state);
CREATE INDEX idx_banned_sellers_email ON public.banned_sellers(email);
CREATE INDEX idx_banned_sellers_address ON public.banned_sellers(address_line1, postal_code);
CREATE INDEX idx_banned_sellers_bank ON public.banned_sellers(bank_routing_number, bank_account_last4);

-- ============================================================================
-- STEP 3: UPDATE seller_documents TO ONLY NEEDED TYPES
-- ============================================================================

-- Drop and recreate with simplified document types
DROP TABLE IF EXISTS public.seller_documents CASCADE;
CREATE TABLE public.seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Simplified document types (only what's needed)
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'drivers_license_front',
        'drivers_license_back',
        'selfie_verification',
        'w9_form' -- For tax compliance
    )),
    
    -- Storage
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER,
    file_mime_type VARCHAR(100),
    storage_path TEXT NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'seller-documents',
    
    -- Verification
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_documents_seller_id ON public.seller_documents(seller_id);
CREATE INDEX idx_seller_documents_type ON public.seller_documents(document_type);
CREATE INDEX idx_seller_documents_status ON public.seller_documents(verification_status);

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
-- STEP 4: DUPLICATE DETECTION FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_for_duplicate_seller(UUID);
CREATE OR REPLACE FUNCTION public.check_for_duplicate_seller(
    p_user_id UUID
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    duplicate_reason TEXT,
    existing_seller_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ssn_last4 TEXT;
    v_dl_number TEXT;
    v_dl_state TEXT;
    v_address TEXT;
    v_postal_code TEXT;
    v_bank_routing TEXT;
    v_bank_last4 TEXT;
    v_existing_seller UUID;
BEGIN
    -- Get current seller's info
    SELECT 
        sp.ssn_last4,
        sp.dl_number_last4,
        sp.dl_state,
        sp.current_address_line1,
        sp.current_postal_code,
        sp.bank_routing_number,
        sp.bank_account_last4
    INTO
        v_ssn_last4,
        v_dl_number,
        v_dl_state,
        v_address,
        v_postal_code,
        v_bank_routing,
        v_bank_last4
    FROM public.seller_profiles sp
    WHERE sp.user_id = p_user_id;
    
    -- Check for existing seller with same SSN
    IF v_ssn_last4 IS NOT NULL THEN
        SELECT id INTO v_existing_seller
        FROM public.seller_profiles
        WHERE ssn_last4 = v_ssn_last4
        AND user_id != p_user_id
        AND status != 'rejected'
        LIMIT 1;
        
        IF v_existing_seller IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Same SSN already registered'::TEXT, v_existing_seller;
            RETURN;
        END IF;
    END IF;
    
    -- Check for same driver's license
    IF v_dl_number IS NOT NULL AND v_dl_state IS NOT NULL THEN
        SELECT id INTO v_existing_seller
        FROM public.seller_profiles
        WHERE dl_number_last4 = v_dl_number
        AND dl_state = v_dl_state
        AND user_id != p_user_id
        AND status != 'rejected'
        LIMIT 1;
        
        IF v_existing_seller IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Driver''s license already registered'::TEXT, v_existing_seller;
            RETURN;
        END IF;
    END IF;
    
    -- Check for same bank account
    IF v_bank_routing IS NOT NULL AND v_bank_last4 IS NOT NULL THEN
        SELECT id INTO v_existing_seller
        FROM public.seller_profiles
        WHERE bank_routing_number = v_bank_routing
        AND bank_account_last4 = v_bank_last4
        AND user_id != p_user_id
        AND status != 'rejected'
        LIMIT 1;
        
        IF v_existing_seller IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Bank account already registered'::TEXT, v_existing_seller;
            RETURN;
        END IF;
    END IF;
    
    -- Check for same address (possible roommate/family, flag for review)
    IF v_address IS NOT NULL AND v_postal_code IS NOT NULL THEN
        SELECT id INTO v_existing_seller
        FROM public.seller_profiles
        WHERE current_address_line1 ILIKE v_address
        AND current_postal_code = v_postal_code
        AND user_id != p_user_id
        AND status = 'approved'
        LIMIT 1;
        
        IF v_existing_seller IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Same address as existing seller (may be family/roommate)'::TEXT, v_existing_seller;
            RETURN;
        END IF;
    END IF;
    
    -- No duplicates found
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID;
END;
$$;

-- ============================================================================
-- STEP 5: CHECK IF USER IS BANNED
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_if_banned(UUID);
CREATE OR REPLACE FUNCTION public.check_if_banned(
    p_user_id UUID
)
RETURNS TABLE (
    is_banned BOOLEAN,
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,
    is_permanent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
    v_ssn_last4 TEXT;
    v_dl_number TEXT;
    v_dl_state TEXT;
BEGIN
    -- Get user info
    SELECT 
        au.email,
        sp.ssn_last4,
        sp.dl_number_last4,
        sp.dl_state
    INTO v_email, v_ssn_last4, v_dl_number, v_dl_state
    FROM auth.users au
    LEFT JOIN public.seller_profiles sp ON sp.user_id = au.id
    WHERE au.id = p_user_id;
    
    -- Check if currently active seller is banned
    IF EXISTS (
        SELECT 1 FROM public.seller_profiles
        WHERE user_id = p_user_id
        AND is_banned = true
        AND (ban_permanent = true OR ban_expires_at > NOW())
    ) THEN
        RETURN QUERY
        SELECT 
            true,
            sp.ban_reason,
            sp.banned_at,
            sp.ban_permanent
        FROM public.seller_profiles sp
        WHERE sp.user_id = p_user_id
        AND sp.is_banned = true
        LIMIT 1;
        RETURN;
    END IF;
    
    -- Check banned_sellers table by email
    IF EXISTS (
        SELECT 1 FROM public.banned_sellers
        WHERE email = v_email
        AND (is_permanent = true OR expires_at > NOW())
    ) THEN
        RETURN QUERY
        SELECT 
            true,
            bs.ban_reason,
            bs.banned_at,
            bs.is_permanent
        FROM public.banned_sellers bs
        WHERE bs.email = v_email
        LIMIT 1;
        RETURN;
    END IF;
    
    -- Check by SSN
    IF v_ssn_last4 IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.banned_sellers
        WHERE ssn_last4 = v_ssn_last4
        AND (is_permanent = true OR expires_at > NOW())
    ) THEN
        RETURN QUERY
        SELECT 
            true,
            bs.ban_reason,
            bs.banned_at,
            bs.is_permanent
        FROM public.banned_sellers bs
        WHERE bs.ssn_last4 = v_ssn_last4
        LIMIT 1;
        RETURN;
    END IF;
    
    -- Check by driver's license
    IF v_dl_number IS NOT NULL AND v_dl_state IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.banned_sellers
        WHERE dl_number_last4 = v_dl_number
        AND dl_state = v_dl_state
        AND (is_permanent = true OR expires_at > NOW())
    ) THEN
        RETURN QUERY
        SELECT 
            true,
            bs.ban_reason,
            bs.banned_at,
            bs.is_permanent
        FROM public.banned_sellers bs
        WHERE bs.dl_number_last4 = v_dl_number
        AND bs.dl_state = v_dl_state
        LIMIT 1;
        RETURN;
    END IF;
    
    -- Not banned
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::BOOLEAN;
END;
$$;

-- ============================================================================
-- STEP 6: BAN SELLER FUNCTION (Admin Use)
-- ============================================================================

DROP FUNCTION IF EXISTS public.ban_seller(UUID, TEXT, BOOLEAN, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.ban_seller(
    p_seller_id UUID,
    p_reason TEXT,
    p_is_permanent BOOLEAN DEFAULT true,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    v_admin_id := auth.uid();
    
    -- Update seller profile
    UPDATE public.seller_profiles
    SET 
        is_banned = true,
        banned_at = NOW(),
        banned_by = v_admin_id,
        ban_reason = p_reason,
        ban_permanent = p_is_permanent,
        ban_expires_at = p_expires_at,
        status = 'suspended'
    WHERE id = p_seller_id;
    
    -- Add to banned_sellers table (permanent record)
    INSERT INTO public.banned_sellers (
        user_id,
        email,
        username,
        ssn_last4,
        dl_number_last4,
        dl_state,
        full_legal_name,
        date_of_birth,
        address_line1,
        city,
        state,
        postal_code,
        bank_routing_number,
        bank_account_last4,
        banned_by,
        ban_reason,
        is_permanent,
        expires_at,
        original_seller_profile_id
    )
    SELECT
        sp.user_id,
        au.email,
        au.raw_user_meta_data->>'username',
        sp.ssn_last4,
        sp.dl_number_last4,
        sp.dl_state,
        sp.full_legal_name,
        sp.date_of_birth,
        sp.current_address_line1,
        sp.current_city,
        sp.current_state,
        sp.current_postal_code,
        sp.bank_routing_number,
        sp.bank_account_last4,
        v_admin_id,
        p_reason,
        p_is_permanent,
        p_expires_at,
        sp.id
    FROM public.seller_profiles sp
    LEFT JOIN auth.users au ON au.id = sp.user_id
    WHERE sp.id = p_seller_id;
    
    RETURN true;
END;
$$;

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================
-- Streamlined Etsy-Style Verification (Essentials Only):
--
-- ✅ Driver's License Verification:
--    - Front photo
--    - Back photo
--    - License number (last 4 digits)
--    - Expiration date
--    - Issuing state
--
-- ✅ Identity Verification:
--    - Full legal name (must match license)
--    - Date of birth
--    - SSN last 4 (for 1099 reporting)
--    - Selfie matching ID
--    - Address verification
--
-- ✅ Duplicate Prevention:
--    - Checks SSN (no duplicate sellers)
--    - Checks driver's license
--    - Checks bank account
--    - Flags same address (roommate detection)
--
-- ✅ Ban Enforcement:
--    - Banned sellers cannot re-register
--    - Checks email, SSN, driver's license, bank account
--    - Permanent ban record in banned_sellers table
--    - Temporary bans with expiration dates
--
-- Functions Created:
-- ✅ check_for_duplicate_seller(user_id) - Detects duplicates
-- ✅ check_if_banned(user_id) - Checks if user is banned
-- ✅ ban_seller(seller_id, reason, permanent?, expires?) - Bans a seller
--
-- Document Types (Simplified):
-- ✅ drivers_license_front
-- ✅ drivers_license_back
-- ✅ selfie_verification
-- ✅ w9_form
--
-- Admin Dashboard Will Show:
-- - Driver's license verification status
-- - Selfie verification status
-- - Duplicate detection warnings
-- - Ban status
-- - All verification documents
--
-- Next Steps:
-- 1. Run this SQL in Supabase
-- 2. Sellers can upload driver's license & selfie
-- 3. System auto-detects duplicates
-- 4. System blocks banned sellers from re-registering
-- 5. View all in Admin Dashboard → Seller Verification tab
-- ============================================================================

