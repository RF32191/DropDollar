-- User Money Dashboard and Escrow System Schema

-- User Balances Table
CREATE TABLE IF NOT EXISTS public.user_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens INTEGER DEFAULT 0, -- DROP tokens
  cash_balance DECIMAL(10,2) DEFAULT 0.00, -- Available cash for withdrawal
  pending_earnings DECIMAL(10,2) DEFAULT 0.00, -- Earnings pending delivery confirmation
  total_spent DECIMAL(10,2) DEFAULT 0.00, -- Lifetime spending
  total_earned DECIMAL(10,2) DEFAULT 0.00, -- Lifetime earnings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one balance record per user
  UNIQUE(user_id),
  
  -- Constraints
  CHECK (tokens >= 0),
  CHECK (cash_balance >= 0),
  CHECK (pending_earnings >= 0),
  CHECK (total_spent >= 0),
  CHECK (total_earned >= 0)
);

-- User Transactions Table
CREATE TABLE IF NOT EXISTS public.user_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'purchase', 'earning', 'withdrawal', 'entry_fee', 'refund'
  amount DECIMAL(10,2) NOT NULL, -- Positive for credits, negative for debits
  description TEXT NOT NULL,
  status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed'
  
  -- Related records
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  listing_id UUID, -- Reference to listings if applicable
  tournament_id UUID, -- Reference to tournaments if applicable
  match_id UUID, -- Reference to matches if applicable
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_user_transactions_user (user_id, created_at DESC),
  INDEX idx_user_transactions_type (type, status),
  INDEX idx_user_transactions_payment (payment_transaction_id)
);

-- User Bank Accounts Table (for withdrawals)
CREATE TABLE IF NOT EXISTS public.user_bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT, -- Stripe Connect account ID
  account_type TEXT NOT NULL, -- 'checking', 'savings'
  bank_name TEXT NOT NULL,
  last_four TEXT NOT NULL, -- Last 4 digits of account number
  routing_number_hash TEXT, -- Hashed routing number for security
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_user_bank_accounts_user (user_id),
  INDEX idx_user_bank_accounts_stripe (stripe_account_id)
);

-- Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.user_bank_accounts(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  
  -- Stripe/Banking details
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  
  -- Processing details
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  failure_reason TEXT,
  admin_notes TEXT,
  
  -- Constraints
  CHECK (amount > 0),
  
  -- Indexes
  INDEX idx_withdrawal_requests_user (user_id, requested_at DESC),
  INDEX idx_withdrawal_requests_status (status, requested_at),
  INDEX idx_withdrawal_requests_stripe (stripe_transfer_id)
);

-- Escrow Transactions Table (for seller payments)
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL, -- Reference to the listing
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Transaction amounts
  total_amount DECIMAL(10,2) NOT NULL, -- Total paid by buyer
  platform_fee DECIMAL(10,2) NOT NULL, -- 12% platform cut
  seller_amount DECIMAL(10,2) NOT NULL, -- Amount to be paid to seller
  
  -- Escrow status
  status TEXT DEFAULT 'held', -- 'held', 'released', 'disputed', 'refunded'
  
  -- Delivery tracking
  delivery_confirmed BOOLEAN DEFAULT false,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  delivery_confirmed_by UUID REFERENCES auth.users(id), -- Who confirmed delivery
  
  -- Tracking information
  tracking_number TEXT,
  carrier TEXT,
  estimated_delivery DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE, -- When funds were released to seller
  
  -- Auto-release (if no disputes after X days)
  auto_release_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Constraints
  CHECK (total_amount > 0),
  CHECK (platform_fee >= 0),
  CHECK (seller_amount >= 0),
  CHECK (total_amount = platform_fee + seller_amount),
  
  -- Indexes
  INDEX idx_escrow_transactions_listing (listing_id),
  INDEX idx_escrow_transactions_buyer (buyer_id),
  INDEX idx_escrow_transactions_seller (seller_id),
  INDEX idx_escrow_transactions_status (status, created_at),
  INDEX idx_escrow_transactions_auto_release (auto_release_at, status)
);

-- Winner Payouts Table (for competition winners)
CREATE TABLE IF NOT EXISTS public.winner_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_type TEXT NOT NULL, -- 'tournament', 'hotsell', 'listing', 'match'
  competition_id TEXT NOT NULL, -- ID of the competition
  
  -- Payout details
  prize_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_payout DECIMAL(10,2) NOT NULL, -- Amount credited to user
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  
  -- Game details
  game_type TEXT,
  final_score DECIMAL(10,2),
  
  -- Timestamps
  won_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CHECK (prize_amount > 0),
  CHECK (platform_fee >= 0),
  CHECK (net_payout >= 0),
  
  -- Indexes
  INDEX idx_winner_payouts_user (user_id, won_at DESC),
  INDEX idx_winner_payouts_competition (competition_type, competition_id),
  INDEX idx_winner_payouts_status (status, won_at)
);

-- Enable Row Level Security
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Balances
CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON public.user_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert user balances" ON public.user_balances
  FOR INSERT WITH CHECK (true);

