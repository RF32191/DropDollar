-- ============================================================================
-- DROPDOLLAR: FIX ALL ISSUES - COMPREHENSIVE UPDATE
-- ============================================================================
-- This script fixes:
-- 1. Decimal token support (e.g., 1.70 tokens)
-- 2. Per-user score isolation
-- 3. 1v1 match winner determination
-- 4. Non-escrow payment system
-- 5. Stripe bank linking for withdrawals
-- ============================================================================

-- ============================================================================
-- 1. UPDATE TOKENS TO SUPPORT DECIMALS
-- ============================================================================

-- Update users table to use NUMERIC for token balances
ALTER TABLE public.users 
ALTER COLUMN tokens TYPE NUMERIC(10, 2);

ALTER TABLE public.users 
ALTER COLUMN tokens SET DEFAULT 0.00;

ALTER TABLE public.users 
ALTER COLUMN balance TYPE NUMERIC(10, 2);

ALTER TABLE public.users 
ALTER COLUMN balance SET DEFAULT 0.00;

-- Update token_transactions to support decimal amounts
ALTER TABLE public.token_transactions 
ALTER COLUMN amount TYPE NUMERIC(10, 2);

ALTER TABLE public.token_transactions 
ALTER COLUMN balance_before TYPE NUMERIC(10, 2);

ALTER TABLE public.token_transactions 
ALTER COLUMN balance_after TYPE NUMERIC(10, 2);

-- Add new transaction types for winnings and withdrawals
ALTER TABLE public.token_transactions 
DROP CONSTRAINT IF EXISTS token_transactions_type_check;

ALTER TABLE public.token_transactions 
ADD CONSTRAINT token_transactions_type_check 
CHECK (type IN ('purchase', 'game_entry', 'game_win', 'withdrawal', 'refund', 'bonus', 'transfer'));

-- ============================================================================
-- 2. CREATE STRIPE BANK ACCOUNTS TABLE
-- ============================================================================

-- Drop existing tables if they exist (to ensure clean schema)
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.stripe_bank_accounts CASCADE;

CREATE TABLE IF NOT EXISTS public.stripe_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_bank_account_id TEXT,
  account_holder_name TEXT,
  bank_name TEXT,
  last4 TEXT,
  routing_number TEXT,
  account_type TEXT DEFAULT 'checking',
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'usd',
  is_verified BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for bank accounts
CREATE INDEX IF NOT EXISTS idx_stripe_bank_accounts_user_id ON public.stripe_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_bank_accounts_stripe_account_id ON public.stripe_bank_accounts(stripe_account_id);

