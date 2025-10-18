-- ========================================
-- CREATE MISSING USER_BALANCES TABLE
-- ========================================
-- This script creates the user_balances table if it doesn't exist
-- Run this in Supabase SQL Editor before running the security fix

-- ========================================
-- CREATE USER_BALANCES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  drop_tokens INTEGER NOT NULL DEFAULT 0 CHECK (drop_tokens >= 0),
  cash_balance_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (cash_balance_usd >= 0),
  pending_earnings_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (pending_earnings_usd >= 0),
  total_wagered_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_wagered_usd >= 0),
  total_won_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_won_usd >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ========================================
-- CREATE INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances (user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_tokens ON public.user_balances (drop_tokens DESC);
CREATE INDEX IF NOT EXISTS idx_user_balances_cash ON public.user_balances (cash_balance_usd DESC);

-- ========================================
-- ENABLE RLS
-- ========================================
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE BASIC POLICIES
-- ========================================
CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- GRANT PERMISSIONS
-- ========================================
GRANT ALL ON public.user_balances TO authenticated;
GRANT SELECT ON public.user_balances TO anon;

-- ========================================
-- CREATE UPDATE TRIGGER
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_balances_updated_at 
    BEFORE UPDATE ON public.user_balances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFY TABLE CREATION
-- ========================================
SELECT 'user_balances table created successfully!' as status;

-- Check if table exists
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_balances';