-- RLS Policies for User Transactions
CREATE POLICY "Users can view their own transactions" ON public.user_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON public.user_transactions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for Bank Accounts
CREATE POLICY "Users can manage their own bank accounts" ON public.user_bank_accounts
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for Withdrawal Requests
CREATE POLICY "Users can view their own withdrawal requests" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Escrow Transactions
CREATE POLICY "Buyers and sellers can view their escrow transactions" ON public.escrow_transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "System can manage escrow transactions" ON public.escrow_transactions
  FOR ALL WITH CHECK (true);

-- RLS Policies for Winner Payouts
CREATE POLICY "Users can view their own winner payouts" ON public.winner_payouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert winner payouts" ON public.winner_payouts
  FOR INSERT WITH CHECK (true);

-- Functions for balance management
CREATE OR REPLACE FUNCTION public.initialize_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_balances (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize balance for new users
DROP TRIGGER IF EXISTS on_auth_user_created_balance ON auth.users;
CREATE TRIGGER on_auth_user_created_balance
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_balance();

-- Function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_token_change INTEGER DEFAULT 0,
  p_cash_change DECIMAL DEFAULT 0,
  p_pending_change DECIMAL DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'adjustment',
  p_description TEXT DEFAULT 'Balance adjustment'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance RECORD;
BEGIN
  -- Get current balance
  SELECT * INTO current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id;
  
  -- Check if balance exists
  IF NOT FOUND THEN
    INSERT INTO public.user_balances (user_id, tokens, cash_balance, pending_earnings)
    VALUES (p_user_id, GREATEST(0, p_token_change), GREATEST(0, p_cash_change), GREATEST(0, p_pending_change));
  ELSE
    -- Update balance with constraints
    UPDATE public.user_balances
    SET 
      tokens = GREATEST(0, tokens + p_token_change),
      cash_balance = GREATEST(0, cash_balance + p_cash_change),
      pending_earnings = GREATEST(0, pending_earnings + p_pending_change),
      total_spent = CASE WHEN p_cash_change < 0 THEN total_spent + ABS(p_cash_change) ELSE total_spent END,
      total_earned = CASE WHEN p_cash_change > 0 THEN total_earned + p_cash_change ELSE total_earned END,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.user_transactions (
    user_id, type, amount, description, status
  ) VALUES (
    p_user_id, p_transaction_type, p_cash_change + p_pending_change, p_description, 'completed'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process escrow release
CREATE OR REPLACE FUNCTION public.release_escrow(
  p_escrow_id UUID,
  p_confirmed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  escrow_record RECORD;
BEGIN
  -- Get escrow details
  SELECT * INTO escrow_record
  FROM public.escrow_transactions
  WHERE id = p_escrow_id AND status = 'held';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update escrow status
  UPDATE public.escrow_transactions
  SET 
    status = 'released',
    delivery_confirmed = true,
    delivery_confirmed_at = NOW(),
    delivery_confirmed_by = p_confirmed_by,
    released_at = NOW()
  WHERE id = p_escrow_id;
  
  -- Credit seller's cash balance
  PERFORM public.update_user_balance(
    escrow_record.seller_id,
    0, -- no token change
    escrow_record.seller_amount, -- credit cash
    -escrow_record.seller_amount, -- remove from pending
    'earning',
    'Sale completed - ' || escrow_record.listing_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process winner payout
CREATE OR REPLACE FUNCTION public.process_winner_payout(
  p_user_id UUID,
  p_competition_type TEXT,
  p_competition_id TEXT,
  p_prize_amount DECIMAL,
  p_game_type TEXT DEFAULT NULL,
  p_final_score DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  platform_fee DECIMAL;
  net_payout DECIMAL;
BEGIN
  -- Calculate platform fee (15% for competitions)
  platform_fee := p_prize_amount * 0.15;
  net_payout := p_prize_amount - platform_fee;
  
  -- Record winner payout
  INSERT INTO public.winner_payouts (
    user_id, competition_type, competition_id, prize_amount, 
    platform_fee, net_payout, game_type, final_score, status
  ) VALUES (
    p_user_id, p_competition_type, p_competition_id, p_prize_amount,
    platform_fee, net_payout, p_game_type, p_final_score, 'paid'
  );
  
  -- Credit user's cash balance
  PERFORM public.update_user_balance(
    p_user_id,
    0, -- no token change
    net_payout, -- credit cash
    0, -- no pending change
    'earning',
    'Competition win - ' || p_competition_type || ' #' || p_competition_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automated escrow release (run daily via cron)
CREATE OR REPLACE FUNCTION public.auto_release_escrow()
RETURNS INTEGER AS $$
DECLARE
  release_count INTEGER := 0;
  escrow_record RECORD;
BEGIN
  -- Find escrows ready for auto-release
  FOR escrow_record IN
    SELECT id, seller_id, seller_amount, listing_id
    FROM public.escrow_transactions
    WHERE status = 'held' 
      AND auto_release_at <= NOW()
      AND delivery_confirmed = false
  LOOP
    -- Release escrow
    PERFORM public.release_escrow(escrow_record.id, NULL);
    release_count := release_count + 1;
  END LOOP;
  
  RETURN release_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
