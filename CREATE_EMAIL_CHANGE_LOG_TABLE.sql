-- Create email_change_log table for auditing email changes
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.email_change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    old_email TEXT,
    new_email TEXT NOT NULL,
    verified_via TEXT DEFAULT 'phone', -- 'phone', 'email', 'admin'
    phone_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_change_log_user ON public.email_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_log_old_email ON public.email_change_log(old_email);
CREATE INDEX IF NOT EXISTS idx_email_change_log_new_email ON public.email_change_log(new_email);
CREATE INDEX IF NOT EXISTS idx_email_change_log_created ON public.email_change_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_change_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own email change history
CREATE POLICY "Users can view own email changes" ON public.email_change_log
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Only service role can insert (done via API)
CREATE POLICY "Service role can insert" ON public.email_change_log
    FOR INSERT
    WITH CHECK (true);

-- Grant access
GRANT ALL ON public.email_change_log TO service_role;
GRANT SELECT ON public.email_change_log TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.email_change_log IS 'Audit log for all email address changes. Used for security and support purposes.';

