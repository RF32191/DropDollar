-- ============================================================================
-- TAX SYSTEM DEPLOYMENT - COMPLETE SETUP
-- ============================================================================
-- Run this SINGLE FILE instead of the 3 separate files
-- This avoids deadlock issues by doing everything in one transaction
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP EVERYTHING (Clean Slate)
-- ============================================================================

-- Drop tables first (in reverse dependency order)
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS tax_year_summaries CASCADE;
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS earnings_ledger CASCADE;
DROP TABLE IF EXISTS tax_profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS earnings_source_type CASCADE;
DROP TYPE IF EXISTS form_1099_delivery_status CASCADE;
DROP TYPE IF EXISTS payout_status CASCADE;
DROP TYPE IF EXISTS tax_classification CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Drop functions - try all possible signatures
DROP FUNCTION IF EXISTS send_1099_notification(UUID, INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS send_w9_confirmation(UUID) CASCADE;
DROP FUNCTION IF EXISTS send_tax_threshold_notification(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_tax_notifications(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_tax_notifications() CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS admin_get_all_w9s() CASCADE;
DROP FUNCTION IF EXISTS admin_get_user_complete_tax_record(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_tax_year_backup_data(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS verify_tax_backup_integrity() CASCADE;
DROP FUNCTION IF EXISTS get_tax_backup_statistics() CASCADE;
DROP FUNCTION IF EXISTS update_tax_profiles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS set_earnings_tax_year() CASCADE;
DROP FUNCTION IF EXISTS update_payout_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_tax_year_summaries_updated_at() CASCADE;

-- ============================================================================
-- STEP 2: CREATE ENUMS
-- ============================================================================

-- Tax classification options from IRS Form W-9
CREATE TYPE tax_classification AS ENUM (
  'individual',
  'c_corporation',
  's_corporation',
  'partnership',
  'trust_estate',
  'llc',
  'other'
);

-- Payment/withdrawal request statuses
CREATE TYPE payout_status AS ENUM (
  'pending',
  'blocked_tax',
  'approved',
  'processing',
  'paid',
  'rejected',
  'cancelled'
);

-- 1099 delivery tracking
CREATE TYPE form_1099_delivery_status AS ENUM (
  'not_generated',
  'generated',
  'sent_email',
  'bounced',
  'error'
);

-- Earnings source types
CREATE TYPE earnings_source_type AS ENUM (
  'game_win',
  'tournament_prize',
  'bonus',
  'referral',
  'promotion',
  'adjustment',
  'refund',
  'chargeback'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'tax_document',
  'tax_reminder',
  'payout_update',
  'system'
);

-- ============================================================================
-- STEP 3: CREATE TABLES
-- ============================================================================

-- Tax Profiles (W-9 Information)
CREATE TABLE tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  business_name TEXT,
  tax_classification tax_classification NOT NULL DEFAULT 'individual',
  ssn_last4 TEXT CHECK (ssn_last4 ~ '^\d{4}$'),
  ein TEXT CHECK (ein ~ '^\d{2}-?\d{7}$'),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (length(state) = 2),
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_ip TEXT NOT NULL,
  signature_user_agent TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Earnings Ledger
CREATE TABLE earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source_type earnings_source_type NOT NULL,
  source_reference_id TEXT,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tax_year INTEGER NOT NULL,
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Payout Requests
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status payout_status NOT NULL DEFAULT 'pending',
  blocked_reason TEXT,
  payment_method TEXT,
  payment_reference_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tax Year Summaries
CREATE TABLE tax_year_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year >= 2023 AND tax_year <= 2100),
  total_earnings_cents INTEGER NOT NULL DEFAULT 0,
  needs_1099 BOOLEAN NOT NULL DEFAULT FALSE,
  form_1099_generated_at TIMESTAMPTZ,
  form_1099_delivery_status form_1099_delivery_status NOT NULL DEFAULT 'not_generated',
  form_1099_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tax_year)
);

-- User Notifications
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  tax_year INTEGER,
  document_url TEXT,
  document_data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_tax_profiles_user_id ON tax_profiles(user_id);
CREATE INDEX idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX idx_earnings_ledger_user_tax_year ON earnings_ledger(user_id, tax_year);
CREATE INDEX idx_earnings_ledger_occurred_at ON earnings_ledger(occurred_at);
CREATE INDEX idx_earnings_ledger_source ON earnings_ledger(source_type, source_reference_id);
CREATE INDEX idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
CREATE INDEX idx_payout_requests_created_at ON payout_requests(created_at DESC);
CREATE INDEX idx_tax_year_summaries_user_year ON tax_year_summaries(user_id, tax_year);
CREATE INDEX idx_tax_year_summaries_needs_1099 ON tax_year_summaries(needs_1099) WHERE needs_1099 = TRUE;
CREATE INDEX idx_tax_year_summaries_delivery_status ON tax_year_summaries(form_1099_delivery_status);
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- STEP 5: CREATE TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at for tax_profiles
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

-- Auto-calculate tax_year for earnings
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

-- Auto-update updated_at for payout_requests
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

-- Auto-update updated_at for tax_year_summaries
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
-- STEP 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_year_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax profile" ON tax_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tax profile" ON tax_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tax profile" ON tax_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own earnings" ON earnings_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payout requests" ON payout_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own payout requests" ON payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tax summaries" ON tax_year_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: ADMIN & HELPER FUNCTIONS
-- ============================================================================

-- Send 1099 notification
CREATE OR REPLACE FUNCTION send_1099_notification(
  p_user_id UUID,
  p_tax_year INTEGER,
  p_document_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    user_id,
    notification_type,
    title,
    message,
    tax_year,
    document_data
  ) VALUES (
    p_user_id,
    'tax_document',
    format('Your %s 1099-NEC Tax Form is Ready', p_tax_year),
    format('Your 1099-NEC form for tax year %s has been generated. Please download it for your tax records.', p_tax_year),
    p_tax_year,
    p_document_data
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user notifications
CREATE OR REPLACE FUNCTION get_user_tax_notifications(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  notification_type notification_type,
  title TEXT,
  message TEXT,
  tax_year INTEGER,
  document_data JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.notification_type,
    n.title,
    n.message,
    n.tax_year,
    n.document_data,
    n.is_read,
    n.created_at
  FROM user_notifications n
  WHERE n.user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Update your company info in src/lib/tax/config.ts
-- 2. Test the withdrawal flow
-- 3. Test the admin dashboard at /dashboard (Admin tab)
-- ============================================================================

