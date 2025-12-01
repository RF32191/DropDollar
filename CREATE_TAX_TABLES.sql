-- ============================================================================
-- CREATE TAX TABLES FOR W-9 AND 1099 SYSTEM
-- ============================================================================
-- Run this in Supabase SQL Editor if W-9 submission fails
-- ============================================================================

-- Create tax_profiles table
CREATE TABLE IF NOT EXISTS tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    business_name TEXT,
    tax_classification TEXT NOT NULL DEFAULT 'individual',
    ssn_last4 TEXT, -- Only last 4 digits stored!
    ein TEXT, -- Full EIN is stored (not sensitive like SSN)
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    signed_at TIMESTAMPTZ,
    signature_ip TEXT,
    signature_user_agent TEXT,
    electronic_consent_given BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one profile per user
    UNIQUE(user_id)
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_tax_profiles_user_id ON tax_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_profiles_ssn_last4 ON tax_profiles(ssn_last4);

-- Enable RLS
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own tax profile" ON tax_profiles;
CREATE POLICY "Users can view own tax profile" ON tax_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tax profile" ON tax_profiles;
CREATE POLICY "Users can insert own tax profile" ON tax_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tax profile" ON tax_profiles;
CREATE POLICY "Users can update own tax profile" ON tax_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policy (for rf32191@gmail.com)
DROP POLICY IF EXISTS "Admin can view all tax profiles" ON tax_profiles;
CREATE POLICY "Admin can view all tax profiles" ON tax_profiles
    FOR SELECT USING (
        auth.jwt() ->> 'email' = 'rf32191@gmail.com'
    );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_tax_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_profiles_updated_at ON tax_profiles;
CREATE TRIGGER tax_profiles_updated_at
    BEFORE UPDATE ON tax_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_profile_timestamp();

-- ============================================================================
-- Create 1099 tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_1099_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_profile_id UUID REFERENCES tax_profiles(id),
    tax_year INTEGER NOT NULL,
    total_earnings_cents BIGINT NOT NULL DEFAULT 0,
    form_1099_generated_at TIMESTAMPTZ,
    form_1099_delivery_status TEXT DEFAULT 'not_generated',
    form_1099_pdf_url TEXT,
    form_1099_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tax_year)
);

-- Enable RLS
ALTER TABLE form_1099_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own 1099 records" ON form_1099_records;
CREATE POLICY "Users can view own 1099 records" ON form_1099_records
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all 1099 records" ON form_1099_records;
CREATE POLICY "Admin can view all 1099 records" ON form_1099_records
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'rf32191@gmail.com'
    );

-- ============================================================================
-- Verify tables exist
-- ============================================================================

SELECT 'tax_profiles table:' as status, COUNT(*) as count FROM tax_profiles;
SELECT 'form_1099_records table:' as status, COUNT(*) as count FROM form_1099_records;

SELECT '✅ TAX TABLES CREATED SUCCESSFULLY!' as result;

