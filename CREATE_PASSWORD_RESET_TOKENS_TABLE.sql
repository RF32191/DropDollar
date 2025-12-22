-- ============================================================
-- PASSWORD RESET TOKENS TABLE
-- Run this in Supabase SQL Editor to enable phone-based password reset
-- ============================================================

-- Drop existing table if needed (uncomment if you want to recreate)
-- DROP TABLE IF EXISTS public.password_reset_tokens;

-- Create the table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    phone_number TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_prt_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON public.password_reset_tokens(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON public.password_reset_tokens;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access" ON public.password_reset_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.password_reset_tokens TO service_role;
GRANT ALL ON public.password_reset_tokens TO postgres;
GRANT ALL ON public.password_reset_tokens TO authenticated;

-- Add helpful comment
COMMENT ON TABLE public.password_reset_tokens IS 'Stores temporary tokens for phone-based password reset. Tokens expire after 15 minutes.';

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'password_reset_tokens') THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCCESS! password_reset_tokens table is ready!';
        RAISE NOTICE '';
        RAISE NOTICE 'Phone-based password reset is now enabled.';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Table creation may have failed. Check for errors above.';
    END IF;
END $$;
