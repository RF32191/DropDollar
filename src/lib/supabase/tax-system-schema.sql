-- ============================================================================
-- TAX REPORTING SYSTEM - W-9 & 1099-NEC COMPLIANCE
-- ============================================================================
-- 
-- LEGAL DISCLAIMER: This implementation follows IRS guidelines to the best
-- of our ability. MUST be reviewed by a licensed CPA and tax attorney before
-- production use. This is NOT legal or tax advice.
--
-- Purpose: Enable collection of W-9 information and automatic 1099-NEC
-- generation for users earning $600+ annually in prizes/winnings.
--
-- IRS References:
-- - Form W-9: https://www.irs.gov/forms-pubs/about-form-w-9
-- - Form 1099-NEC: https://www.irs.gov/forms-pubs/about-form-1099-nec
-- - $600 Reporting Threshold: 26 U.S. Code § 6041
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Drop existing types if they exist (for re-running this script)
DROP TYPE IF EXISTS tax_classification CASCADE;
DROP TYPE IF EXISTS payout_status CASCADE;
DROP TYPE IF EXISTS form_1099_delivery_status CASCADE;
DROP TYPE IF EXISTS earnings_source_type CASCADE;

-- Tax classification options from IRS Form W-9
CREATE TYPE tax_classification AS ENUM (
  'individual',           -- Individual/sole proprietor or single-member LLC
  'c_corporation',        -- C Corporation
  's_corporation',        -- S Corporation
  'partnership',          -- Partnership
  'trust_estate',         -- Trust/estate
  'llc',                  -- Limited liability company (multi-member)
  'other'                 -- Other
);

-- Payment/withdrawal request statuses
CREATE TYPE payout_status AS ENUM (
  'pending',              -- Waiting for approval
  'blocked_tax',          -- Blocked - W-9 required
  'approved',             -- Approved, ready to process
  'processing',           -- Payment in progress
  'paid',                 -- Payment completed
  'rejected',             -- Request rejected
  'cancelled'             -- Cancelled by user
);

-- 1099 delivery tracking
CREATE TYPE form_1099_delivery_status AS ENUM (
  'not_generated',        -- Not yet generated
  'generated',            -- PDF/data generated
  'sent_email',           -- Emailed to recipient
  'bounced',              -- Email delivery failed
  'error'                 -- Generation or delivery error
);

-- Earnings source types for audit trail
CREATE TYPE earnings_source_type AS ENUM (
  'game_win',             -- Prize from game win
  'tournament_prize',     -- Tournament prize
  'bonus',                -- Platform bonus
  'referral',             -- Referral reward
  'promotion',            -- Promotional credit
  'adjustment',           -- Manual adjustment (positive or negative)
  'refund',               -- Refund issued
  'chargeback'            -- Chargeback (negative)
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TAX PROFILES - W-9 Information Storage
-- ----------------------------------------------------------------------------
-- SECURITY NOTE: Full SSNs should NEVER be stored. Only last 4 digits.
-- EINs may be stored in full as they are less sensitive than SSNs.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS tax_profiles CASCADE;
CREATE TABLE tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal/Business Information (from W-9)
  full_name TEXT NOT NULL,                            -- Legal name on tax return
  business_name TEXT,                                 -- Trade name (if different)
  tax_classification tax_classification NOT NULL DEFAULT 'individual',
  
  -- Tax Identification Numbers
  -- CRITICAL: Only store last 4 digits of SSN for security
  ssn_last4 TEXT CHECK (ssn_last4 ~ '^\d{4}$'),      -- Last 4 digits of SSN only
  ein TEXT CHECK (ein ~ '^\d{2}-?\d{7}$'),           -- Employer Identification Number (full)
  
  -- Mailing Address (from W-9)
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (length(state) = 2),     -- US state code (e.g., "CA")
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  
  -- Electronic Signature Metadata (legal requirement for e-signed W-9)
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_ip TEXT NOT NULL,                         -- IP address when signed
  signature_user_agent TEXT NOT NULL,                 -- Browser/device info
  electronic_consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Verification Status
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,         -- Manual admin verification flag
  verified_by UUID REFERENCES auth.users(id),         -- Admin who verified
  verified_at TIMESTAMPTZ,
  
  -- Audit Trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),                                    -- One tax profile per user
  -- At least SSN last 4 OR EIN must be provided
  CHECK (ssn_last4 IS NOT NULL OR ein IS NOT NULL)
);

