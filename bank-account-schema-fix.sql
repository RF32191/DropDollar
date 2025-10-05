-- ADDITIONAL SCHEMA FIX FOR BANK ACCOUNT WITHDRAWALS
-- Run this AFTER the main schema fix to enable bank account linking

-- ========================================
-- CREATE USER_BANK_ACCOUNTS TABLE
-- ========================================
DROP TABLE IF EXISTS public.user_bank_accounts CASCADE;

CREATE TABLE public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE,
  account_type TEXT DEFAULT 'connect' CHECK (account_type IN ('checking', 'savings', 'connect')),
  bank_name TEXT DEFAULT 'Stripe Connect',
  last_four TEXT DEFAULT '****',
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT true,
  routing_number TEXT,
  account_holder_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for user_bank_accounts
CREATE INDEX idx_user_bank_accounts_user_id ON public.user_bank_accounts (user_id);
CREATE INDEX idx_user_bank_accounts_stripe_account_id ON public.user_bank_accounts (stripe_account_id);
CREATE INDEX idx_user_bank_accounts_is_default ON public.user_bank_accounts (is_default) WHERE is_default = true;

-- ========================================
-- CREATE WITHDRAWAL_REQUESTS TABLE
-- ========================================
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;

CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.user_bank_accounts(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for withdrawal_requests
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests (user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests (status);
CREATE INDEX idx_withdrawal_requests_requested_at ON public.withdrawal_requests (requested_at DESC);

-- ========================================
-- CREATE USER_TRANSACTIONS TABLE
-- ========================================
DROP TABLE IF EXISTS public.user_transactions CASCADE;

CREATE TABLE public.user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'earning', 'withdrawal', 'entry_fee', 'refund', 'bonus')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_id TEXT, -- Can reference listing_id, tournament_id, etc.
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_transactions
CREATE INDEX idx_user_transactions_user_id ON public.user_transactions (user_id);
CREATE INDEX idx_user_transactions_type ON public.user_transactions (type);
CREATE INDEX idx_user_transactions_status ON public.user_transactions (status);
CREATE INDEX idx_user_transactions_created_at ON public.user_transactions (created_at DESC);
CREATE INDEX idx_user_transactions_reference_id ON public.user_transactions (reference_id);

-- ========================================
-- CREATE SELLER_PAYOUTS TABLE
-- ========================================
DROP TABLE IF EXISTS public.seller_payouts CASCADE;

CREATE TABLE public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID,
  stripe_transfer_id TEXT UNIQUE,
  stripe_account_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0.00,
  stripe_fee DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for seller_payouts
CREATE INDEX idx_seller_payouts_seller_id ON public.seller_payouts (seller_id);
CREATE INDEX idx_seller_payouts_status ON public.seller_payouts (status);
CREATE INDEX idx_seller_payouts_processed_at ON public.seller_payouts (processed_at DESC);
CREATE INDEX idx_seller_payouts_stripe_transfer_id ON public.seller_payouts (stripe_transfer_id);

-- ========================================
-- CREATE ESCROW_TRANSACTIONS TABLE
-- ========================================
DROP TABLE IF EXISTS public.escrow_transactions CASCADE;

CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  seller_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
  delivery_confirmed BOOLEAN DEFAULT false,
  delivery_confirmed_at TIMESTAMPTZ,
  delivery_confirmed_by UUID REFERENCES public.users(id),
  tracking_number TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for escrow_transactions
CREATE INDEX idx_escrow_transactions_buyer_id ON public.escrow_transactions (buyer_id);
CREATE INDEX idx_escrow_transactions_seller_id ON public.escrow_transactions (seller_id);
CREATE INDEX idx_escrow_transactions_listing_id ON public.escrow_transactions (listing_id);
CREATE INDEX idx_escrow_transactions_status ON public.escrow_transactions (status);
CREATE INDEX idx_escrow_transactions_created_at ON public.escrow_transactions (created_at DESC);

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE RLS POLICIES FOR USER_BANK_ACCOUNTS
-- ========================================
CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- CREATE RLS POLICIES FOR WITHDRAWAL_REQUESTS
-- ========================================
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- CREATE RLS POLICIES FOR USER_TRANSACTIONS
-- ========================================
CREATE POLICY "Users can view own transactions" ON public.user_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for transaction logging" ON public.user_transactions
  FOR INSERT WITH CHECK (true);

-- ========================================
-- CREATE RLS POLICIES FOR SELLER_PAYOUTS
-- ========================================
CREATE POLICY "Sellers can view own payouts" ON public.seller_payouts
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Enable insert for payout processing" ON public.seller_payouts
  FOR INSERT WITH CHECK (true);

-- ========================================
-- CREATE RLS POLICIES FOR ESCROW_TRANSACTIONS
-- ========================================
CREATE POLICY "Buyers can view own escrow transactions" ON public.escrow_transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Enable insert for escrow creation" ON public.escrow_transactions
  FOR INSERT WITH CHECK (true);

-- ========================================
-- FINAL SCHEMA REFRESH
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 
    'user_bank_accounts' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_bank_accounts'
UNION ALL
SELECT 
    'withdrawal_requests' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'withdrawal_requests'
UNION ALL
SELECT 
    'user_transactions' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_transactions'
UNION ALL
SELECT 
    'Bank Account Schema Fix Status' as table_name,
    1 as column_count;

-- Success message
SELECT 'BANK ACCOUNT SCHEMA FIX COMPLETED! You can now link bank accounts for withdrawals.' as status;
