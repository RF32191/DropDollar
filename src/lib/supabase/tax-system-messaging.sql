-- ============================================================================
-- TAX SYSTEM MESSAGING - Internal User Notifications
-- ============================================================================
--
-- Instead of emailing 1099s, send them as internal messages to users.
-- Users can view their tax documents in their account dashboard.
--
-- ============================================================================

-- Create user notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'success', 'tax_document'
  
  -- Tax Document Specific
  tax_year INTEGER,
  document_type TEXT, -- 'w9_confirmation', '1099_nec', 'tax_summary'
  document_url TEXT,
  amount_cents INTEGER,
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  
  -- Metadata
  metadata JSONB
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS FOR TAX MESSAGING
-- ============================================================================

-- Function to send 1099 notification to user
CREATE OR REPLACE FUNCTION send_1099_notification(
  p_user_id UUID,
  p_tax_year INTEGER,
  p_amount_cents INTEGER,
  p_document_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    tax_year,
    document_type,
    document_url,
    amount_cents
  ) VALUES (
    p_user_id,
    format('Your %s 1099-NEC Tax Form is Ready', p_tax_year),
    format(
      'Your 1099-NEC form for tax year %s is now available. You earned $%s during the year. ' ||
      'Please review this document for your tax filing. If you have any questions, please contact support.',
      p_tax_year,
      (p_amount_cents / 100.0)::numeric(10,2)
    ),
    'tax_document',
    p_tax_year,
    '1099_nec',
    p_document_url,
    p_amount_cents
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send W-9 confirmation notification
CREATE OR REPLACE FUNCTION send_w9_confirmation(
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    document_type
  ) VALUES (
    p_user_id,
    'W-9 Tax Information Submitted Successfully',
    'Your W-9 tax information has been submitted and saved. You can now withdraw funds from your account. ' ||
    'If you earn $600 or more in a calendar year, you will receive a 1099-NEC form by January 31.',
    'success',
    'w9_confirmation'
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send tax threshold notification
CREATE OR REPLACE FUNCTION send_tax_threshold_notification(
  p_user_id UUID,
  p_tax_year INTEGER,
  p_amount_cents INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    tax_year,
    amount_cents
  ) VALUES (
    p_user_id,
    format('%s Tax Reporting Notification', p_tax_year),
    format(
      'You have earned $%s in %s. Since your earnings exceed $600, we are required to report ' ||
      'your income to the IRS. You will receive a 1099-NEC form by January 31, %s.',
      (p_amount_cents / 100.0)::numeric(10,2),
      p_tax_year,
      p_tax_year + 1
    ),
    'info',
    p_tax_year,
    p_amount_cents
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread tax notifications for a user
CREATE OR REPLACE FUNCTION get_user_tax_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  tax_year INTEGER,
  document_type TEXT,
  document_url TEXT,
  amount_cents INTEGER,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    un.id,
    un.title,
    un.message,
    un.type,
    un.tax_year,
    un.document_type,
    un.document_url,
    un.amount_cents,
    un.is_read,
    un.created_at
  FROM user_notifications un
  WHERE un.user_id = p_user_id
    AND (un.type = 'tax_document' OR un.document_type IS NOT NULL)
  ORDER BY un.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = p_user_id;
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Auto-send W-9 confirmation
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_send_w9_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Send confirmation notification when W-9 is submitted
  PERFORM send_w9_confirmation(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_profile_w9_confirmation ON tax_profiles;
CREATE TRIGGER tax_profile_w9_confirmation
  AFTER INSERT ON tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_w9_confirmation();

-- ============================================================================
-- TRIGGER: Auto-send tax threshold notification
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_send_threshold_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification when user crosses $600 threshold
  IF NEW.needs_1099 = TRUE AND (OLD.needs_1099 IS NULL OR OLD.needs_1099 = FALSE) THEN
    PERFORM send_tax_threshold_notification(
      NEW.user_id,
      NEW.tax_year,
      NEW.total_earnings_cents
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_year_threshold_notification ON tax_year_summaries;
CREATE TRIGGER tax_year_threshold_notification
  AFTER INSERT OR UPDATE ON tax_year_summaries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_threshold_notification();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_notifications IS 'Internal messaging system for tax documents and notifications';
COMMENT ON FUNCTION send_1099_notification IS 'Send 1099-NEC notification to user (replaces email)';
COMMENT ON FUNCTION send_w9_confirmation IS 'Send W-9 submission confirmation to user';
COMMENT ON FUNCTION send_tax_threshold_notification IS 'Notify user when they cross $600 threshold';
COMMENT ON FUNCTION get_user_tax_notifications IS 'Get all tax-related notifications for a user';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

/*

-- Send a 1099 notification to a user
SELECT send_1099_notification(
  'user-uuid-here',
  2024,
  125000, -- $1,250.00
  'https://storage.supabase.co/bucket/1099-2024-user.pdf'
);

-- Get user's tax notifications
SELECT * FROM get_user_tax_notifications('user-uuid-here', 10);

-- Mark notification as read
SELECT mark_notification_read('notification-uuid', 'user-uuid');

*/

