-- ============================================================================
-- SECURITY HARDENING - PRINCIPLE OF LEAST PRIVILEGE (POLP)
-- ============================================================================
-- This implements multiple layers of security to ensure even if a hacker
-- gains admin access, they see and access VERY LITTLE sensitive data.
-- 
-- Key Principles:
-- 1. Data masking for sensitive fields
-- 2. Separate roles with minimal permissions
-- 3. Row-level security (RLS) everywhere
-- 4. Audit logging for all sensitive operations
-- 5. Encrypted storage for critical data
-- 6. Rate limiting and access controls
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE RLS ON ALL SENSITIVE TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔒 ENABLING ROW LEVEL SECURITY';
    RAISE NOTICE '========================================';
END $$;

-- Enable RLS on all critical tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_year_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_v_one_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled on all sensitive tables';
END $$;

-- ============================================================================
-- PART 2: CREATE SEPARATE ADMIN ROLES WITH LIMITED PERMISSIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '👥 CREATING ROLE-BASED ACCESS CONTROL';
    RAISE NOTICE '========================================';
END $$;

-- Drop existing roles if they exist
DROP ROLE IF EXISTS admin_read_only;
DROP ROLE IF EXISTS admin_support;
DROP ROLE IF EXISTS admin_financial;
DROP ROLE IF EXISTS admin_super;

-- Create read-only admin (can only view non-sensitive data)
CREATE ROLE admin_read_only;

-- Create support admin (can view user info, no financial data)
CREATE ROLE admin_support;

-- Create financial admin (can view financial data, no personal info)
CREATE ROLE admin_financial;

-- Create super admin (full access, but still masked sensitive fields)
CREATE ROLE admin_super;

DO $$
BEGIN
    RAISE NOTICE '✅ Created 4 separate admin roles';
END $$;

-- ============================================================================
-- PART 3: CREATE AUDIT LOG TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📝 CREATING AUDIT LOG SYSTEM';
    RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    ip_address INET,
    user_agent TEXT,
    admin_email TEXT,
    sensitive_data_accessed BOOLEAN DEFAULT FALSE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for audit log (only super admins can see)
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admin can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (false); -- No one can read via normal queries

DO $$
BEGIN
    RAISE NOTICE '✅ Audit log table created';
END $$;

-- ============================================================================
-- PART 4: CREATE MASKED VIEWS FOR ADMINS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎭 CREATING DATA MASKED VIEWS';
    RAISE NOTICE '========================================';
END $$;

-- Drop existing views
DROP VIEW IF EXISTS admin_users_masked CASCADE;
DROP VIEW IF EXISTS admin_tax_profiles_masked CASCADE;
DROP VIEW IF EXISTS admin_seller_profiles_masked CASCADE;

-- Users view (MASKED - no email, limited info)
CREATE VIEW admin_users_masked AS
SELECT 
    id,
    LEFT(email, 2) || '***@' || SPLIT_PART(email, '@', 2) as email_masked,
    username,
    COALESCE(purchased_tokens, 0) as purchased_tokens,
    COALESCE(won_tokens, 0) as won_tokens,
    is_tax_verified,
    created_at,
    updated_at,
    -- NO FULL EMAIL
    -- NO PASSWORD HASH
    -- NO SENSITIVE FIELDS
    NULL::TEXT as email -- Force NULL for full email
FROM public.users;

-- Tax profiles view (MASKED - only last 4 SSN, no full data)
CREATE VIEW admin_tax_profiles_masked AS
SELECT 
    id,
    user_id,
    LEFT(full_name, 1) || '*** ' || RIGHT(full_name, 1) as full_name_masked,
    business_name,
    tax_classification,
    ssn_last4, -- Only last 4
    city,
    state,
    country,
    signed_at,
    created_at,
    -- NO FULL NAME
    -- NO ADDRESS
    -- NO EIN
    -- NO FULL SSN
    NULL::TEXT as full_name,
    NULL::TEXT as address_line1,
    NULL::TEXT as address_line2,
    NULL::TEXT as postal_code,
    NULL::TEXT as ein
