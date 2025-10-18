-- ========================================
-- CREATE ALL MISSING TABLES FOR SECURITY FIX
-- ========================================
-- This script creates all tables that might be missing from your database
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
-- CREATE USER_LEVELS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  experience_points INTEGER NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
  games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  games_won INTEGER NOT NULL DEFAULT 0 CHECK (games_won >= 0),
  win_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (win_rate >= 0 AND win_rate <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ========================================
-- CREATE PAYMENT_TRANSACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_usd DECIMAL(10,2) NOT NULL CHECK (amount_usd > 0),
  tokens_purchased INTEGER NOT NULL CHECK (tokens_purchased > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE GAME_SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  session_data JSONB,
  is_practice BOOLEAN NOT NULL DEFAULT true,
  score INTEGER,
  accuracy DECIMAL(5,2),
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE ESCROW_TRANSACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2) NOT NULL CHECK (amount_usd > 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'game_entry', 'prize_payout')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE USER_BANK_ACCOUNTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE,
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  last_four_digits TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE SELLER_PAYOUTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2) NOT NULL CHECK (amount_usd > 0),
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE STRIPE_BANK_ACCOUNTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.stripe_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('individual', 'business')),
  country TEXT NOT NULL DEFAULT 'US',
  currency TEXT NOT NULL DEFAULT 'usd',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE WITHDRAWAL_REQUESTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2) NOT NULL CHECK (amount_usd > 0),
  bank_account_id UUID REFERENCES public.user_bank_accounts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CREATE INDEXES FOR ALL TABLES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances (user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON public.user_levels (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_user_id ON public.escrow_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON public.user_bank_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_user_id ON public.seller_payouts (user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_bank_accounts_user_id ON public.stripe_bank_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests (user_id);

-- ========================================
-- ENABLE RLS ON ALL TABLES
-- ========================================
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE BASIC POLICIES FOR ALL TABLES
-- ========================================
CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment transactions" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own game sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own escrow transactions" ON public.escrow_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own escrow transactions" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own seller payouts" ON public.seller_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seller payouts" ON public.seller_payouts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own stripe bank accounts" ON public.stripe_bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stripe bank accounts" ON public.stripe_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- GRANT PERMISSIONS
-- ========================================
GRANT ALL ON public.user_balances TO authenticated;
GRANT ALL ON public.user_levels TO authenticated;
GRANT ALL ON public.payment_transactions TO authenticated;
GRANT ALL ON public.game_sessions TO authenticated;
GRANT ALL ON public.escrow_transactions TO authenticated;
GRANT ALL ON public.user_bank_accounts TO authenticated;
GRANT ALL ON public.seller_payouts TO authenticated;
GRANT ALL ON public.stripe_bank_accounts TO authenticated;
GRANT ALL ON public.withdrawal_requests TO authenticated;

-- ========================================
-- CREATE UPDATE TRIGGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- CREATE UPDATE TRIGGERS
-- ========================================
CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON public.user_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON public.user_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrow_transactions_updated_at BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_bank_accounts_updated_at BEFORE UPDATE ON public.user_bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seller_payouts_updated_at BEFORE UPDATE ON public.seller_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_bank_accounts_updated_at BEFORE UPDATE ON public.stripe_bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFY ALL TABLES CREATED
-- ========================================
SELECT 'All missing tables created successfully!' as status;

-- Check which tables exist
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_balances', 
    'user_levels', 
    'payment_transactions', 
    'game_sessions', 
    'escrow_transactions', 
    'user_bank_accounts', 
    'seller_payouts', 
    'stripe_bank_accounts', 
    'withdrawal_requests'
)
ORDER BY tablename;