-- ============================================================================
-- 3. CREATE WITHDRAWAL REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.stripe_bank_accounts(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  tokens_converted NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_payout_id TEXT,
  stripe_transfer_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at ON public.withdrawal_requests(requested_at DESC);

-- ============================================================================
-- 4. FIX 1V1 MATCHES TABLE FOR PROPER WINNER DETERMINATION
-- ============================================================================

-- Ensure matches table has all required columns
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS player1_score INTEGER;

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS player2_score INTEGER;

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.users(id);

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS prize_paid BOOLEAN DEFAULT FALSE;

-- Add indexes for match queries
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON public.matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON public.matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- ============================================================================
-- 5. UPDATE GAME_HISTORY TO TRACK USER-SPECIFIC SCORES
-- ============================================================================

-- Ensure game_history table has proper indexes for user isolation
CREATE INDEX IF NOT EXISTS idx_game_history_user_id_game_type ON public.game_history(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id_score ON public.game_history(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id_created_at ON public.game_history(user_id, created_at DESC);

-- ============================================================================
-- 6. CREATE PRIZE POOL TRACKING TABLE (NON-ESCROW)
-- ============================================================================

-- Drop existing prize_pools table if it exists
DROP TABLE IF EXISTS public.prize_pools CASCADE;

CREATE TABLE IF NOT EXISTS public.prize_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_type TEXT NOT NULL CHECK (competition_type IN ('tournament', 'hot-sell', '1v1', 'listing')),
  competition_id UUID,
  game_type TEXT NOT NULL,
  entry_fee NUMERIC(10, 2) NOT NULL,
  total_entries INTEGER DEFAULT 0,
  total_pool NUMERIC(10, 2) DEFAULT 0.00,
  platform_fee_percent NUMERIC(5, 2) DEFAULT 6.00,
  platform_fee_amount NUMERIC(10, 2) DEFAULT 0.00,
  prize_amount NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'paid')),
  winner_id UUID REFERENCES public.users(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for prize pools
CREATE INDEX IF NOT EXISTS idx_prize_pools_competition_type ON public.prize_pools(competition_type);
CREATE INDEX IF NOT EXISTS idx_prize_pools_status ON public.prize_pools(status);
CREATE INDEX IF NOT EXISTS idx_prize_pools_winner_id ON public.prize_pools(winner_id);

-- ============================================================================
-- 7. CREATE FUNCTION TO DETERMINE 1V1 WINNER AND PAY PRIZE
-- ============================================================================

CREATE OR REPLACE FUNCTION determine_1v1_winner(match_id_param UUID)
RETURNS TABLE(
  winner_id UUID,
  winner_score INTEGER,
  loser_id UUID,
  loser_score INTEGER,
  prize_amount NUMERIC
) AS $$
DECLARE
  match_record RECORD;
  prize_amt NUMERIC(10, 2);
  platform_fee NUMERIC(10, 2);
BEGIN
  -- Get the match
  SELECT * INTO match_record
  FROM public.matches
  WHERE id = match_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Check if both players have submitted scores
  IF match_record.player1_score IS NULL OR match_record.player2_score IS NULL THEN
    RAISE EXCEPTION 'Both players must submit scores';
  END IF;

  -- Calculate prize (entry fee × 2, minus 15% platform fee)
  prize_amt := (match_record.entry_fee * 2) * 0.85;
  platform_fee := (match_record.entry_fee * 2) * 0.15;

  -- Determine winner
  IF match_record.player1_score > match_record.player2_score THEN
    -- Player 1 wins
    UPDATE public.matches
    SET winner_id = match_record.player1_id,
        completed_at = NOW(),
        prize_amount = prize_amt,
        status = 'completed'
    WHERE id = match_id_param;

    -- Credit winner's token balance
    UPDATE public.users
    SET tokens = tokens + prize_amt,
        updated_at = NOW()
    WHERE id = match_record.player1_id;

    -- Record transaction
    INSERT INTO public.token_transactions (
      user_id, amount, type, balance_before, balance_after, description, metadata
    )
    SELECT 
      match_record.player1_id,
      prize_amt,
      'game_win',
      tokens - prize_amt,
      tokens,
      '1v1 Match Win',
      jsonb_build_object('match_id', match_id_param, 'game_type', match_record.game_type)
    FROM public.users
    WHERE id = match_record.player1_id;

    RETURN QUERY
    SELECT 
      match_record.player1_id,
      match_record.player1_score,
      match_record.player2_id,
      match_record.player2_score,
      prize_amt;

  ELSIF match_record.player2_score > match_record.player1_score THEN
    -- Player 2 wins
    UPDATE public.matches
    SET winner_id = match_record.player2_id,
        completed_at = NOW(),
        prize_amount = prize_amt,
        status = 'completed'
    WHERE id = match_id_param;

    -- Credit winner's token balance
    UPDATE public.users
    SET tokens = tokens + prize_amt,
        updated_at = NOW()
    WHERE id = match_record.player2_id;

    -- Record transaction
    INSERT INTO public.token_transactions (
      user_id, amount, type, balance_before, balance_after, description, metadata
    )
    SELECT 
      match_record.player2_id,
      prize_amt,
      'game_win',
      tokens - prize_amt,
      tokens,
      '1v1 Match Win',
      jsonb_build_object('match_id', match_id_param, 'game_type', match_record.game_type)
    FROM public.users
    WHERE id = match_record.player2_id;

    RETURN QUERY
    SELECT 
      match_record.player2_id,
      match_record.player2_score,
      match_record.player1_id,
      match_record.player1_score,
      prize_amt;

  ELSE
    -- Tie - refund both players
    UPDATE public.matches
    SET status = 'tie',
        completed_at = NOW()
    WHERE id = match_id_param;

    -- Refund player 1
    UPDATE public.users
    SET tokens = tokens + match_record.entry_fee
    WHERE id = match_record.player1_id;

    -- Refund player 2
    UPDATE public.users
    SET tokens = tokens + match_record.entry_fee
    WHERE id = match_record.player2_id;

    -- Record refund transactions
    INSERT INTO public.token_transactions (user_id, amount, type, description, metadata)
    VALUES 
      (match_record.player1_id, match_record.entry_fee, 'refund', '1v1 Match Tie - Refund', jsonb_build_object('match_id', match_id_param)),
      (match_record.player2_id, match_record.entry_fee, 'refund', '1v1 Match Tie - Refund', jsonb_build_object('match_id', match_id_param));

    RETURN QUERY
    SELECT 
      NULL::UUID,
      match_record.player1_score,
      NULL::UUID,
      match_record.player2_score,
      0.00::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CREATE FUNCTION TO GET USER-SPECIFIC HIGH SCORES
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_high_scores(user_id_param UUID)
RETURNS TABLE(
  game_type TEXT,
  best_score INTEGER,
  last_score INTEGER,
  total_played INTEGER,
  best_score_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gh.game_type,
    MAX(gh.score) as best_score,
    (SELECT score FROM public.game_history 
     WHERE user_id = user_id_param AND game_type = gh.game_type 
     ORDER BY created_at DESC LIMIT 1) as last_score,
    COUNT(*)::INTEGER as total_played,
    MAX(gh.created_at) as best_score_date
  FROM public.game_history gh
  WHERE gh.user_id = user_id_param
    AND gh.is_practice = true
  GROUP BY gh.game_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. CREATE WITHDRAWAL REQUEST FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION request_token_withdrawal(
  user_id_param UUID,
  amount_param NUMERIC,
  bank_account_id_param UUID
)
RETURNS UUID AS $$
DECLARE
  user_tokens NUMERIC(10, 2);
  withdrawal_id UUID;
BEGIN
  -- Check user token balance
  SELECT tokens INTO user_tokens
  FROM public.users
  WHERE id = user_id_param;

  IF user_tokens < amount_param THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  -- Verify bank account belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM public.stripe_bank_accounts
    WHERE id = bank_account_id_param 
    AND user_id = user_id_param
    AND is_verified = true
  ) THEN
    RAISE EXCEPTION 'Invalid or unverified bank account';
  END IF;

  -- Deduct tokens
  UPDATE public.users
  SET tokens = tokens - amount_param,
      updated_at = NOW()
  WHERE id = user_id_param;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id,
    bank_account_id,
    amount,
    tokens_converted,
    status
  ) VALUES (
    user_id_param,
    bank_account_id_param,
    amount_param,
    amount_param,
    'pending'
  ) RETURNING id INTO withdrawal_id;

  -- Record transaction
  INSERT INTO public.token_transactions (
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    description,
    metadata
  ) VALUES (
    user_id_param,
    -amount_param,
    'withdrawal',
    user_tokens,
    user_tokens - amount_param,
    'Token withdrawal requested',
    jsonb_build_object('withdrawal_id', withdrawal_id)
  );

  RETURN withdrawal_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. ENABLE RLS (Row Level Security) FOR USER ISOLATION
-- ============================================================================

-- Enable RLS on game_history
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own game history
CREATE POLICY user_game_history_select ON public.game_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own game history
CREATE POLICY user_game_history_insert ON public.game_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on token_transactions
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own transactions
CREATE POLICY user_transactions_select ON public.token_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Enable RLS on withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own withdrawals
CREATE POLICY user_withdrawals_select ON public.withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.stripe_bank_accounts TO authenticated;
GRANT ALL ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.prize_pools TO authenticated;

-- ============================================================================
-- DONE!
-- ============================================================================

-- Summary of changes:
-- ✅ Decimal token support (NUMERIC(10, 2))
-- ✅ Stripe bank account linking table
-- ✅ Withdrawal request system
-- ✅ 1v1 winner determination function
-- ✅ Prize pool tracking (non-escrow)
-- ✅ User-specific score isolation with RLS
-- ✅ Transaction types for winnings and withdrawals

