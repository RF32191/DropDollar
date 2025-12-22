-- ============================================================
-- ACCOUNT MANAGEMENT TOKENS TABLE
-- Run this in Supabase SQL Editor to enable SMS link-based account management
-- ============================================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.account_management_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    phone_number TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_amt_token ON public.account_management_tokens(token);
CREATE INDEX IF NOT EXISTS idx_amt_user ON public.account_management_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_amt_expires ON public.account_management_tokens(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.account_management_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON public.account_management_tokens;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access" ON public.account_management_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.account_management_tokens TO service_role;
GRANT ALL ON public.account_management_tokens TO postgres;
GRANT ALL ON public.account_management_tokens TO authenticated;

-- Add helpful comment
COMMENT ON TABLE public.account_management_tokens IS 'Stores temporary tokens for SMS-based account management links. Tokens expire after 30 minutes.';

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'account_management_tokens') THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCCESS! account_management_tokens table is ready!';
        RAISE NOTICE '';
        RAISE NOTICE 'SMS link-based account management is now enabled.';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Table creation may have failed. Check for errors above.';
    END IF;
END $$;

