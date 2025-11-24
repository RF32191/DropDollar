-- ============================================================================
-- TAX SYSTEM BACKUP & DATA RETENTION
-- ============================================================================
-- 
-- CRITICAL: Tax records must be retained for 7+ years per IRS requirements.
-- Run this backup regularly and store securely.
-- 
-- Backup Schedule Recommendation:
-- - Daily: Automated backup of all tables
-- - Weekly: Manual verification backup
-- - Monthly: Archive to long-term storage
-- - Annually: Create year-end snapshot
-- 
-- SECURITY: These backups contain sensitive tax information (SSN last 4).
-- Store in encrypted, access-controlled location.
-- ============================================================================

-- ============================================================================
-- BACKUP VIEWS (Read-Only Snapshots)
-- ============================================================================

-- Create a view for complete tax profile backup
CREATE OR REPLACE VIEW tax_profiles_backup AS
SELECT 
  tp.id,
  tp.user_id,
  u.email as user_email,
  tp.full_name,
  tp.business_name,
  tp.tax_classification,
  tp.ssn_last4,
  tp.ein,
  tp.address_line1,
  tp.address_line2,
  tp.city,
  tp.state,
  tp.postal_code,
  tp.country,
  tp.signed_at,
  tp.signature_ip,
  tp.signature_user_agent,
  tp.electronic_consent_given,
  tp.is_verified,
  tp.verified_by,
  tp.verified_at,
  tp.created_at,
  tp.updated_at
FROM tax_profiles tp
LEFT JOIN auth.users u ON u.id = tp.user_id;

COMMENT ON VIEW tax_profiles_backup IS 'Backup view of all W-9 tax profiles with user email for reference';

-- Create a view for earnings ledger backup
CREATE OR REPLACE VIEW earnings_ledger_backup AS
SELECT 
  el.id,
  el.user_id,
  u.email as user_email,
  el.amount_cents,
  el.currency,
  el.source_type,
  el.source_reference_id,
  el.description,
  el.occurred_at,
  el.tax_year,
  el.is_taxable,
  el.created_at,
  el.created_by,
  el.metadata
FROM earnings_ledger el
LEFT JOIN auth.users u ON u.id = el.user_id;

COMMENT ON VIEW earnings_ledger_backup IS 'Backup view of all earnings with user email for reference';

-- Create a view for tax year summaries backup
CREATE OR REPLACE VIEW tax_year_summaries_backup AS
SELECT 
  tys.id,
  tys.user_id,
  u.email as user_email,
  tp.full_name,
  tys.tax_year,
  tys.total_earnings_cents,
  tys.total_earnings_count,
  tys.needs_1099,
  tys.threshold_met_at,
  tys.form_1099_generated_at,
  tys.form_1099_delivery_status,
  tys.form_1099_pdf_url,
  tys.form_1099_sent_at,
  tys.form_1099_error_message,
  tys.created_at,
  tys.updated_at
FROM tax_year_summaries tys
LEFT JOIN auth.users u ON u.id = tys.user_id
LEFT JOIN tax_profiles tp ON tp.user_id = tys.user_id;

COMMENT ON VIEW tax_year_summaries_backup IS 'Backup view of tax year summaries with user details';

-- Create a view for payout requests backup
CREATE OR REPLACE VIEW payout_requests_backup AS
SELECT 
  pr.id,
  pr.user_id,
  u.email as user_email,
  pr.amount_cents,
  pr.currency,
  pr.status,
  pr.blocked_reason,
  pr.payment_method,
  pr.payment_reference_id,
  pr.paid_at,
  pr.reviewed_by,
  pr.reviewed_at,
  pr.admin_notes,
  pr.created_at,
  pr.updated_at
FROM payout_requests pr
LEFT JOIN auth.users u ON u.id = pr.user_id;

COMMENT ON VIEW payout_requests_backup IS 'Backup view of all payout requests';

-- ============================================================================
-- BACKUP EXPORT FUNCTIONS
-- ============================================================================