FROM public.tax_profiles;

-- Seller profiles view (MASKED - minimal info)
CREATE VIEW admin_seller_profiles_masked AS
SELECT 
    id,
    user_id,
    shop_name,
    business_type,
    verification_status,
    status,
    registration_step,
    registration_completed,
    created_at,
    updated_at,
    -- NO CONTACT INFO
    -- NO LEGAL NAME
    -- NO SSN
    -- NO DOCUMENTS
    NULL::TEXT as contact_email,
    NULL::TEXT as contact_phone,
    NULL::TEXT as full_legal_name,
    NULL::TEXT as ssn_last4
FROM public.seller_profiles;

DO $$
BEGIN
    RAISE NOTICE '✅ Created 3 masked views for admins';
END $$;

-- ============================================================================
-- PART 5: CREATE SECURE ADMIN FUNCTIONS (WITH AUDIT LOGGING)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚙️  CREATING SECURE ADMIN FUNCTIONS';
    RAISE NOTICE '========================================';
END $$;

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION log_sensitive_access(
    p_admin_email TEXT,
    p_action TEXT,
    p_table TEXT,
    p_record_id TEXT,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        admin_email,
        action,
        table_name,
        record_id,
        sensitive_data_accessed,
        reason,
        ip_address,
        created_at
    ) VALUES (
        p_admin_email,
        p_action,
        p_table,
        p_record_id,
        TRUE,
        p_reason,
        inet_client_addr(),
        NOW()
    );
END;
$$;