-- Index for fast user lookup
CREATE INDEX idx_tax_profiles_user_id ON tax_profiles(user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tax_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_profiles_updated_at_trigger
BEFORE UPDATE ON tax_profiles
FOR EACH ROW
EXECUTE FUNCTION update_tax_profiles_updated_at();

-- ----------------------------------------------------------------------------
-- EARNINGS LEDGER - Comprehensive Transaction Log
-- ----------------------------------------------------------------------------
-- Tracks ALL taxable income for 1099 reporting.
-- DO NOT delete records; use negative adjustments for refunds/chargebacks.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS earnings_ledger CASCADE;
CREATE TABLE earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Financial Details
  amount_cents INTEGER NOT NULL,                      -- Can be negative for adjustments
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Source Tracking
  source_type earnings_source_type NOT NULL,
  source_reference_id TEXT,                           -- FK to game_sessions, tournaments, etc.
  description TEXT,                                   -- Human-readable description
  
  -- Timing
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- When the earning occurred
  
  -- Tax Reporting Flags
  tax_year INTEGER NOT NULL,                          -- Calculated from occurred_at
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,           -- Most earnings are taxable
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),          -- Admin who created (for adjustments)
  
  -- Audit
  metadata JSONB                                      -- Additional context (game details, etc.)
);

-- Indexes for performance
CREATE INDEX idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX idx_earnings_ledger_user_tax_year ON earnings_ledger(user_id, tax_year);
CREATE INDEX idx_earnings_ledger_occurred_at ON earnings_ledger(occurred_at);
CREATE INDEX idx_earnings_ledger_source ON earnings_ledger(source_type, source_reference_id);

-- Automatically calculate tax_year from occurred_at
CREATE OR REPLACE FUNCTION set_earnings_tax_year()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tax_year = EXTRACT(YEAR FROM NEW.occurred_at)::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER earnings_ledger_tax_year_trigger
BEFORE INSERT OR UPDATE ON earnings_ledger
FOR EACH ROW
EXECUTE FUNCTION set_earnings_tax_year();

-- ----------------------------------------------------------------------------
-- PAYOUT REQUESTS - Withdrawal/Prize Redemption Tracking
-- ----------------------------------------------------------------------------
-- Blocks payouts if user hasn't completed W-9.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS payout_requests CASCADE;
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Amount
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Status & Blocking
  status payout_status NOT NULL DEFAULT 'pending',
  blocked_reason TEXT,                                -- e.g., "W-9 required", "Insufficient balance"
  
  -- Payment Details (populated when approved/paid)
  payment_method TEXT,                                -- e.g., "stripe", "paypal", "check"
  payment_reference_id TEXT,                          -- External transaction ID
  paid_at TIMESTAMPTZ,
  
  -- Admin Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
CREATE INDEX idx_payout_requests_created_at ON payout_requests(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_payout_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payout_requests_updated_at_trigger
BEFORE UPDATE ON payout_requests
FOR EACH ROW
EXECUTE FUNCTION update_payout_requests_updated_at();

-- ----------------------------------------------------------------------------
-- TAX YEAR SUMMARIES - Cached Annual Totals for 1099 Generation
-- ----------------------------------------------------------------------------
-- Pre-computed annual earnings totals. Regenerated whenever earnings change.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS tax_year_summaries CASCADE;
CREATE TABLE tax_year_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year >= 2023 AND tax_year <= 2100),
  
  -- Earnings Totals
  total_earnings_cents INTEGER NOT NULL DEFAULT 0,    -- Sum of all taxable earnings
  total_earnings_count INTEGER NOT NULL DEFAULT 0,    -- Number of earning transactions
  
  -- 1099 Determination
  needs_1099 BOOLEAN NOT NULL DEFAULT FALSE,          -- TRUE if >= $600 earned
  threshold_met_at TIMESTAMPTZ,                       -- When $600 threshold was crossed
  
  -- 1099 Generation Status
  form_1099_generated_at TIMESTAMPTZ,
  form_1099_delivery_status form_1099_delivery_status NOT NULL DEFAULT 'not_generated',
  form_1099_pdf_url TEXT,                             -- URL to stored PDF (Supabase Storage)
  form_1099_sent_at TIMESTAMPTZ,
  form_1099_error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, tax_year)                           -- One summary per user per year
);

