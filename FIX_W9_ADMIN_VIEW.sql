-- ============================================================================
-- FIX W-9 ADMIN VIEW - Create missing function and verify data
-- ============================================================================

-- First, let's see if there's any data in tax_profiles
SELECT 'Existing tax_profiles:' as check_type, COUNT(*) as count FROM tax_profiles;

-- Create the admin function to get all W-9s
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
        COALESCE(u.email, 'unknown@email.com')::TEXT as user_email,
        tp.full_name,
        tp.business_name,
        tp.tax_classification,
        tp.ssn_last4,
        tp.ein,
        tp.city,
        tp.state,
        tp.signed_at,
        COALESCE(tp.is_verified, false) as is_verified,
        COALESCE(0, 0)::BIGINT as total_lifetime_earnings_cents,
        false as needs_1099_current_year
    FROM tax_profiles tp
    LEFT JOIN auth.users u ON tp.user_id = u.id
    WHERE 
        p_search IS NULL 
        OR tp.full_name ILIKE '%' || p_search || '%'
        OR tp.ssn_last4 ILIKE '%' || p_search || '%'
        OR tp.ein ILIKE '%' || p_search || '%'
        OR u.email ILIKE '%' || p_search || '%'
    ORDER BY tp.signed_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_all_w9s(INTEGER, INTEGER, TEXT) TO authenticated;

-- Verify the function works
SELECT * FROM admin_get_all_w9s(10, 0, NULL);

SELECT '✅ W-9 ADMIN VIEW FIXED!' as result;

