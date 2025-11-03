-- ============================================================================
-- DUAL WALLET SYSTEM MIGRATION
-- ============================================================================
-- Separates purchased tokens (non-refundable) from won tokens (cashable)
-- 
-- RULES:
-- - Purchased tokens: Cannot be cashed out, no refunds
-- - Won tokens: Can be exchanged for real money
-- - Spending order: Purchased tokens used first, then won tokens
-- ============================================================================

-- ============================================================================
-- 1. Add new columns to users table
-- ============================================================================

-- Add purchased_tokens column (non-refundable, non-cashable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'purchased_tokens'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN purchased_tokens DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add won_tokens column (cashable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'won_tokens'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN won_tokens DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 2. Migrate existing token balances
-- ============================================================================

-- Move all existing tokens to 'purchased_tokens' (safest assumption)
-- Users can email support if they want to claim won tokens
UPDATE public.users
SET purchased_tokens = COALESCE(tokens, 0),
    won_tokens = 0,
    tokens = 0  -- Keep old column for backwards compatibility
WHERE purchased_tokens IS NULL OR won_tokens IS NULL;

-- ============================================================================
-- 3. Create helper functions
-- ============================================================================

-- Function to get total token balance
CREATE OR REPLACE FUNCTION get_total_tokens(user_id_param UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)
  INTO total
  FROM public.users
  WHERE id = user_id_param;
  
  RETURN COALESCE(total, 0);
END;
$$;

-- Function to spend tokens (purchased first, then won)
CREATE OR REPLACE FUNCTION spend_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  purchased_spent DECIMAL(10,2),
  won_spent DECIMAL(10,2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_purchased DECIMAL(10,2);
  current_won DECIMAL(10,2);
  total_available DECIMAL(10,2);
  purchased_to_spend DECIMAL(10,2);
  won_to_spend DECIMAL(10,2);
BEGIN
  -- Get current balances
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO current_purchased, current_won
  FROM public.users
  WHERE id = user_id_param;
  
  total_available := current_purchased + current_won;
  
  -- Check if user has enough tokens
  IF total_available < amount THEN
    RETURN QUERY SELECT 
      FALSE,
      0::DECIMAL(10,2),
      0::DECIMAL(10,2),
      'Insufficient tokens'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate spending from each wallet
  IF current_purchased >= amount THEN
    -- All from purchased tokens
    purchased_to_spend := amount;
    won_to_spend := 0;
  ELSE
    -- Use all purchased, rest from won
    purchased_to_spend := current_purchased;
    won_to_spend := amount - current_purchased;
  END IF;
  
  -- Deduct tokens
  UPDATE public.users
  SET 
    purchased_tokens = purchased_tokens - purchased_to_spend,
    won_tokens = won_tokens - won_to_spend
  WHERE id = user_id_param;
  
  RETURN QUERY SELECT 
    TRUE,
    purchased_to_spend,
    won_to_spend,
    'Tokens spent successfully'::TEXT;
END;
$$;

-- Function to add purchased tokens
CREATE OR REPLACE FUNCTION add_purchased_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET purchased_tokens = COALESCE(purchased_tokens, 0) + amount
  WHERE id = user_id_param;
  
  RETURN TRUE;
END;
$$;

-- Function to add won tokens
CREATE OR REPLACE FUNCTION add_won_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET won_tokens = COALESCE(won_tokens, 0) + amount
  WHERE id = user_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 4. Create transaction log for audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('purchase', 'win', 'spend', 'refund', 'bonus')),
  amount DECIMAL(10,2) NOT NULL,
  
  -- Wallet breakdown
  purchased_amount DECIMAL(10,2) DEFAULT 0,
  won_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Balances after transaction
  purchased_balance_after DECIMAL(10,2),
  won_balance_after DECIMAL(10,2),
  
  -- Reference
  reference_id TEXT, -- Payment ID, game ID, etc.
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_token_transactions_user (user_id, created_at DESC),
  INDEX idx_token_transactions_type (type, created_at DESC)
);

-- Enable RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.token_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.token_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Create view for easy querying
-- ============================================================================

CREATE OR REPLACE VIEW public.user_wallet_balances AS
SELECT 
  id as user_id,
  username,
  email,
  COALESCE(purchased_tokens, 0) as purchased_tokens,
  COALESCE(won_tokens, 0) as won_tokens,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total_tokens,
  CASE 
    WHEN COALESCE(won_tokens, 0) > 0 THEN TRUE 
    ELSE FALSE 
  END as can_cashout
FROM public.users;

-- ============================================================================
-- 6. Update existing token operations
-- ============================================================================

-- Update any existing token-related functions to use dual wallet
-- (This depends on your specific implementation)

COMMENT ON COLUMN public.users.purchased_tokens IS 'Tokens purchased with real money - non-refundable, cannot be cashed out';
COMMENT ON COLUMN public.users.won_tokens IS 'Tokens won from games/competitions - can be exchanged for real money';
COMMENT ON COLUMN public.users.tokens IS 'DEPRECATED - Use purchased_tokens and won_tokens instead';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dual wallet system migration completed successfully!';
  RAISE NOTICE 'ℹ️  All existing tokens moved to purchased_tokens';
  RAISE NOTICE 'ℹ️  New columns: purchased_tokens (non-cashable) and won_tokens (cashable)';
  RAISE NOTICE 'ℹ️  Spending order: Purchased tokens first, then won tokens';
  RAISE NOTICE 'ℹ️  Functions created: get_total_tokens, spend_tokens, add_purchased_tokens, add_won_tokens';
END $$;