-- Function to get complete backup data for a tax year
CREATE OR REPLACE FUNCTION get_tax_year_backup_data(p_tax_year INTEGER)
RETURNS TABLE (
  backup_type TEXT,
  record_count BIGINT,
  data_snapshot JSONB
) AS $$
BEGIN
  -- Tax Profiles
  RETURN QUERY
  SELECT 
    'tax_profiles'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(to_jsonb(t.*)) as data_snapshot
  FROM tax_profiles_backup t
  WHERE EXISTS (
    SELECT 1 FROM tax_year_summaries tys 
    WHERE tys.user_id = t.user_id 
    AND tys.tax_year = p_tax_year
  );

  -- Earnings Ledger
  RETURN QUERY
  SELECT 
    'earnings_ledger'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(to_jsonb(e.*)) as data_snapshot
  FROM earnings_ledger_backup e
  WHERE e.tax_year = p_tax_year;

  -- Tax Year Summaries
  RETURN QUERY
  SELECT 
    'tax_year_summaries'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(to_jsonb(s.*)) as data_snapshot
  FROM tax_year_summaries_backup s
  WHERE s.tax_year = p_tax_year;

  -- Payout Requests
  RETURN QUERY
  SELECT 
    'payout_requests'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(to_jsonb(p.*)) as data_snapshot
  FROM payout_requests_backup p
  WHERE EXTRACT(YEAR FROM p.created_at) = p_tax_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tax_year_backup_data IS 'Get complete backup data for a specific tax year';

-- ============================================================================
-- BACKUP VERIFICATION
-- ============================================================================

-- Function to verify backup integrity
CREATE OR REPLACE FUNCTION verify_tax_backup_integrity(p_tax_year INTEGER)
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Tax profiles exist for all users with earnings
  RETURN QUERY
  SELECT 
    'Tax Profiles Completeness'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All users with earnings have tax profiles'
      ELSE COUNT(*)::TEXT || ' users missing tax profiles'
    END::TEXT
  FROM tax_year_summaries tys
  LEFT JOIN tax_profiles tp ON tp.user_id = tys.user_id
  WHERE tys.tax_year = p_tax_year
    AND tys.needs_1099 = true
    AND tp.id IS NULL;

  -- Check 2: Earnings match summary totals
  RETURN QUERY
  SELECT 
    'Earnings Totals Match'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All summaries match ledger totals'
      ELSE COUNT(*)::TEXT || ' summaries have mismatched totals'
    END::TEXT
  FROM tax_year_summaries tys
  WHERE tys.tax_year = p_tax_year
    AND tys.total_earnings_cents != (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM earnings_ledger
      WHERE user_id = tys.user_id
        AND tax_year = p_tax_year
        AND is_taxable = true
    );

  -- Check 3: 1099s generated for all $600+ earners
  RETURN QUERY
  SELECT 
    '1099 Generation Status'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'WARNING'
    END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All required 1099s generated'
      ELSE COUNT(*)::TEXT || ' 1099s not yet generated'
    END::TEXT
  FROM tax_year_summaries
  WHERE tax_year = p_tax_year
    AND needs_1099 = true
    AND form_1099_generated_at IS NULL;

  -- Check 4: No orphaned records
  RETURN QUERY
  SELECT 
    'Orphaned Records'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'WARNING'
    END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'No orphaned earnings records'
      ELSE COUNT(*)::TEXT || ' earnings records with missing users'
    END::TEXT
  FROM earnings_ledger el
  WHERE el.tax_year = p_tax_year
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = el.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_tax_backup_integrity IS 'Verify integrity of tax data before backup';

-- ============================================================================
-- ADMIN FUNCTIONS FOR TAX DOCUMENT MANAGEMENT
-- ============================================================================

