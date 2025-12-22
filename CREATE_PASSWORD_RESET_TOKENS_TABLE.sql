-- Create password_reset_tokens table for phone-based password reset
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can only have one active reset token
    CONSTRAINT unique_user_reset UNIQUE (user_id)
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow server-side access (no client access for security)
-- The service role key will bypass RLS

-- Policy to allow inserts from authenticated service
CREATE POLICY "Service role can manage tokens" ON public.password_reset_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.password_reset_tokens IS 'Stores temporary tokens for phone-based password reset. Tokens expire after 15 minutes.';

-- Grant access to service role
GRANT ALL ON public.password_reset_tokens TO service_role;
GRANT ALL ON public.password_reset_tokens TO postgres;

