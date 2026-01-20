-- ============================================
-- FIX WALLET TRACKING - USE user_transactions TABLE
-- ============================================
-- Replace purchase_history with user_transactions
-- This table links to wallet via user_id
-- Also tracks winnings/payouts in the same place
-- ============================================

-- Step 1: Ensure user_transactions table has all necessary columns
DO $$ 
BEGIN
    -- Add stripe_payment_intent_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_transactions' 
        AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE public.user_transactions 
        ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;

    -- Add tokens_purchased if missing (for purchase tracking)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_transactions' 
        AND column_name = 'tokens_purchased'
    ) THEN
        ALTER TABLE public.user_transactions 
        ADD COLUMN tokens_purchased INTEGER DEFAULT 0;
    END IF;

    -- Add tokens_won if missing (for winnings tracking)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_transactions' 
        AND column_name = 'tokens_won'
    ) THEN
        ALTER TABLE public.user_transactions 
        ADD COLUMN tokens_won INTEGER DEFAULT 0;
    END IF;

    -- Add competition_type if missing (for winnings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_transactions' 
        AND column_name = 'competition_type'
    ) THEN
        ALTER TABLE public.user_transactions 
        ADD COLUMN competition_type TEXT;
    END IF;

    -- Add competition_id if missing (for winnings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_transactions' 
        AND column_name = 'competition_id'
    ) THEN
        ALTER TABLE public.user_transactions 
        ADD COLUMN competition_id TEXT;
    END IF;

    -- Add game_type if missing (for winnings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_transactions' 
        AND column_name = 'game_type'
    ) THEN
        ALTER TABLE public.user_transactions 
        ADD COLUMN game_type TEXT;
    END IF;
END $$;

-- Step 2: Create index on stripe_payment_intent_id for duplicate checking
CREATE INDEX IF NOT EXISTS idx_user_transactions_stripe_payment_intent 
    ON public.user_transactions(stripe_payment_intent_id) 
    WHERE stripe_payment_intent_id IS NOT NULL;

-- Step 3: Create index on user_id and created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_created 
    ON public.user_transactions(user_id, created_at DESC);

-- Step 4: Create index on type for filtering purchases vs winnings
CREATE INDEX IF NOT EXISTS idx_user_transactions_type 
    ON public.user_transactions(type, created_at DESC);

-- Step 5: Ensure RLS policies allow users to insert their own transactions
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.user_transactions;

-- Create correct policies
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
-- user_transactions table is now ready for:
-- 1. Purchase tracking (type='token_purchase')
-- 2. Winnings tracking (type='earning' or 'game_win')
-- 3. All wallet transactions linked via user_id
-- ============================================

