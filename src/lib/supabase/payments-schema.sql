-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_charge_id TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL, -- Amount in dollars
  currency TEXT DEFAULT 'usd',
  type TEXT NOT NULL, -- 'listing', 'tournament', 'match', 'hotsell', 'ad_campaign'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'canceled', 'refunded'
  metadata JSONB, -- Additional data (listingId, tournamentId, etc.)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  failure_reason TEXT,
  refund_reason TEXT,
  
  -- Indexes
  INDEX idx_payment_transactions_user (user_id),
  INDEX idx_payment_transactions_stripe (stripe_payment_intent_id),
  INDEX idx_payment_transactions_status (status, created_at),
  INDEX idx_payment_transactions_type (type, status)
);

-- Payment Disputes Table
CREATE TABLE IF NOT EXISTS public.payment_disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_dispute_id TEXT UNIQUE NOT NULL,
  charge_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  reason TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_payment_disputes_stripe (stripe_dispute_id),
  INDEX idx_payment_disputes_charge (charge_id)
);

-- Seller Payouts Table
CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT,
  stripe_account_id TEXT, -- Seller's Stripe Connect account
  amount DECIMAL(10,2) NOT NULL, -- Payout amount in dollars
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  
  -- Source transactions
  source_transactions JSONB, -- Array of payment_transaction IDs
  platform_fee DECIMAL(10,2) NOT NULL,
  stripe_fee DECIMAL(10,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  failure_reason TEXT,
  
  INDEX idx_seller_payouts_seller (seller_id),
  INDEX idx_seller_payouts_status (status, created_at)
);

-- Payment Methods Table (for saved cards)
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  type TEXT DEFAULT 'card', -- 'card', 'bank_account', etc.
  
  -- Card details (for display)
  card_brand TEXT, -- 'visa', 'mastercard', etc.
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_user_payment_methods_user (user_id),
  INDEX idx_user_payment_methods_stripe (stripe_payment_method_id)
);

-- Enable Row Level Security
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Payment Transactions
CREATE POLICY "Users can view their own payment transactions" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert payment transactions" ON public.payment_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update payment transactions" ON public.payment_transactions
  FOR UPDATE USING (true);

-- RLS Policies for Payment Disputes (Admin only)
CREATE POLICY "Admins can view payment disputes" ON public.payment_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can insert payment disputes" ON public.payment_disputes
  FOR INSERT WITH CHECK (true);

-- RLS Policies for Seller Payouts
CREATE POLICY "Sellers can view their own payouts" ON public.seller_payouts
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "System can insert seller payouts" ON public.seller_payouts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update seller payouts" ON public.seller_payouts
  FOR UPDATE USING (true);

-- RLS Policies for User Payment Methods
CREATE POLICY "Users can view their own payment methods" ON public.user_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON public.user_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON public.user_payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON public.user_payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for payment processing
CREATE OR REPLACE FUNCTION public.calculate_seller_payout(
  transaction_amount DECIMAL,
  platform_fee_percent DECIMAL DEFAULT 0.12
)
RETURNS TABLE(
  platform_fee DECIMAL,
  seller_amount DECIMAL,
  stripe_fee DECIMAL,
  net_seller_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY SELECT
    ROUND(transaction_amount * platform_fee_percent, 2) as platform_fee,
    ROUND(transaction_amount * (1 - platform_fee_percent), 2) as seller_amount,
    ROUND(transaction_amount * 0.029 + 0.30, 2) as stripe_fee, -- Stripe's standard fee
    ROUND(
      transaction_amount * (1 - platform_fee_percent) - 
      (transaction_amount * 0.029 + 0.30), 
      2
    ) as net_seller_amount;
END;
$$ LANGUAGE plpgsql;
