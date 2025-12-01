-- ============================================================================
-- SIMPLE W-9 TABLE AND FUNCTION - RUN THIS FIRST
-- ============================================================================
-- This creates a minimal tax_profiles table with proper RLS
-- ============================================================================

-- Drop existing table if it has issues
DROP TABLE IF EXISTS tax_profiles CASCADE;

-- Create simple tax_profiles table
CREATE TABLE tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    business_name TEXT,
    tax_classification TEXT DEFAULT 'individual',
    ssn_last4 TEXT,
    ein TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    signature_ip TEXT DEFAULT 'web',
    signature_user_agent TEXT DEFAULT 'browser',
    electronic_consent_given BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Users can manage their own profile
CREATE POLICY "users_own_profile" ON tax_profiles
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin can see all
CREATE POLICY "admin_all_access" ON tax_profiles
    FOR ALL 
    USING (auth.jwt() ->> 'email' = 'rf32191@gmail.com');

-- Create RPC function for submitting W-9
CREATE OR REPLACE FUNCTION submit_w9_form(
    p_user_id UUID,
    p_full_name TEXT,
    p_business_name TEXT DEFAULT NULL,
    p_tax_classification TEXT DEFAULT 'individual',
    p_ssn_last4 TEXT DEFAULT NULL,
    p_ein TEXT DEFAULT NULL,
    p_address_line1 TEXT DEFAULT NULL,
    p_address_line2 TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_postal_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Check if profile exists
    SELECT id INTO v_id FROM tax_profiles WHERE user_id = p_user_id;
    
    IF v_id IS NOT NULL THEN
        -- Update existing
        UPDATE tax_profiles SET
            full_name = p_full_name,
            business_name = p_business_name,
            tax_classification = p_tax_classification,
            ssn_last4 = p_ssn_last4,
            ein = p_ein,
            address_line1 = p_address_line1,
            address_line2 = p_address_line2,
            city = p_city,
            state = p_state,
            postal_code = p_postal_code,
            signed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'updated', 'id', v_id);
    ELSE
        -- Insert new
        INSERT INTO tax_profiles (
            user_id, full_name, business_name, tax_classification,
            ssn_last4, ein, address_line1, address_line2,
            city, state, postal_code
        ) VALUES (
            p_user_id, p_full_name, p_business_name, p_tax_classification,
            p_ssn_last4, p_ein, p_address_line1, p_address_line2,
            p_city, p_state, p_postal_code
        )
        RETURNING id INTO v_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'inserted', 'id', v_id);
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION submit_w9_form TO authenticated;

-- Create admin view function
CREATE OR REPLACE FUNCTION admin_get_all_w9s(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    full_name TEXT,
    business_name TEXT,
    tax_classification TEXT,
    ssn_last4 TEXT,
    ein TEXT,
    city TEXT,
    state TEXT,
    signed_at TIMESTAMPTZ,
    is_verified BOOLEAN,
    total_lifetime_earnings_cents BIGINT,
    needs_1099_current_year BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id,
        tp.user_id,
        COALESCE(u.email, 'unknown')::TEXT,
        tp.full_name,
        tp.business_name,
        tp.tax_classification,
        tp.ssn_last4,
        tp.ein,
        tp.city,
        tp.state,
        tp.signed_at,
        COALESCE(tp.is_verified, false),
        0::BIGINT,
        false
    FROM tax_profiles tp
    LEFT JOIN auth.users u ON tp.user_id = u.id
    ORDER BY tp.signed_at DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_w9s TO authenticated;

-- Test the table
SELECT 'TABLE CREATED!' as status, COUNT(*) as existing_records FROM tax_profiles;

SELECT '✅ W-9 SYSTEM READY!' as result;