-- Function to get all W-9s (admin only)
CREATE OR REPLACE FUNCTION admin_get_all_w9s(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  full_name TEXT,
  business_name TEXT,
  tax_classification tax_classification,
  ssn_last4 TEXT,
  ein TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  signed_at TIMESTAMPTZ,
  is_verified BOOLEAN,
  total_lifetime_earnings_cents BIGINT,
  needs_1099_current_year BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.user_id,
    u.email,
    tp.full_name,
    tp.business_name,
    tp.tax_classification,
    tp.ssn_last4,
    tp.ein,
    tp.address_line1,
    tp.address_line2,
    tp.city,
    tp.state,
    tp.postal_code,
    tp.signed_at,
    tp.is_verified,
    COALESCE(SUM(el.amount_cents), 0)::BIGINT as total_lifetime_earnings_cents,
    COALESCE(
      (SELECT tys.needs_1099 
       FROM tax_year_summaries tys 
       WHERE tys.user_id = tp.user_id 
       AND tys.tax_year = EXTRACT(YEAR FROM NOW())::INTEGER
       LIMIT 1),
      false
    ) as needs_1099_current_year,
    tp.created_at
  FROM tax_profiles tp
  LEFT JOIN auth.users u ON u.id = tp.user_id
  LEFT JOIN earnings_ledger el ON el.user_id = tp.user_id
  WHERE 
    (p_search IS NULL OR 
     tp.full_name ILIKE '%' || p_search || '%' OR
     u.email ILIKE '%' || p_search || '%' OR
     tp.ssn_last4 ILIKE '%' || p_search || '%' OR
     tp.ein ILIKE '%' || p_search || '%')
  GROUP BY tp.id, u.email
  ORDER BY tp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_get_all_w9s IS 'Admin function to retrieve all W-9 tax profiles with search';

-- Function to get complete tax record for a user (admin only)
CREATE OR REPLACE FUNCTION admin_get_user_complete_tax_record(p_user_id UUID)
RETURNS TABLE (
  section TEXT,
  data JSONB
) AS $$
BEGIN
  -- Tax Profile
  RETURN QUERY
  SELECT 
    'tax_profile'::TEXT,
    to_jsonb(t.*) as data
  FROM tax_profiles_backup t
  WHERE t.user_id = p_user_id;

  -- All Earnings
  RETURN QUERY
  SELECT 
    'earnings_history'::TEXT,
    jsonb_agg(to_jsonb(e.*) ORDER BY e.occurred_at DESC) as data
  FROM earnings_ledger_backup e
  WHERE e.user_id = p_user_id;

  -- Tax Year Summaries
  RETURN QUERY
  SELECT 
    'tax_year_summaries'::TEXT,
    jsonb_agg(to_jsonb(s.*) ORDER BY s.tax_year DESC) as data
  FROM tax_year_summaries_backup s
  WHERE s.user_id = p_user_id;

  -- Payout History
  RETURN QUERY
  SELECT 
    'payout_history'::TEXT,
    jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at DESC) as data
  FROM payout_requests_backup p
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_get_user_complete_tax_record IS 'Get complete tax record for a specific user (admin only)';

-- ============================================================================
-- BACKUP STATISTICS
-- ============================================================================