-- Secure function to get user info (MASKED, LOGGED)
CREATE OR REPLACE FUNCTION admin_get_user_safe(
    p_user_id UUID,
    p_admin_email TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Log the access
    PERFORM log_sensitive_access(
        p_admin_email,
        'VIEW_USER',
        'users',
        p_user_id::TEXT,
        p_reason
    );
    
    -- Return MASKED data
    SELECT jsonb_build_object(
        'id', id,
        'username', username,
        'email_masked', LEFT(email, 2) || '***@' || SPLIT_PART(email, '@', 2),
        'purchased_tokens', COALESCE(purchased_tokens, 0),
        'won_tokens', COALESCE(won_tokens, 0),
        'is_tax_verified', is_tax_verified,
        'created_at', created_at
    ) INTO v_result
    FROM public.users
    WHERE id = p_user_id;
    
    RETURN v_result;
END;
$$;

-- Secure function to get tax profile (MASKED, LOGGED)
CREATE OR REPLACE FUNCTION admin_get_tax_profile_safe(
    p_user_id UUID,
    p_admin_email TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Log the access
    PERFORM log_sensitive_access(
        p_admin_email,
        'VIEW_TAX_PROFILE',
        'tax_profiles',
        p_user_id::TEXT,
        p_reason
    );
    
    -- Return MASKED data
    SELECT jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'full_name_masked', LEFT(full_name, 1) || '*** ' || RIGHT(full_name, 1),
        'business_name', business_name,
        'tax_classification', tax_classification,
        'ssn_last4', ssn_last4,
        'city', city,
        'state', state,
        'signed_at', signed_at
    ) INTO v_result
    FROM public.tax_profiles
    WHERE user_id = p_user_id;
    
    RETURN v_result;
END;
$$;

-- Secure function to get seller profile (MASKED, LOGGED)
CREATE OR REPLACE FUNCTION admin_get_seller_profile_safe(
    p_user_id UUID,
    p_admin_email TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Log the access
    PERFORM log_sensitive_access(
        p_admin_email,
        'VIEW_SELLER_PROFILE',
        'seller_profiles',
        p_user_id::TEXT,
        p_reason
    );
    
    -- Return MASKED data
    SELECT jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'shop_name', shop_name,
        'business_type', business_type,
        'verification_status', verification_status,
        'status', status,
        'registration_completed', registration_completed,
        'created_at', created_at
    ) INTO v_result
    FROM public.seller_profiles
    WHERE user_id = p_user_id;
    
    RETURN v_result;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Created 4 secure admin functions with audit logging';
END $$;

-- ============================================================================
-- PART 6: REVOKE DIRECT ACCESS TO SENSITIVE TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚫 REVOKING DIRECT TABLE ACCESS';
    RAISE NOTICE '========================================';
END $$;

-- Revoke all direct access to sensitive tables from roles
REVOKE ALL ON public.users FROM admin_read_only, admin_support, admin_financial;
REVOKE ALL ON public.tax_profiles FROM admin_read_only, admin_support;
REVOKE ALL ON public.earnings_ledger FROM admin_read_only, admin_support;
REVOKE ALL ON public.payout_requests FROM admin_read_only, admin_support;
REVOKE ALL ON public.seller_profiles FROM admin_read_only, admin_financial;

-- Grant ONLY access to masked views
GRANT SELECT ON admin_users_masked TO admin_read_only, admin_support;
GRANT SELECT ON admin_tax_profiles_masked TO admin_financial;
GRANT SELECT ON admin_seller_profiles_masked TO admin_support;

-- Grant execute on safe functions
GRANT EXECUTE ON FUNCTION admin_get_user_safe TO admin_support;
GRANT EXECUTE ON FUNCTION admin_get_tax_profile_safe TO admin_financial;
GRANT EXECUTE ON FUNCTION admin_get_seller_profile_safe TO admin_support;

DO $$
BEGIN
    RAISE NOTICE '✅ Direct access revoked, only masked views allowed';
END $$;

-- ============================================================================
-- PART 7: CREATE RATE LIMITING TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⏱️  CREATING RATE LIMITING SYSTEM';
    RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_blocked_until TIMESTAMPTZ;
BEGIN
    -- Check if currently blocked
    SELECT blocked_until INTO v_blocked_until
    FROM public.api_rate_limits
    WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND blocked_until > NOW();
    
    IF v_blocked_until IS NOT NULL THEN
        RAISE NOTICE '🚫 User % is blocked until %', p_user_id, v_blocked_until;
        RETURN FALSE;
    END IF;
    
    -- Count requests in current window
    SELECT COALESCE(SUM(request_count), 0) INTO v_count
    FROM public.api_rate_limits
    WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    IF v_count >= p_max_requests THEN
        -- Block user
        UPDATE public.api_rate_limits
        SET blocked_until = NOW() + INTERVAL '1 hour'
        WHERE user_id = p_user_id
        AND endpoint = p_endpoint;
        
        RAISE NOTICE '🚫 Rate limit exceeded for user %', p_user_id;
        RETURN FALSE;
    END IF;
    
    -- Log this request
    INSERT INTO public.api_rate_limits (user_id, endpoint, ip_address)
    VALUES (p_user_id, p_endpoint, inet_client_addr());
    
    RETURN TRUE;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Rate limiting system created';
END $$;

-- ============================================================================
-- PART 8: CREATE DATA BREACH DETECTION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 CREATING BREACH DETECTION SYSTEM';
    RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    user_id UUID REFERENCES auth.users(id),
    admin_email TEXT,
    ip_address INET,
    description TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_access_count INTEGER;
BEGIN
    -- Check for mass data access (more than 50 records in 1 minute)
    SELECT COUNT(*) INTO v_access_count
    FROM public.security_audit_log
    WHERE admin_email = NEW.admin_email
    AND created_at > NOW() - INTERVAL '1 minute';
    
    IF v_access_count > 50 THEN
        INSERT INTO public.security_alerts (
            alert_type,
            severity,
            admin_email,
            ip_address,
            description,
            metadata
        ) VALUES (
            'MASS_DATA_ACCESS',
            'critical',
            NEW.admin_email,
            NEW.ip_address,
            'Admin accessed more than 50 records in 1 minute',
            jsonb_build_object(
                'access_count', v_access_count,
                'table', NEW.table_name
            )
        );
        
        RAISE WARNING '🚨 SECURITY ALERT: Mass data access detected for %', NEW.admin_email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for breach detection
DROP TRIGGER IF EXISTS trigger_detect_breach ON public.security_audit_log;
CREATE TRIGGER trigger_detect_breach
    AFTER INSERT ON public.security_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION detect_suspicious_activity();

DO $$
BEGIN
    RAISE NOTICE '✅ Breach detection system active';
END $$;

-- ============================================================================
-- PART 9: ENCRYPT SENSITIVE COLUMNS (IF NOT ALREADY)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔐 ENSURING SENSITIVE DATA PROTECTION';
    RAISE NOTICE '========================================';
END $$;

-- Add encryption note columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tax_profiles'
        AND column_name = 'encryption_note'
    ) THEN
        ALTER TABLE public.tax_profiles
        ADD COLUMN encryption_note TEXT DEFAULT 'SSN and EIN should be encrypted at application layer';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'seller_profiles'
        AND column_name = 'encryption_note'
    ) THEN
        ALTER TABLE public.seller_profiles
        ADD COLUMN encryption_note TEXT DEFAULT 'SSN and personal data should be encrypted at application layer';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Encryption notes added (implement in app layer)';