-- Indexes
CREATE INDEX idx_tax_year_summaries_user_year ON tax_year_summaries(user_id, tax_year);
CREATE INDEX idx_tax_year_summaries_needs_1099 ON tax_year_summaries(needs_1099) WHERE needs_1099 = TRUE;
CREATE INDEX idx_tax_year_summaries_delivery_status ON tax_year_summaries(form_1099_delivery_status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tax_year_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_year_summaries_updated_at_trigger
BEFORE UPDATE ON tax_year_summaries
FOR EACH ROW
EXECUTE FUNCTION update_tax_year_summaries_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Check if user has completed W-9
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_user_tax_verified(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tax_profiles 
    WHERE user_id = p_user_id 
    AND electronic_consent_given = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Record an earning and update tax year summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_earning(
  p_user_id UUID,
  p_amount_cents INTEGER,
  p_source_type earnings_source_type,
  p_source_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_earning_id UUID;
  v_tax_year INTEGER;
BEGIN
  -- Extract tax year
  v_tax_year := EXTRACT(YEAR FROM p_occurred_at)::INTEGER;
  
  -- Insert earning record
  INSERT INTO earnings_ledger (
    user_id,
    amount_cents,
    source_type,
    source_reference_id,
    description,
    occurred_at,
    tax_year
  ) VALUES (
    p_user_id,
    p_amount_cents,
    p_source_type,
    p_source_reference_id,
    p_description,
    p_occurred_at,
    v_tax_year
  ) RETURNING id INTO v_earning_id;
  
  -- Update or create tax year summary
  PERFORM recalculate_tax_year_summary(p_user_id, v_tax_year);
  
  RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Recalculate tax year summary for a user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_tax_year_summary(
  p_user_id UUID,
  p_tax_year INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_total_cents INTEGER;
  v_total_count INTEGER;
  v_needs_1099 BOOLEAN;
  v_threshold_met_at TIMESTAMPTZ;
BEGIN
  -- Calculate totals from earnings ledger
  SELECT 
    COALESCE(SUM(amount_cents), 0),
    COUNT(*)
  INTO v_total_cents, v_total_count
  FROM earnings_ledger
  WHERE user_id = p_user_id
    AND tax_year = p_tax_year
    AND is_taxable = TRUE;
  
  -- Determine if 1099 is needed ($600 threshold = 60000 cents)
  v_needs_1099 := (v_total_cents >= 60000);
  
  -- Find when threshold was first met
  IF v_needs_1099 THEN
    SELECT occurred_at INTO v_threshold_met_at
    FROM (
      SELECT occurred_at,
             SUM(amount_cents) OVER (ORDER BY occurred_at) AS running_total
      FROM earnings_ledger
      WHERE user_id = p_user_id
        AND tax_year = p_tax_year
        AND is_taxable = TRUE
    ) t
    WHERE running_total >= 60000
    ORDER BY occurred_at
    LIMIT 1;
  END IF;
  
  -- Insert or update summary
  INSERT INTO tax_year_summaries (
    user_id,
    tax_year,
    total_earnings_cents,
    total_earnings_count,
    needs_1099,
    threshold_met_at
  ) VALUES (
    p_user_id,
    p_tax_year,
    v_total_cents,
    v_total_count,
    v_needs_1099,
    v_threshold_met_at
  )
  ON CONFLICT (user_id, tax_year) DO UPDATE SET
    total_earnings_cents = EXCLUDED.total_earnings_cents,
    total_earnings_count = EXCLUDED.total_earnings_count,
    needs_1099 = EXCLUDED.needs_1099,
    threshold_met_at = COALESCE(tax_year_summaries.threshold_met_at, EXCLUDED.threshold_met_at),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Get users requiring 1099s for a given year
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_users_needing_1099(p_tax_year INTEGER)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  total_earnings_cents INTEGER,
  full_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  ssn_last4 TEXT,
  ein TEXT,
  tax_classification tax_classification
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tys.user_id,
    u.email,
    tys.total_earnings_cents,
    tp.full_name,
    tp.address_line1,
    tp.address_line2,
    tp.city,
    tp.state,
    tp.postal_code,
    tp.ssn_last4,
    tp.ein,
    tp.tax_classification
  FROM tax_year_summaries tys
  JOIN auth.users u ON u.id = tys.user_id
  JOIN tax_profiles tp ON tp.user_id = tys.user_id
  WHERE tys.tax_year = p_tax_year
    AND tys.needs_1099 = TRUE
    AND tys.form_1099_generated_at IS NULL
  ORDER BY tys.total_earnings_cents DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Users can only access their own tax data.
-- Admins/server roles need elevated access via service role.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_year_summaries ENABLE ROW LEVEL SECURITY;

-- Tax Profiles: Users can read their own, insert once, and update their own
DROP POLICY IF EXISTS "Users can view own tax profile" ON tax_profiles;
CREATE POLICY "Users can view own tax profile"
  ON tax_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tax profile" ON tax_profiles;
CREATE POLICY "Users can create own tax profile"
  ON tax_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tax profile" ON tax_profiles;
CREATE POLICY "Users can update own tax profile"
  ON tax_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Earnings Ledger: Users can read their own earnings (no insert/update - server-side only)
DROP POLICY IF EXISTS "Users can view own earnings" ON earnings_ledger;
CREATE POLICY "Users can view own earnings"
  ON earnings_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Payout Requests: Users can view and create their own
DROP POLICY IF EXISTS "Users can view own payout requests" ON payout_requests;
CREATE POLICY "Users can view own payout requests"
  ON payout_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own payout requests" ON payout_requests;
CREATE POLICY "Users can create own payout requests"
  ON payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tax Year Summaries: Users can read their own
DROP POLICY IF EXISTS "Users can view own tax summaries" ON tax_year_summaries;
CREATE POLICY "Users can view own tax summaries"
  ON tax_year_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA & COMMENTS
-- ============================================================================

COMMENT ON TABLE tax_profiles IS 'Stores W-9 equivalent information for tax reporting. Only last 4 digits of SSN are stored for security.';
COMMENT ON TABLE earnings_ledger IS 'Comprehensive log of all taxable earnings. Never delete records; use negative adjustments.';
COMMENT ON TABLE payout_requests IS 'Tracks all withdrawal/prize redemption requests. Blocks payouts if W-9 incomplete.';
COMMENT ON TABLE tax_year_summaries IS 'Cached annual earnings totals for efficient 1099 generation.';

COMMENT ON COLUMN tax_profiles.ssn_last4 IS 'SECURITY: Only last 4 digits of SSN. Never store full SSN.';
COMMENT ON COLUMN tax_profiles.signature_ip IS 'Legal requirement: IP address when electronically signing W-9.';
COMMENT ON COLUMN earnings_ledger.is_taxable IS 'Flag to exclude certain earnings from 1099 reporting (e.g., promotional credits).';
COMMENT ON COLUMN tax_year_summaries.needs_1099 IS 'TRUE if user earned $600+ in the tax year (IRS reporting threshold).';

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================
-- 
-- Before deploying to production:
-- 
-- 1. LEGAL REVIEW: Have a CPA and tax attorney review this schema
-- 2. PAYER INFO: Configure your company's legal name, EIN, and address
-- 3. ENCRYPTION: Consider additional encryption for SSN last 4 digits
-- 4. BACKUP: Ensure tax data is included in backup/disaster recovery plans
-- 5. RETENTION: Set up long-term archival per IRS requirements (7+ years)
-- 6. AUDIT LOGS: Enable database audit logging for tax-related tables
-- 7. E-FILE PROVIDER: Sign up with Tax1099, Track1099, or similar service
-- 8. TESTING: Test with dummy data before going live
-- 
-- ============================================================================

