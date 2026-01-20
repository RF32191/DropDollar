-- ============================================
-- CREATE user_transactions TABLE
-- ============================================
-- This table links to wallet via user_id
-- Tracks both purchases and winnings/payouts
-- ============================================

-- Step 1: Create user_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction Type
  type TEXT NOT NULL CHECK (type IN ('token_purchase', 'earning', 'withdrawal', 'entry_fee', 'refund', 'game_win', 'purchase', 'bonus')),
  
  -- Amount (in dollars for purchases, tokens for winnings)
  amount DECIMAL(10,2) NOT NULL,
  
  -- Description
  description TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  
  -- Stripe Integration (for purchases)
  stripe_payment_intent_id TEXT,
  
  -- Token Tracking
  tokens_purchased INTEGER DEFAULT 0,
  tokens_won INTEGER DEFAULT 0,
  
  -- Competition/Winning Details
  competition_type TEXT, -- 'tournament', 'hotsell', 'listing', 'match', 'winner_takes_all'
  competition_id TEXT, -- ID of the competition
  game_type TEXT, -- Game type if applicable
  
  -- Related records
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  listing_id UUID,
  tournament_id UUID,
  match_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id 
    ON public.user_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_transactions_type 
    ON public.user_transactions(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_transactions_stripe_payment_intent 
    ON public.user_transactions(stripe_payment_intent_id) 
    WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_transactions_user_created 
    ON public.user_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_transactions_status 
    ON public.user_transactions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_transactions_competition 
    ON public.user_transactions(competition_type, competition_id) 
    WHERE competition_type IS NOT NULL;

-- Step 3: Enable Row Level Security
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "Service role full access" ON public.user_transactions;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own transactions"
    ON public.user_transactions FOR SELECT
    USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can insert their own transactions"
    ON public.user_transactions FOR INSERT
    WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Service role full access"
    ON public.user_transactions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 6: Grant permissions
GRANT SELECT, INSERT ON public.user_transactions TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- user_transactions table is now created and ready for:
-- 1. Purchase tracking (type='token_purchase')
-- 2. Winnings tracking (type='earning' or 'game_win')
-- 3. All wallet transactions linked via user_id
-- ============================================