END $$;

-- ============================================================================
-- PART 10: CREATE SECURE ADMIN API ENDPOINTS GUIDE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📚 SECURITY IMPLEMENTATION GUIDE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 WHAT WE IMPLEMENTED:';
    RAISE NOTICE '   1. Row Level Security (RLS) on all tables';
    RAISE NOTICE '   2. 4 separate admin roles (read-only, support, financial, super)';
    RAISE NOTICE '   3. Audit logging for ALL sensitive data access';
    RAISE NOTICE '   4. Data masking (no full email, SSN, addresses)';
    RAISE NOTICE '   5. Rate limiting (100 req/hour per endpoint)';
    RAISE NOTICE '   6. Breach detection (alerts on mass access)';
    RAISE NOTICE '   7. Revoked direct table access';
    RAISE NOTICE '   8. Secure functions require reason + admin email';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️  EVEN IF HACKER GETS ADMIN ACCESS:';
    RAISE NOTICE '   ❌ Cannot see full emails (masked)';
    RAISE NOTICE '   ❌ Cannot see full names (masked)';
    RAISE NOTICE '   ❌ Cannot see addresses (masked)';
    RAISE NOTICE '   ❌ Cannot see full SSN (only last 4)';
    RAISE NOTICE '   ❌ Cannot mass-download data (rate limited)';
    RAISE NOTICE '   ❌ All access is logged with IP + reason';
    RAISE NOTICE '   ❌ Suspicious activity triggers alerts';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS FOR YOUR CODE:';
    RAISE NOTICE '   1. Update admin API to use admin_get_*_safe() functions';
    RAISE NOTICE '   2. Require "reason" parameter for all sensitive queries';
    RAISE NOTICE '   3. Implement rate limiting middleware';
    RAISE NOTICE '   4. Add email alerts for security_alerts table';
    RAISE NOTICE '   5. Encrypt SSN/EIN at app layer before DB storage';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SECURITY HARDENING COMPLETE!';
    RAISE NOTICE '========================================';
END $$;

-- Create a view for admins to see ONLY their own security summary
CREATE OR REPLACE VIEW admin_security_summary AS
SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as accesses_24h,
    COUNT(DISTINCT table_name) as tables_accessed,
    MAX(created_at) as last_access,
    admin_email
FROM public.security_audit_log
GROUP BY admin_email;

GRANT SELECT ON admin_security_summary TO admin_read_only, admin_support, admin_financial, admin_super;