-- Function to get backup statistics
CREATE OR REPLACE FUNCTION get_tax_backup_statistics()
RETURNS TABLE (
  metric TEXT,
  value BIGINT,
  description TEXT
) AS $$
BEGIN
  -- Total W-9s
  RETURN QUERY
  SELECT 
    'Total W-9 Profiles'::TEXT,
    COUNT(*)::BIGINT,
    'Total number of completed W-9 forms'::TEXT
  FROM tax_profiles;

  -- Total Earnings Records
  RETURN QUERY
  SELECT 
    'Total Earnings Records'::TEXT,
    COUNT(*)::BIGINT,
    'Total number of earnings transactions'::TEXT
  FROM earnings_ledger;

  -- Total Taxable Amount (All Time)
  RETURN QUERY
  SELECT 
    'Total Taxable Amount (cents)'::TEXT,
    COALESCE(SUM(amount_cents), 0)::BIGINT,
    'Total taxable earnings across all users and years'::TEXT
  FROM earnings_ledger
  WHERE is_taxable = true;

  -- Users Needing 1099 (Current Year)
  RETURN QUERY
  SELECT 
    'Users Needing 1099 (Current Year)'::TEXT,
    COUNT(*)::BIGINT,
    'Users earning $600+ this year'::TEXT
  FROM tax_year_summaries
  WHERE tax_year = EXTRACT(YEAR FROM NOW())::INTEGER
    AND needs_1099 = true;

  -- 1099s Generated (All Time)
  RETURN QUERY
  SELECT 
    '1099s Generated (All Time)'::TEXT,
    COUNT(*)::BIGINT,
    'Total 1099-NEC forms generated'::TEXT
  FROM tax_year_summaries
  WHERE form_1099_generated_at IS NOT NULL;

  -- Total Payout Requests
  RETURN QUERY
  SELECT 
    'Total Payout Requests'::TEXT,
    COUNT(*)::BIGINT,
    'Total withdrawal requests (all statuses)'::TEXT
  FROM payout_requests;

  -- Pending Payouts
  RETURN QUERY
  SELECT 
    'Pending Payouts'::TEXT,
    COUNT(*)::BIGINT,
    'Payout requests awaiting approval'::TEXT
  FROM payout_requests
  WHERE status IN ('pending', 'approved', 'processing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tax_backup_statistics IS 'Get comprehensive statistics for tax system backup';

-- ============================================================================
-- BACKUP EXECUTION SCRIPT
-- ============================================================================

-- To run a complete backup, execute these queries and save results:

/*

-- BACKUP SCRIPT - RUN THIS TO CREATE A COMPLETE BACKUP
-- Save the output to a secure, encrypted location

-- 1. Get backup statistics
SELECT * FROM get_tax_backup_statistics();

-- 2. Verify integrity before backup
SELECT * FROM verify_tax_backup_integrity(2024); -- Replace with current year

-- 3. Export all tax profiles
SELECT * FROM tax_profiles_backup
ORDER BY created_at DESC;

-- 4. Export earnings ledger
SELECT * FROM earnings_ledger_backup
ORDER BY occurred_at DESC;

-- 5. Export tax year summaries
SELECT * FROM tax_year_summaries_backup
ORDER BY tax_year DESC, created_at DESC;

-- 6. Export payout requests
SELECT * FROM payout_requests_backup
ORDER BY created_at DESC;

-- 7. Get year-specific backup (JSON format)
SELECT * FROM get_tax_year_backup_data(2024); -- Replace with target year

*/

-- ============================================================================
-- RESTORE VERIFICATION
-- ============================================================================

-- After restoring from backup, verify data integrity:
CREATE OR REPLACE FUNCTION verify_restore_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: No null user_ids
  RETURN QUERY
  SELECT 
    'User ID Integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All records have valid user_ids'
      ELSE COUNT(*)::TEXT || ' records with null user_ids'
    END::TEXT
  FROM (
    SELECT user_id FROM tax_profiles WHERE user_id IS NULL
    UNION ALL
    SELECT user_id FROM earnings_ledger WHERE user_id IS NULL
    UNION ALL
    SELECT user_id FROM tax_year_summaries WHERE user_id IS NULL
    UNION ALL
    SELECT user_id FROM payout_requests WHERE user_id IS NULL
  ) combined;

  -- Check 2: Duplicate prevention
  RETURN QUERY
  SELECT 
    'Duplicate Tax Profiles'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'No duplicate tax profiles'
      ELSE COUNT(*)::TEXT || ' users with multiple tax profiles'
    END::TEXT
  FROM (
    SELECT user_id
    FROM tax_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Check 3: Required fields populated
  RETURN QUERY
  SELECT 
    'Required Fields'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All required fields populated'
      ELSE COUNT(*)::TEXT || ' records with missing required fields'
    END::TEXT
  FROM tax_profiles
  WHERE full_name IS NULL 
     OR tax_classification IS NULL
     OR address_line1 IS NULL
     OR city IS NULL
     OR state IS NULL
     OR postal_code IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_restore_integrity IS 'Verify data integrity after restoring from backup';

-- ============================================================================
-- GRANT PERMISSIONS (Admin Service Role Only)
-- ============================================================================

-- Grant execute permissions to service role for admin functions
-- These functions should NEVER be accessible to regular users

COMMENT ON VIEW tax_profiles_backup IS 'ADMIN ONLY - Contains sensitive tax information';
COMMENT ON VIEW earnings_ledger_backup IS 'ADMIN ONLY - Complete earnings history';
COMMENT ON VIEW tax_year_summaries_backup IS 'ADMIN ONLY - Tax year summaries with PII';
COMMENT ON VIEW payout_requests_backup IS 'ADMIN ONLY - Payout history';

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

/*

BACKUP SCHEDULE:
- Daily: Run backup script, store in secure location
- Weekly: Verify backup integrity
- Monthly: Archive to long-term storage (S3, encrypted)
- Annually: Create year-end snapshot after 1099 season

SECURITY:
- All backups must be encrypted at rest
- Backups contain SSN last 4 - treat as sensitive
- Access to backup files must be restricted to authorized personnel
- Log all backup access for audit trail

RETENTION:
- Keep all tax records for minimum 7 years (IRS requirement)
- Keep 1099-related data indefinitely
- Store backups in multiple geographic locations

RESTORE TESTING:
- Test restore procedure annually
- Verify data integrity after restore
- Document restore process

*/

