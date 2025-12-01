-- ============================================================================
-- FIX TAX_PROFILES TABLE - Add missing columns
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add the missing column
ALTER TABLE tax_profiles 
ADD COLUMN IF NOT EXISTS electronic_consent_given BOOLEAN DEFAULT false;

-- Also make sure all other columns exist
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS signature_ip TEXT;
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS signature_user_agent TEXT;
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS verified_by UUID;

-- If tax_profiles doesn't exist at all, create it
CREATE TABLE IF NOT EXISTS tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    business_name TEXT,
    tax_classification TEXT NOT NULL DEFAULT 'individual',
    ssn_last4 TEXT,
    ein TEXT,
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
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own tax profile" ON tax_profiles;
DROP POLICY IF EXISTS "Users can insert own tax profile" ON tax_profiles;
DROP POLICY IF EXISTS "Users can update own tax profile" ON tax_profiles;
DROP POLICY IF EXISTS "Users can manage own tax profile" ON tax_profiles;
DROP POLICY IF EXISTS "Admin full access to tax profiles" ON tax_profiles;

-- Simple policy: users can do everything with their own profile
CREATE POLICY "Users manage own tax profile" ON tax_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Admin policy
CREATE POLICY "Admin access to tax profiles" ON tax_profiles
    FOR ALL USING (auth.jwt() ->> 'email' = 'rf32191@gmail.com');

-- Verify
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'tax_profiles'
ORDER BY ordinal_position;

SELECT '✅ TAX TABLE FIXED!' as result;

